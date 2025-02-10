import { existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";

/**
 * Get the database path.
 *
 * @example
 * 	```typescript
 * 	const dbPath = getDatabasePath();
 * 	console.log(`Database will be stored at: ${dbPath}`);
 * 	```
 *
 * @returns The computed database path.
 */
export function getDatabasePath() {
	const path = join(homedir(), ".local", "share", "network-monitor");

	if (!existsSync(path)) mkdirSync(dirname(path), { recursive: true });

	return join(path, "speedtest.db");
}
