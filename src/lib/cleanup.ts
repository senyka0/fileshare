import { getExpiredFiles, deleteFileById } from "./db";
import { unlinkSync, existsSync } from "fs";

export async function runCleanup(): Promise<void> {
  const now = Date.now();
  const expiredFiles = await getExpiredFiles(now);

  for (const file of expiredFiles) {
    try {
      if (existsSync(file.file_path)) {
        unlinkSync(file.file_path);
      }
      await deleteFileById(file.id);
    } catch (error) {
      console.error(`Failed to delete file ${file.id}:`, error);
    }
  }

  if (expiredFiles.length > 0) {
    console.log(`Cleaned up ${expiredFiles.length} expired file(s)`);
  }
}

let cleanupInterval: NodeJS.Timeout | null = null;

export function startCleanupJob(): void {
  if (cleanupInterval) {
    return;
  }

  runCleanup().catch(console.error);

  cleanupInterval = setInterval(() => {
    runCleanup().catch(console.error);
  }, 10 * 60 * 1000);

  console.log("Cleanup job started (runs every 10 minutes)");
}

export function stopCleanupJob(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
