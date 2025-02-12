import { DatabaseConnection } from "@network-monitor/shared";

import type { SpeedtestMetrics } from "@network-monitor/shared";

/**
 * Singleton SQLite database connection manager that can be shared across the monorepo
 */
export class SpeedtestDatabase extends DatabaseConnection {
	/**
	 * Remove speed test results older than a specified number of days from the database
	 *
	 * @param offset - The number of days to remove results for (default: `30`)
	 *
	 * @example
	 * ```typescript
	 * // Clean up old records
	 * cleanupOldResults();
	 * ```
	 */
	public cleanupOldResults(offset = 30) {
		const daysAgo = new Date();
		daysAgo.setDate(daysAgo.getDate() - offset);

		this.db.run("DELETE FROM speed_results WHERE timestamp < ?", [daysAgo.toISOString()]);
	}

	/**
	 * Retrieve the most recent speed test result from the database
	 *
	 * @example
	 * ```typescript
	 * const lastResult = getLastResult();
	 * if (lastResult) {
	 * 	console.log(`Last test ping: ${lastResult.ping}ms`);
	 * }
	 * ```
	 *
	 * @returns The most recent speed test result or null if no results exist
	 */
	public getLastResult(): SpeedtestMetrics | null {
		return this.db
			.query("SELECT * FROM speed_results ORDER BY timestamp DESC LIMIT 1")
			.get() as SpeedtestMetrics | null;
	}

	/**
	 * Store a speed test result in the database
	 *
	 * @param result The speed test result object to store
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
	 * storeResult(result);
	 * ```
	 */
	public storeResult(result: SpeedtestMetrics) {
		const statement = this.db.prepare(`
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
}
