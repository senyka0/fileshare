import { NextRequest, NextResponse } from "next/server";
import { createWriteStream, mkdirSync, WriteStream } from "fs";
import { join, resolve as resolvePath, normalize } from "path";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { insertFile } from "@/lib/db";
import { Readable } from "stream";
import busboy from "busboy";

export const runtime = "nodejs";
export const maxDuration = 300;

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 255);
}

function isValidUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

const MAX_EXPIRATION_HOURS = process.env.MAX_EXPIRATION_HOURS
  ? parseInt(process.env.MAX_EXPIRATION_HOURS, 10)
  : 168;
const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE
  ? parseInt(process.env.MAX_FILE_SIZE, 10)
  : 10 * 1024 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".txt",
  ".rtf",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".webp",
  ".svg",
  ".zip",
  ".rar",
  ".7z",
  ".tar",
  ".gz",
  ".mp4",
  ".avi",
  ".mov",
  ".wmv",
  ".flv",
  ".mp3",
  ".wav",
  ".ogg",
  ".flac",
  ".xls",
  ".xlsx",
  ".csv",
  ".ppt",
  ".pptx",
  ".odt",
  ".ods",
  ".odp",
];
const getUploadDir = (): string => {
  if (process.env.UPLOAD_DIR) {
    return process.env.UPLOAD_DIR;
  }
  if (process.env.NODE_ENV === "production") {
    return "/uploads";
  }
  return "./uploads";
};

const UPLOAD_DIR = getUploadDir();

if (process.env.NODE_ENV !== "production") {
  console.log(`[Upload] Using upload directory: ${UPLOAD_DIR} (NODE_ENV: ${process.env.NODE_ENV || "undefined"})`);
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const length = 12 + Math.floor(Math.random() * 5);
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function ensureUploadDir(): void {
  try {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      `Failed to create upload directory: ${UPLOAD_DIR}`,
      errorMessage
    );
    throw new Error(`Failed to create upload directory: ${errorMessage}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    ensureUploadDir();

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 }
      );
    }

    const body = request.body;
    if (!body) {
      return NextResponse.json({ error: "No request body" }, { status: 400 });
    }

    return new Promise((resolve) => {
      const bb = busboy({ headers: { "content-type": contentType } });
      let fileStream: WriteStream | null = null;
      let originalFilename = "";
      let fileSize = 0;
      let expirationHours = 24;
      let passwordProtected = false;
      let filePath: string = "";
      let id = "";
      let password: string | null = null;
      let passwordHash: string | null = null;

      bb.on("file", (name, stream, info) => {
        if (name !== "file") {
          stream.resume();
          return;
        }

        if (!info.filename) {
          stream.resume();
          resolve(
            NextResponse.json(
              { error: "No filename provided" },
              { status: 400 }
            )
          );
          return;
        }

        originalFilename = info.filename;
        const lastDot = originalFilename.lastIndexOf(".");
        const extension =
          lastDot >= 0 ? originalFilename.toLowerCase().substring(lastDot) : "";

        if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
          stream.resume();
          resolve(
            NextResponse.json(
              { error: "File type not allowed" },
              { status: 400 }
            )
          );
          return;
        }

        id = uuidv4();
        if (!isValidUUID(id)) {
          stream.resume();
          resolve(
            NextResponse.json(
              { error: "Failed to generate file ID" },
              { status: 500 }
            )
          );
          return;
        }

        try {
          ensureUploadDir();
        } catch (error) {
          stream.resume();
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to create upload directory";
          resolve(NextResponse.json({ error: errorMessage }, { status: 500 }));
          return;
        }

        const normalizedPath = normalize(join(UPLOAD_DIR, id));
        filePath = resolvePath(normalizedPath);
        const uploadDirResolved = resolvePath(UPLOAD_DIR);

        if (!filePath || !filePath.startsWith(uploadDirResolved)) {
          stream.resume();
          resolve(
            NextResponse.json({ error: "Invalid file path" }, { status: 500 })
          );
          return;
        }

        fileStream = createWriteStream(filePath);
        let bytesWritten = 0;

        stream.on("data", (data: Buffer) => {
          bytesWritten += data.length;
          fileSize = bytesWritten;

          if (fileSize > MAX_FILE_SIZE) {
            stream.destroy();
            if (fileStream) {
              fileStream.destroy();
            }
            const maxSizeGB = MAX_FILE_SIZE / 1024 / 1024 / 1024;
            const maxSizeMB = MAX_FILE_SIZE / 1024 / 1024;
            const sizeDisplay =
              maxSizeGB >= 1
                ? `${maxSizeGB.toFixed(2)}GB`
                : `${maxSizeMB.toFixed(2)}MB`;
            resolve(
              NextResponse.json(
                {
                  error: `File size exceeds maximum allowed size of ${sizeDisplay}`,
                },
                { status: 400 }
              )
            );
            return;
          }

          if (fileStream && !fileStream.write(data)) {
            stream.pause();
            fileStream.once("drain", () => {
              stream.resume();
            });
          }
        });

        stream.on("end", () => {
          if (fileStream) {
            fileStream.end();
          }
        });

        stream.on("error", (err) => {
          if (fileStream) {
            fileStream.destroy();
          }
          console.error("Stream error:", err);
          resolve(
            NextResponse.json({ error: "File upload failed" }, { status: 500 })
          );
        });
      });

      bb.on("field", (name, value) => {
        if (name === "expirationHours") {
          const parsed = parseInt(value, 10);
          if (!isNaN(parsed) && parsed >= 1) {
            expirationHours = parsed;
          }
        } else if (name === "passwordProtected") {
          passwordProtected = value === "true";
        }
      });

      bb.on("finish", async () => {
        try {
          if (!fileStream || !filePath) {
            resolve(
              NextResponse.json({ error: "No file provided" }, { status: 400 })
            );
            return;
          }

          const minExpirationHours = 1;
          const maxExpirationHours = MAX_EXPIRATION_HOURS;

          if (
            expirationHours < minExpirationHours ||
            expirationHours > maxExpirationHours
          ) {
            const maxHoursDisplay =
              maxExpirationHours >= 24
                ? `${(maxExpirationHours / 24).toFixed(
                    1
                  )} days (${maxExpirationHours} hours)`
                : `${maxExpirationHours} hours`;
            resolve(
              NextResponse.json(
                {
                  error: `Expiration must be between ${minExpirationHours} hour and ${maxExpirationHours} hours (${maxHoursDisplay})`,
                },
                { status: 400 }
              )
            );
            return;
          }

          if (passwordProtected) {
            password = generatePassword();
            passwordHash = await bcrypt.hash(password, 10);
          }

          const now = Date.now();
          const expiresAt = now + expirationHours * 60 * 60 * 1000;
          const sanitizedFilename = sanitizeFilename(originalFilename);

          await insertFile(
            id,
            sanitizedFilename,
            filePath,
            fileSize,
            expiresAt,
            passwordHash,
            now
          );

          const baseUrl = process.env.BASE_URL || "http://localhost:3000";
          const url = `${baseUrl}/download/${id}`;

          const response: { url: string; password?: string } = { url };
          if (password) {
            response.password = password;
          }

          resolve(NextResponse.json(response));
        } catch (error) {
          console.error("Upload error:", error);
          const errorMessage =
            process.env.NODE_ENV === "production"
              ? "Failed to upload file"
              : error instanceof Error
              ? error.message
              : "Failed to upload file";
          resolve(NextResponse.json({ error: errorMessage }, { status: 500 }));
        }
      });

      bb.on("error", (err) => {
        console.error("Busboy error:", err);
        resolve(
          NextResponse.json(
            { error: "Failed to parse form data" },
            { status: 400 }
          )
        );
      });

      if (body) {
        // @ts-expect-error - ReadableStream type compatibility issue between web and node streams
        const nodeStream = Readable.fromWeb(body);
        nodeStream.pipe(bb);
      } else {
        resolve(
          NextResponse.json({ error: "Invalid request body" }, { status: 400 })
        );
      }
    });
  } catch (error) {
    console.error("Upload error:", error);
    const errorMessage =
      process.env.NODE_ENV === "production"
        ? "Failed to upload file"
        : error instanceof Error
        ? error.message
        : "Failed to upload file";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
