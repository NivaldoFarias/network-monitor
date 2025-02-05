import Bun from "bun";

import { join } from "path";
import { z } from "zod";

const serviceOptionsSchema = z.object({
  VERBOSE: z.boolean().default(false),
  INTERVAL: z.number().positive().default(1_800_000),
  MAX_RETRIES: z.number().positive().default(3),
  BACKOFF_DELAY: z.number().positive().default(5_000),
  MAX_BACKOFF_DELAY: z.number().positive().default(300_000),
  CIRCUIT_BREAKER_THRESHOLD: z.number().positive().default(5),
  CIRCUIT_BREAKER_TIMEOUT: z.number().positive().default(1_800_000),
});

/**
 * Class responsible for setting up the systemd service for network monitoring
 */
export class SystemdServiceSetup {
  private readonly username = import.meta.env[ "USER" ];
  private readonly projectDir = import.meta.dir;
  private readonly serviceFilePath = "/etc/systemd/system/network-monitor.service";
  private readonly logFilePath = "/var/log/network-monitor.log";
  private readonly errorLogFilePath = "/var/log/network-monitor.error.log";
  private readonly options: z.infer<typeof serviceOptionsSchema>;

  constructor() {
    this.options = serviceOptionsSchema.parse(import.meta.env);
  }

  /**
   * Run the complete setup process
   */
  public async setup(force = false) {
    try {
      await this.validateEnvironment();
      await this.generateServiceFile(force);

      this.setupLogFiles();
      this.installService();
      this.enableService();
      this.startService();

      console.log("✅ Service setup completed successfully");
    } catch (error) {
      console.error("❌ Service setup failed:", error);
      throw error;
    }
  }

  /**
   * Validate the environment before proceeding
   */
  private async validateEnvironment() {
    if (!this.username) {
      throw new Error("Could not determine current user");
    }

    if (!Bun.which("bun")) {
      throw new Error("Bun installation not found");
    }
  }

  /**
   * Generate the service file with machine-specific data
   */
  private async generateServiceFile(force = false) {
    if (!force && await Bun.file(this.serviceFilePath).exists()) {
      console.log("⚠️ Service file already exists, skipping generation");
      return;
    }

    // Ensure we're in the project root directory
    const projectRoot = join(this.projectDir, "..");

    // Build the TypeScript file first
    const buildProcess = await Bun.build({
      entrypoints: [ join(projectRoot, "index.ts") ],
      outdir: join(projectRoot, "dist"),
      minify: true,
      target: "bun",
    });

    if (!buildProcess.success) {
      throw new Error(`Failed to build TypeScript file: ${buildProcess.logs}`);
    }

    // Write to a temporary file first since /etc requires sudo
    const tempFile = join(projectRoot, "network-monitor.service.tmp");
    await Bun.write(tempFile, this.computedServiceFile);

    // Move to system directory with sudo
    const process = Bun.spawnSync([ "sudo", "mv", tempFile, this.serviceFilePath ]);

    if (!process.success) {
      throw new Error(`Failed to move service file: ${process.stderr.toString()}`);
    }

    console.log("✅ Service file generated and installed");
  }

  /**
   * Setup log files with appropriate permissions
   */
  private setupLogFiles() {
    const commands = [
      [ "touch", this.logFilePath ],
      [ "touch", this.errorLogFilePath ],
      [ "chown", `${this.username}:${this.username}`, this.logFilePath ],
      [ "chown", `${this.username}:${this.username}`, this.errorLogFilePath ],
      [ "chmod", "644", this.logFilePath ],
      [ "chmod", "644", this.errorLogFilePath ],
    ];

    for (const cmd of commands) {
      const process = Bun.spawnSync([ "sudo", ...cmd ]);
      if (!process.success) {
        throw new Error(`Failed to setup log files: ${process.stderr.toString()}`);
      }
    }

    console.log("✅ Log files setup completed");
  }

  /**
   * Install the systemd service
   */
  private installService() {
    const process = Bun.spawnSync([ "sudo", "systemctl", "daemon-reload" ]);

    if (!process.success) {
      throw new Error(`Failed to reload systemd: ${process.stderr.toString()}`);
    }

    console.log("✅ Service installed");
  }

  /**
   * Enable the service to start on boot
   */
  private enableService() {
    const process = Bun.spawnSync([ "sudo", "systemctl", "enable", "network-monitor" ]);

    if (!process.success) {
      throw new Error(`Failed to enable service: ${process.stderr.toString()}`);
    }

    console.log("✅ Service enabled");
  }

  /**
   * Start the service
   */
  private startService() {
    const process = Bun.spawnSync([ "sudo", "systemctl", "start", "network-monitor" ]);

    if (!process.success) {
      throw new Error(`Failed to start service: ${process.stderr.toString()}`);
    }

    console.log("✅ Service started");
  }

  private get computedServiceFile() {
    const projectRoot = join(this.projectDir, "..");

    return `[Unit]
Description=Network Speed Test Monitor Service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${this.username}
Group=${this.username}
WorkingDirectory=${projectRoot}
Environment=SPEEDTEST_VERBOSE=${this.options.VERBOSE}
Environment=SPEEDTEST_INTERVAL=${this.options.INTERVAL}
Environment=SPEEDTEST_MAX_RETRIES=${this.options.MAX_RETRIES}
Environment=SPEEDTEST_BACKOFF_DELAY=${this.options.BACKOFF_DELAY}
Environment=SPEEDTEST_MAX_BACKOFF_DELAY=${this.options.MAX_BACKOFF_DELAY}
Environment=SPEEDTEST_CIRCUIT_BREAKER_THRESHOLD=${this.options.CIRCUIT_BREAKER_THRESHOLD}
Environment=SPEEDTEST_CIRCUIT_BREAKER_TIMEOUT=${this.options.CIRCUIT_BREAKER_TIMEOUT}
ExecStart=${Bun.which("bun")} ${join(projectRoot, "dist/index.js")}
Restart=always
RestartSec=10
StandardOutput=append:${this.logFilePath}
StandardError=append:${this.errorLogFilePath}

[Install]
WantedBy=multi-user.target`;
  }
}

// Run setup if this file is executed directly
if (import.meta.main) {
  const setup = new SystemdServiceSetup();
  await setup.setup(process.argv.includes("--force"));
}
