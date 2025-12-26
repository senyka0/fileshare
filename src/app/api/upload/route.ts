import { NextRequest, NextResponse } from "next/server";
import { createWriteStream, mkdirSync, WriteStream } from "fs";
import { join, resolve as resolvePath, normalize } from "path";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { insertFile } from "@/lib/db";
import { Readable } from "stream";
import busboy from "busboy";

function webStreamToNodeStream(
  webStream: ReadableStream<Uint8Array>
): NodeJS.ReadableStream {
  return Readable.fromWeb(webStream as Parameters<typeof Readable.fromWeb>[0]);
}

export const runtime = "nodejs";
export const maxDuration = 300;

function sanitizeFilenameForStorage(filename: string): string {
  return filename.substring(0, 255);
}

function decodeFilename(filename: string | Buffer): string {
  if (Buffer.isBuffer(filename)) {
    return filename.toString("utf8");
  }

  if (typeof filename !== "string") {
    return String(filename);
  }

  try {
    if (/[\x80-\xFF]/.test(filename)) {
      const latin1Bytes = Buffer.from(filename, "latin1");
      const utf8Decoded = latin1Bytes.toString("utf8");

      if (utf8Decoded !== filename) {
        const hasCyrillic = /[\u0400-\u04FF]/.test(utf8Decoded);
        const hasValidUnicode = /^[\x20-\x7E\u0080-\uFFFF]*$/.test(utf8Decoded);
        const hasInvalidChars = /[\uFFFD]/.test(utf8Decoded);

        if (hasCyrillic && !hasInvalidChars && hasValidUnicode) {
          return utf8Decoded;
        }

        if (
          !hasInvalidChars &&
          hasValidUnicode &&
          utf8Decoded.length < filename.length * 1.5
        ) {
          return utf8Decoded;
        }
      }
    }

    try {
      const decoded = decodeURIComponent(filename);
      if (decoded !== filename && /[\u0400-\u04FF]/.test(decoded)) {
        return decoded;
      }
    } catch (e) {
      console.error("Error decoding filename:", e);
    }
  } catch (e) {
    console.error("Error decoding filename:", e);
  }

  return filename;
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
  console.log(
    `[Upload] Using upload directory: ${UPLOAD_DIR} (NODE_ENV: ${
      process.env.NODE_ENV || "undefined"
    })`
  );
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

interface FileUpload {
  id: string;
  originalFilename: string;
  filePath: string;
  size: number;
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

    return new Promise<NextResponse>((resolve) => {
      const bb = busboy({ headers: { "content-type": contentType } });
      const uploadedFiles: FileUpload[] = [];
      const fileStreams: Map<string, WriteStream> = new Map();
      const fileSizes: Map<string, number> = new Map();
      const fileBytesWritten: Map<string, number> = new Map();
      const pendingFiles: Set<string> = new Set();

      let expirationHours = 24;
      let passwordProtected = false;
      let password: string | null = null;
      let passwordHash: string | null = null;
      let batchId: string | null = null;
      let hasError = false;
      let errorMessage = "";
      let finishCalled = false;

      bb.on("file", (name, stream, info) => {
        if (name !== "file" && !name.startsWith("file[")) {
          stream.resume();
          return;
        }

        if (!info.filename) {
          stream.resume();
          return;
        }

        if (hasError) {
          stream.resume();
          return;
        }

        const originalFilename = decodeFilename(info.filename);
        const lastDot = originalFilename.lastIndexOf(".");
        const extension =
          lastDot >= 0 ? originalFilename.toLowerCase().substring(lastDot) : "";

        if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
          stream.resume();
          hasError = true;
          errorMessage = "File type not allowed";
          resolve(NextResponse.json({ error: errorMessage }, { status: 400 }));
          return;
        }

        if (!batchId) {
          batchId = uuidv4();
        }

        const id = uuidv4();
        if (!isValidUUID(id) || !isValidUUID(batchId)) {
          stream.resume();
          hasError = true;
          errorMessage = "Failed to generate file ID";
          resolve(NextResponse.json({ error: errorMessage }, { status: 500 }));
          return;
        }

        try {
          ensureUploadDir();
        } catch (error) {
          stream.resume();
          hasError = true;
          const errMsg =
            error instanceof Error
              ? error.message
              : "Failed to create upload directory";
          resolve(NextResponse.json({ error: errMsg }, { status: 500 }));
          return;
        }

        const normalizedPath = normalize(join(UPLOAD_DIR, id));
        const filePath = resolvePath(normalizedPath);
        const uploadDirResolved = resolvePath(UPLOAD_DIR);

        if (!filePath || !filePath.startsWith(uploadDirResolved)) {
          stream.resume();
          hasError = true;
          errorMessage = "Invalid file path";
          resolve(NextResponse.json({ error: errorMessage }, { status: 500 }));
          return;
        }

        const fileStream = createWriteStream(filePath);
        fileStreams.set(id, fileStream);
        fileSizes.set(id, 0);
        fileBytesWritten.set(id, 0);
        pendingFiles.add(id);

        stream.on("data", (data: Buffer) => {
          if (hasError) {
            stream.destroy();
            return;
          }

          const currentBytes = fileBytesWritten.get(id) || 0;
          const newBytes = currentBytes + data.length;
          fileBytesWritten.set(id, newBytes);
          fileSizes.set(id, newBytes);

          if (newBytes > MAX_FILE_SIZE) {
            stream.destroy();
            if (fileStream) {
              fileStream.destroy();
            }
            hasError = true;
            const maxSizeGB = MAX_FILE_SIZE / 1024 / 1024 / 1024;
            const maxSizeMB = MAX_FILE_SIZE / 1024 / 1024;
            const sizeDisplay =
              maxSizeGB >= 1
                ? `${maxSizeGB.toFixed(2)}GB`
                : `${maxSizeMB.toFixed(2)}MB`;
            errorMessage = `File size exceeds maximum allowed size of ${sizeDisplay}`;
            resolve(
              NextResponse.json({ error: errorMessage }, { status: 400 })
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
          if (!hasError) {
            hasError = true;
            errorMessage = "File upload failed";
            resolve(
              NextResponse.json({ error: errorMessage }, { status: 500 })
            );
          }
        });

        fileStream.on("close", () => {
          const size = fileSizes.get(id) || 0;
          uploadedFiles.push({
            id,
            originalFilename,
            filePath,
            size,
          });
          pendingFiles.delete(id);

          if (finishCalled && pendingFiles.size === 0) {
            processUploadedFiles();
          }
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

      const processUploadedFiles = async () => {
        try {
          if (hasError) {
            return;
          }

          if (uploadedFiles.length === 0) {
            resolve(
              NextResponse.json({ error: "No files provided" }, { status: 400 })
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

          for (const file of uploadedFiles) {
            const filename = sanitizeFilenameForStorage(file.originalFilename);
            await insertFile(
              file.id,
              filename,
              file.filePath,
              file.size,
              expiresAt,
              passwordHash,
              now,
              batchId
            );
          }

          const baseUrl = process.env.BASE_URL || "http://localhost:3000";
          const url = `${baseUrl}/download/${batchId}`;

          const response: { url: string; password?: string } = { url };
          if (password) {
            response.password = password;
          }

          resolve(NextResponse.json(response));
        } catch (error) {
          console.error("Upload error:", error);
          const errorMessage =
            process.env.NODE_ENV === "production"
              ? "Failed to upload files"
              : error instanceof Error
              ? error.message
              : "Failed to upload files";
          resolve(NextResponse.json({ error: errorMessage }, { status: 500 }));
        }
      };

      bb.on("finish", async () => {
        finishCalled = true;
        if (pendingFiles.size === 0) {
          await processUploadedFiles();
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
        const nodeStream = webStreamToNodeStream(body);
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
        ? "Failed to upload files"
        : error instanceof Error
        ? error.message
        : "Failed to upload files";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
