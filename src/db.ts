import type { SpeedTestResult } from "./types";

import { Database } from "bun:sqlite";

/**
 * Initialize and return a database connection
 */
export function initializeDatabase(dbPath: string) {
  const db = new Database(dbPath);

  // Enable WAL mode for better concurrency
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA busy_timeout = 5000");

  // Create table if it doesn't exist
  db.run(`
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
      device_name TEXT,
    )
  `);

  return db;
}

/**
 * Store a speed test result in the database
 */
export function storeResult(db: Database, result: SpeedTestResult) {
  const stmt = db.prepare(`
    INSERT INTO speed_results (
      timestamp, ping, download, upload, network_ssid, network_type,
      ip_address, server_id, server_location, isp, latency_jitter,
      packet_loss, connection_quality, device_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
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
 * Get the last test result from the database
 */
export function getLastResult(db: Database) {
  const row = db.query("SELECT * FROM speed_results ORDER BY timestamp DESC LIMIT 1").get() as SpeedTestResult;
  if (!row) return null;

  return {
    timestamp: row.timestamp,
    ping: row.ping,
    download: row.download,
    upload: row.upload,
    networkSsid: row.network_ssid,
    networkType: row.network_type,
    ipAddress: row.ip_address,
    serverId: row.server_id,
    serverLocation: row.server_location,
    isp: row.isp,
    latencyJitter: row.latency_jitter,
    packetLoss: row.packet_loss,
    connectionQuality: row.connection_quality,
    deviceName: row.device_name,
  };
}

/**
 * Clean up old test results (keep last 30 days)
 */
export function cleanupOldResults(db: Database) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  db.run("DELETE FROM speed_results WHERE timestamp < ?", [ thirtyDaysAgo.toISOString() ]);
}

/**
 * Safely close the database connection
 */
export function closeDatabase(db: Database | null) {
  if (db) {
    try {
      db.close();
    } catch (error) {
      console.error("Error closing database:", error);
    }
  }
} 