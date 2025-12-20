import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "fs";
import bcrypt from "bcrypt";
import { getFileById } from "@/lib/db";

function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: "Invalid file ID" }, { status: 400 });
    }

    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return NextResponse.json({ error: "Invalid content type" }, { status: 400 });
    }

    const body = await request.json();
    const password = body.password as string;

    if (!password) {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }

    const file = await getFileById(id);

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const now = Date.now();
    if (file.expires_at < now) {
      return NextResponse.json({ error: "File has expired" }, { status: 404 });
    }

    if (!existsSync(file.file_path)) {
      return NextResponse.json(
        { error: "File not found on disk" },
        { status: 404 }
      );
    }

    if (!file.password_hash) {
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
      return NextResponse.json({
        filename: file.original_filename,
        size: fileSizeMB,
        isProtected: false,
      });
    }

    const isValid = await bcrypt.compare(password, file.password_hash);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 403 });
    }

    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);

    return NextResponse.json({
      filename: file.original_filename,
      size: fileSizeMB,
      isProtected: true,
    });
  } catch (error) {
    console.error("Password verification error:", error);
    const errorMessage = process.env.NODE_ENV === 'production' 
      ? "Failed to verify password" 
      : error instanceof Error ? error.message : "Failed to verify password";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
