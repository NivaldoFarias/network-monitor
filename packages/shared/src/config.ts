import { existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { homedir } from "os";


/**
 * Get the database path.
 * 
 * @returns The computed database path.
 * 
 * @example
 * ```typescript
 * const dbPath = getDatabasePath();
 * console.log(`Database will be stored at: ${dbPath}`);
 * ```
 */
export function getDatabasePath() {
  const path = join(homedir(), ".local", "share", "network-monitor");

  if (!existsSync(path)) mkdirSync(dirname(path), { recursive: true });

  return join(path, "speedtest.db");
}

