import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdirSync } from "fs";
import { join, resolve, normalize } from "path";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { insertFile } from "@/lib/db";

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255);
}

function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

const writeFileAsync = promisify(writeFile);

const MAX_EXPIRATION_HOURS = process.env.MAX_EXPIRATION_HOURS 
  ? parseInt(process.env.MAX_EXPIRATION_HOURS, 10) 
  : 168;
const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE 
  ? parseInt(process.env.MAX_FILE_SIZE, 10) 
  : 1024 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [
  ".pdf", ".doc", ".docx", ".txt", ".rtf",
  ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg",
  ".zip", ".rar", ".7z", ".tar", ".gz",
  ".mp4", ".avi", ".mov", ".wmv", ".flv",
  ".mp3", ".wav", ".ogg", ".flac",
  ".xls", ".xlsx", ".csv",
  ".ppt", ".pptx",
  ".odt", ".ods", ".odp"
];
const UPLOAD_DIR = process.env.UPLOAD_DIR || "/uploads";

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
  } catch {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "Could not create upload directory during build, will retry at runtime"
      );
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    ensureUploadDir();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      const maxSizeGB = MAX_FILE_SIZE / 1024 / 1024 / 1024;
      const maxSizeMB = MAX_FILE_SIZE / 1024 / 1024;
      const sizeDisplay = maxSizeGB >= 1 
        ? `${maxSizeGB.toFixed(2)}GB` 
        : `${maxSizeMB.toFixed(2)}MB`;
      return NextResponse.json(
        { error: `File size exceeds maximum allowed size of ${sizeDisplay}` },
        { status: 400 }
      );
    }

    const originalFilename = file.name;
    const lastDot = originalFilename.lastIndexOf(".");
    const extension =
      lastDot >= 0 ? originalFilename.toLowerCase().substring(lastDot) : "";

    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        { error: "File type not allowed" },
        { status: 400 }
      );
    }

    const expirationHoursRaw = formData.get("expirationHours") as string;
    const expirationHours = expirationHoursRaw 
      ? parseInt(expirationHoursRaw, 10) 
      : 24;
    
    if (isNaN(expirationHours) || expirationHours < 1) {
      return NextResponse.json({ error: "Invalid expiration hours" }, { status: 400 });
    }
    const passwordProtected = formData.get("passwordProtected") === "true";

    const minExpirationHours = 1;
    const maxExpirationHours = MAX_EXPIRATION_HOURS;

    if (
      expirationHours < minExpirationHours ||
      expirationHours > maxExpirationHours
    ) {
      const maxHoursDisplay = maxExpirationHours >= 24 
        ? `${(maxExpirationHours / 24).toFixed(1)} days (${maxExpirationHours} hours)`
        : `${maxExpirationHours} hours`;
      return NextResponse.json(
        {
          error: `Expiration must be between ${minExpirationHours} hour and ${maxExpirationHours} hours (${maxHoursDisplay})`,
        },
        { status: 400 }
      );
    }

    let password: string | null = null;
    let passwordHash: string | null = null;

    if (passwordProtected) {
      password = generatePassword();
      passwordHash = await bcrypt.hash(password, 10);
    }

    const id = uuidv4();
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: "Failed to generate file ID" }, { status: 500 });
    }

    const normalizedPath = normalize(join(UPLOAD_DIR, id));
    const filePath = resolve(normalizedPath);
    const uploadDirResolved = resolve(UPLOAD_DIR);
    
    if (!filePath.startsWith(uploadDirResolved)) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 500 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFileAsync(filePath, buffer);

    const now = Date.now();
    const expiresAt = now + expirationHours * 60 * 60 * 1000;

    const sanitizedFilename = sanitizeFilename(originalFilename);
    
    await insertFile(
      id,
      sanitizedFilename,
      filePath,
      file.size,
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

    return NextResponse.json(response);
  } catch (error) {
    console.error("Upload error:", error);
    const errorMessage = process.env.NODE_ENV === 'production' 
      ? "Failed to upload file" 
      : error instanceof Error ? error.message : "Failed to upload file";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
