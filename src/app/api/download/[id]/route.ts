import { NextRequest, NextResponse } from "next/server";
import { createReadStream, existsSync, statSync } from "fs";
import bcrypt from "bcrypt";
import { getFileById, getFilesByBatchId } from "@/lib/db";

function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

function encodeFilenameForHeader(filename: string): string {
  const asciiOnly = /^[\x20-\x7E]*$/;
  
  if (asciiOnly.test(filename)) {
    return `filename="${filename.replace(/"/g, '\\"')}"`;
  }
  
  const encoded = encodeURIComponent(filename)
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
  
  const asciiFallback = filename
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/"/g, '\\"')
    .substring(0, 255);
  
  return `filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

async function verifyPassword(
  request: NextRequest,
  passwordHash: string | null,
  method: string
): Promise<boolean> {
  if (!passwordHash) {
    return true;
  }

  try {
    if (method === "POST") {
      const contentType = request.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        return false;
      }
      const body = await request.json();
      const password = body.password as string;
      if (!password) {
        return false;
      }
      return await bcrypt.compare(password, passwordHash);
    }

    return false;
  } catch {
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const fileId = request.nextUrl.searchParams.get("fileId");
    
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: "Invalid file ID" }, { status: 400 });
    }

    let file;
    if (fileId && isValidUUID(fileId)) {
      file = await getFileById(fileId);
      if (!file || file.batch_id !== id) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
    } else {
      const batchFiles = await getFilesByBatchId(id);
      if (batchFiles.length > 0) {
        file = batchFiles[0];
      } else {
        file = await getFileById(id);
      }
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

    if (file.password_hash) {
      return NextResponse.json(
        { error: "Password required. Please use POST method." },
        { status: 403 }
      );
    }

    const stats = statSync(file.file_path);
    const stream = createReadStream(file.file_path);

    const filenameHeader = encodeFilenameForHeader(file.original_filename);
    const headers = new Headers();
    headers.set("Content-Disposition", `attachment; ${filenameHeader}`);
    headers.set("Content-Type", "application/octet-stream");
    headers.set("Content-Length", stats.size.toString());

    return new Response(stream as unknown as ReadableStream, {
      headers: Object.fromEntries(headers.entries()),
    });
  } catch (error) {
    console.error("Download error:", error);
    const errorMessage = process.env.NODE_ENV === 'production' 
      ? "Failed to download file" 
      : error instanceof Error ? error.message : "Failed to download file";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const fileId = request.nextUrl.searchParams.get("fileId");
    
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: "Invalid file ID" }, { status: 400 });
    }

    let file;
    if (fileId && isValidUUID(fileId)) {
      file = await getFileById(fileId);
      if (!file || file.batch_id !== id) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
    } else {
      const batchFiles = await getFilesByBatchId(id);
      if (batchFiles.length > 0) {
        file = batchFiles[0];
      } else {
        file = await getFileById(id);
      }
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

    if (file.password_hash) {
      const isValid = await verifyPassword(request, file.password_hash, "POST");
      if (!isValid) {
        return NextResponse.json(
          { error: "Password required or invalid" },
          { status: 403 }
        );
      }
    }

    const stats = statSync(file.file_path);
    const stream = createReadStream(file.file_path);

    const filenameHeader = encodeFilenameForHeader(file.original_filename);
    const headers = new Headers();
    headers.set("Content-Disposition", `attachment; ${filenameHeader}`);
    headers.set("Content-Type", "application/octet-stream");
    headers.set("Content-Length", stats.size.toString());

    return new Response(stream as unknown as ReadableStream, {
      headers: Object.fromEntries(headers.entries()),
    });
  } catch (error) {
    console.error("Download error:", error);
    const errorMessage = process.env.NODE_ENV === 'production' 
      ? "Failed to download file" 
      : error instanceof Error ? error.message : "Failed to download file";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
