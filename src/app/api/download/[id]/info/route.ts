import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "fs";
import { getFileById, getFilesByBatchId } from "@/lib/db";

function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: "Invalid file ID" }, { status: 400 });
    }

    const file = await getFileById(id);
    const files = await getFilesByBatchId(id);

    if (files.length > 0) {
      const now = Date.now();
      const firstFile = files[0];
      
      if (firstFile.expires_at < now) {
        return NextResponse.json({ error: "Files have expired" }, { status: 404 });
      }

      const filesInfo = files.map((f) => {
        const fileSizeMB = (f.size / 1024 / 1024).toFixed(2);
        return {
          id: f.id,
          filename: f.original_filename,
          size: fileSizeMB,
        };
      });

      const totalSizeMB = files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024;

      return NextResponse.json({
        files: filesInfo,
        totalSize: totalSizeMB.toFixed(2),
        isProtected: firstFile.password_hash !== null,
        isBatch: true,
      });
    }

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

    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);

    return NextResponse.json({
      files: [{
        id: file.id,
        filename: file.original_filename,
        size: fileSizeMB,
      }],
      totalSize: fileSizeMB,
      isProtected: file.password_hash !== null,
      isBatch: false,
    });
  } catch (error) {
    console.error("File info error:", error);
    const errorMessage = process.env.NODE_ENV === 'production' 
      ? "Failed to get file information" 
      : error instanceof Error ? error.message : "Failed to get file information";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
