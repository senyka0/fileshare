import { startCleanupJob } from "./cleanup";

let initialized = false;

export function initializeApp(): void {
  if (initialized) {
    return;
  }

  if (typeof window === "undefined" && process.env.NODE_ENV === "production") {
    try {
      startCleanupJob();
      initialized = true;
    } catch {
      console.warn(
        "Could not start cleanup job during build, will retry at runtime"
      );
    }
  }
}
