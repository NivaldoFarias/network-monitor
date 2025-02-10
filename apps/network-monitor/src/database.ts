import { getDatabasePath } from "@network-monitor/shared";
import { Database } from "bun:sqlite";

import type { SpeedtestMetrics } from "@network-monitor/shared";

/**
 * Initialize and return a SQLite database connection with WAL mode enabled.
 *
 * @example
 * ```typescript
 * const database = initializeDatabase("./speedtest.db");
 * ```
 *
 * @param path The path to the SQLite database file.
 * @returns A configured SQLite database connection with the speed_results table created.
 */
export function initializeDatabase() {
	const database = new Database(getDatabasePath());

	// Enable WAL mode for better concurrency
	database.run("PRAGMA journal_mode = WAL");
	database.run("PRAGMA busy_timeout = 5000");

	// Create table if it doesn't exist
	database.run(`
    CREATE TABLE IF NOT EXISTS speed_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT,
      ping REAL,
      download REAL,
      upload REAL,
      network_ssid TEXT,
      network_type TEXT,
      ip_address TEXT,
      server_id TEXT,
      server_location TEXT,
      isp TEXT,
      latency_jitter REAL,
      packet_loss REAL,
      connection_quality TEXT,
      device_name TEXT
    )
  `);

	return database;
}

/**
 * Store a speed test result in the database
 *
 * @example
 * ```typescript
 * const result = {
 *   timestamp: new Date().toISOString(),
 *   ping: 15.4,
 *   download: 100.5,
 *   // ... other fields
 * };
 *
 * storeResult(database, result);
 * ```
 *
 * @param database The active SQLite database connection
 * @param result The speed test result object to store
 */
export function storeResult(database: Database, result: SpeedtestMetrics) {
	const statement = database.prepare(`
    INSERT INTO speed_results (
      timestamp, ping, download, upload, network_ssid, network_type,
      ip_address, server_id, server_location, isp, latency_jitter,
      packet_loss, connection_quality, device_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

	statement.run(
		result.timestamp,
		result.ping,
		result.download,
		result.upload,
		result.network_ssid,
		result.network_type,
		result.ip_address,
		result.server_id,
		result.server_location,
		result.isp,
		result.latency_jitter,
		result.packet_loss,
		result.connection_quality,
		result.device_name,
	);
}

/**
 * Retrieve the most recent speed test result from the database
 *
 * @example
 * ```typescript
 * const lastResult = getLastResult(database);
 * if (lastResult) {
 * console.log(`Last test ping: ${lastResult.ping}ms`);
 * }
 * ```
 *
 * @param database The active SQLite database connection
 * @returns The most recent speed test result or null if no results exist
 */
export function getLastResult(database: Database): SpeedtestMetrics | null {
	return database
		.query("SELECT * FROM speed_results ORDER BY timestamp DESC LIMIT 1")
		.get() as SpeedtestMetrics | null;
}

/**
 * Remove speed test results older than 30 days from the database
 *
 * @example
 * ```typescript
 * // Clean up old records
 * cleanupOldResults(database);
 * ```
 *
 * @param database The active SQLite database connection
 */
export function cleanupOldResults(database: Database) {
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	database.run("DELETE FROM speed_results WHERE timestamp < ?", [thirtyDaysAgo.toISOString()]);
}

/**
 * Safely close the database connection and handle any errors
 *
 * @example
 * ```typescript
 * closeDatabase(database);
 * database = null;
 * ```
 *
 * @param database The database connection to close, can be null
 * @throws {Error} If closing the connection fails (error will be logged)
 */
export function closeDatabase(database: Database | null) {
	if (!database) return;

	try {
		database.close();
	} catch (error) {
		console.error("Error closing database:", error);
	}
}
