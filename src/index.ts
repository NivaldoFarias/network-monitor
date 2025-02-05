import Bun from "bun";

import { Database } from "bun:sqlite";

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
      upload REAL
    )
  `);

  return db;
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
    const ping = data.ping?.latency ?? null;
    const downloadMbps = data.download?.bandwidth
      ? (data.download.bandwidth * 8) / 1e6
      : null;
    const uploadMbps = data.upload?.bandwidth
      ? (data.upload.bandwidth * 8) / 1e6
      : null;

    if (ping === null || downloadMbps === null || uploadMbps === null) {
      throw new Error("Failed to extract speedtest data");
    }

    // Store results in database
    db.run(
      "INSERT INTO speed_results (timestamp, ping, download, upload) VALUES (?, ?, ?, ?)",
      [ timestamp, ping, downloadMbps, uploadMbps ]
    );

    if (config.verbose) {
      console.log(
        `[${timestamp}] Test completed: Ping ${ping} ms, Download ${downloadMbps.toFixed(
          2
        )} Mbps, Upload ${uploadMbps.toFixed(2)} Mbps`
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
