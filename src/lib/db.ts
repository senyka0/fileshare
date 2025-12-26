import { Pool } from "pg";

let pool: Pool | null = null;
let schemaInitialized: Promise<void> | null = null;

function initDb(): Pool {
  if (pool) {
    return pool;
  }

  const requiredEnvVars = {
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  };

  if (
    !requiredEnvVars.host ||
    !requiredEnvVars.database ||
    !requiredEnvVars.user ||
    !requiredEnvVars.password
  ) {
    throw new Error(
      "Missing required database environment variables: POSTGRES_HOST, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD"
    );
  }

  pool = new Pool({
    host: requiredEnvVars.host,
    port: parseInt(requiredEnvVars.port || "5432"),
    database: requiredEnvVars.database,
    user: requiredEnvVars.user,
    password: requiredEnvVars.password,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on("connect", async (client) => {
    await client.query("SET client_encoding TO UTF8");
  });

  pool.on("error", (err) => {
    console.error("Unexpected error on idle client", err);
  });

  return pool;
}

async function initSchema(): Promise<void> {
  if (schemaInitialized) {
    return schemaInitialized;
  }

  schemaInitialized = (async () => {
    const database = initDb();
    const client = await database.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS files (
          id TEXT PRIMARY KEY,
          batch_id TEXT,
          original_filename TEXT NOT NULL,
          file_path TEXT NOT NULL,
          size BIGINT NOT NULL,
          expires_at BIGINT NOT NULL,
          password_hash TEXT,
          created_at BIGINT NOT NULL
        )
      `);

      const result = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_name = 'files'
      `);

      const columnNames = result.rows.map((row) => row.column_name);
      const columnTypes = new Map(
        result.rows.map((row) => [row.column_name, row.data_type])
      );

      if (!columnNames.includes("size")) {
        await client.query(
          `ALTER TABLE files ADD COLUMN size BIGINT NOT NULL DEFAULT 0`
        );
      } else if (columnTypes.get("size") === "integer") {
        await client.query(`ALTER TABLE files ALTER COLUMN size TYPE BIGINT`);
      }

      if (!columnNames.includes("password_hash")) {
        await client.query(`ALTER TABLE files ADD COLUMN password_hash TEXT`);
      }

      if (!columnNames.includes("batch_id")) {
        await client.query(`ALTER TABLE files ADD COLUMN batch_id TEXT`);
        await client.query(
          `CREATE INDEX IF NOT EXISTS idx_files_batch_id ON files(batch_id)`
        );
      }
    } finally {
      client.release();
    }
  })();

  return schemaInitialized;
}

export interface FileRecord {
  id: string;
  batch_id: string | null;
  original_filename: string;
  file_path: string;
  size: number;
  expires_at: number;
  password_hash: string | null;
  created_at: number;
}

export async function insertFile(
  id: string,
  originalFilename: string,
  filePath: string,
  size: number,
  expiresAt: number,
  passwordHash: string | null,
  createdAt: number,
  batchId: string | null = null
): Promise<void> {
  await initSchema();
  const database = initDb();
  await database.query(
    `INSERT INTO files (id, batch_id, original_filename, file_path, size, expires_at, password_hash, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      batchId,
      originalFilename,
      filePath,
      size,
      expiresAt,
      passwordHash,
      createdAt,
    ]
  );
}

export async function getFileById(id: string): Promise<FileRecord | undefined> {
  await initSchema();
  const database = initDb();
  const result = await database.query(`SELECT * FROM files WHERE id = $1`, [
    id,
  ]);
  return result.rows[0] as FileRecord | undefined;
}

export async function deleteFileById(id: string): Promise<void> {
  await initSchema();
  const database = initDb();
  await database.query(`DELETE FROM files WHERE id = $1`, [id]);
}

export async function getExpiredFiles(now: number): Promise<FileRecord[]> {
  await initSchema();
  const database = initDb();
  const result = await database.query(
    `SELECT * FROM files WHERE expires_at < $1`,
    [now]
  );
  return result.rows as FileRecord[];
}

export async function getFilesByBatchId(
  batchId: string
): Promise<FileRecord[]> {
  await initSchema();
  const database = initDb();
  const result = await database.query(
    `SELECT * FROM files WHERE batch_id = $1 ORDER BY created_at ASC`,
    [batchId]
  );
  return result.rows as FileRecord[];
}

export default initDb;
