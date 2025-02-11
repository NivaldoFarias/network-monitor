/**
 * Defines the SQL statements for creating the database schema
 */
export const schema = {
	speed_results: `
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
  `,

	service_logs: `
    CREATE TABLE IF NOT EXISTS service_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_name TEXT NOT NULL,
      action TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
};
