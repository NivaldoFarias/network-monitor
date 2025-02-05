import Bun from "bun";
import { Database } from "bun:sqlite";

import { networkInterfaces, hostname } from "node:os";

/**
 * Configuration interface for the speed test monitor
 */
interface SpeedTestConfig {
  /** Database file path relative to the current directory */
  readonly dbPath: string;
  /** Whether to output verbose logs */
  readonly verbose: boolean;
}

/**
 * Interface representing the complete speed test results
 */
interface SpeedTestResult {
  timestamp: string;
  ping: number;
  download: number;
  upload: number;
  networkSsid: string | null;
  networkType: string;
  ipAddress: string;
  serverId: string;
  serverLocation: string;
  isp: string;
  latencyJitter: number;
  packetLoss: number;
  connectionQuality: string;
  deviceName: string;
  testServerDistance: number;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: SpeedTestConfig = {
  dbPath: "speedtest.db",
  verbose: false,
};

/**
 * Creates and initializes the SQLite database
 * @param config The configuration object
 * @returns The initialized database instance
 */
function initializeDatabase(config: SpeedTestConfig): Database {
  const db = new Database(config.dbPath);

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
      test_server_distance REAL
    )
  `);

  return db;
}

/**
 * Determines the network type based on available interfaces
 * @returns The detected network type ('wifi', 'ethernet', 'cellular', or 'unknown')
 */
function detectNetworkType(): string {
  const interfaces = networkInterfaces();

  for (const [ name, addrs ] of Object.entries(interfaces)) {
    if (!addrs) continue;

    if (name.toLowerCase().includes('wlan') || name.toLowerCase().includes('wifi')) {
      return 'wifi';
    }
    if (name.toLowerCase().includes('eth') || name.toLowerCase().includes('enp')) {
      return 'ethernet';
    }
    if (name.toLowerCase().includes('wwan') || name.toLowerCase().includes('cellular')) {
      return 'cellular';
    }
  }

  return 'unknown';
}

/**
 * Determines connection quality based on metrics
 * @param ping Ping latency in ms
 * @param jitter Jitter in ms
 * @param packetLoss Packet loss percentage
 * @returns Quality rating ('excellent', 'good', 'fair', or 'poor')
 */
function determineConnectionQuality(ping: number, jitter: number, packetLoss: number): string {
  if (ping < 20 && jitter < 5 && packetLoss < 0.1) return 'excellent';
  if (ping < 50 && jitter < 15 && packetLoss < 1) return 'good';
  if (ping < 100 && jitter < 30 && packetLoss < 2.5) return 'fair';
  return 'poor';
}

/**
 * Executes a single speed test and stores the results
 * @param db The database instance to store results
 * @param config The configuration object
 */
async function runSpeedTest(db: Database, config: SpeedTestConfig) {
  const timestamp = new Date().toISOString();

  try {
    // Execute speedtest command with JSON output
    const proc = Bun.spawn({
      cmd: [ "speedtest-ookla", "--format=json" ],
      stdout: "pipe",
      stderr: "pipe",
    });

    // Wait for the process to complete and get the output
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      throw new Error(`Speedtest failed with exit code ${exitCode}: ${stderr}`);
    }

    // Read complete output
    const output = await new Response(proc.stdout).text();
    if (!output) {
      throw new Error("No output received from speedtest command");
    }

    const data = JSON.parse(output);

    // Extract data from JSON response
    const result: SpeedTestResult = {
      timestamp,
      ping: data.ping?.latency ?? 0,
      download: data.download?.bandwidth ? (data.download.bandwidth * 8) / 1e6 : 0,
      upload: data.upload?.bandwidth ? (data.upload.bandwidth * 8) / 1e6 : 0,
      networkSsid: data.interface?.ssid ?? null,
      networkType: detectNetworkType(),
      ipAddress: data.interface?.externalIp ?? "unknown",
      serverId: data.server?.id?.toString() ?? "unknown",
      serverLocation: `${data.server?.name ?? "unknown"}, ${data.server?.country ?? "unknown"}`,
      isp: data.isp ?? "unknown",
      latencyJitter: data.ping?.jitter ?? 0,
      packetLoss: data.packetLoss ?? 0,
      connectionQuality: determineConnectionQuality(
        data.ping?.latency ?? 0,
        data.ping?.jitter ?? 0,
        data.packetLoss ?? 0
      ),
      deviceName: hostname(),
      testServerDistance: data.server?.distance ?? 0
    };

    // Store results in database
    db.run(
      `INSERT INTO speed_results (
        timestamp, ping, download, upload, network_ssid, network_type,
        ip_address, server_id, server_location, isp, latency_jitter,
        packet_loss, connection_quality, device_name, test_server_distance
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        result.timestamp,
        result.ping,
        result.download,
        result.upload,
        result.networkSsid,
        result.networkType,
        result.ipAddress,
        result.serverId,
        result.serverLocation,
        result.isp,
        result.latencyJitter,
        result.packetLoss,
        result.connectionQuality,
        result.deviceName,
        result.testServerDistance
      ]
    );

    if (config.verbose) {
      console.log(
        `[${timestamp}] Test completed:\n` +
        `  Network: ${result.networkType} (${result.networkSsid || 'N/A'})\n` +
        `  ISP: ${result.isp} (${result.ipAddress})\n` +
        `  Server: ${result.serverLocation} (${result.serverId})\n` +
        `  Metrics:\n` +
        `    - Ping: ${result.ping.toFixed(2)} ms\n` +
        `    - Download: ${result.download.toFixed(2)} Mbps\n` +
        `    - Upload: ${result.upload.toFixed(2)} Mbps\n` +
        `    - Jitter: ${result.latencyJitter.toFixed(2)} ms\n` +
        `    - Packet Loss: ${result.packetLoss.toFixed(2)}%\n` +
        `    - Quality: ${result.connectionQuality}\n` +
        `    - Server Distance: ${result.testServerDistance.toFixed(2)} km`
      );
    }
  } catch (error) {
    console.error(`[${timestamp}] Error executing speedtest:`, error);
    process.exit(1);
  }
}

/**
 * Main function that runs the speed test once
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const verbose = args.includes("--verbose") || args.includes("-v");

  const config: SpeedTestConfig = {
    ...DEFAULT_CONFIG,
    verbose,
  };

  // Initialize database
  const db = initializeDatabase(config);

  try {
    // Run a single test
    await runSpeedTest(db, config);
  } finally {
    // Always close the database connection
    db.close();
  }
}

// Run the main function
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
