import { join } from "path";
import process from "process";

import { SYSTEMD } from "@network-monitor/shared";
import Bun from "bun";

import type { SystemdSetupOptions } from "@network-monitor/shared";

import { loadConfig } from "../config";

/**
 * Service class responsible for managing systemd service installation and configuration
 * for the network monitoring application.
 *
 * Handles service file generation, installation, and management of the systemd unit.
 *
 * @example
 * ```typescript
 * const systemd = new SystemdService();
 * await systemd.setup();
 * ```
 */
export class SystemdService {
	private readonly username = process.env["USER"] ?? "";
	private readonly options = loadConfig();
	private readonly SPEEDTEST_DOWNLOAD_URL =
		"https://install.speedtest.net/app/cli/ookla-speedtest-1.2.0-linux-x86_64.tgz";

	/**
	 * Run the complete systemd service setup process.
	 *
	 * @param force Whether to force regeneration of service files even if they exist.
	 * @throws {Error} If any step of the setup process fails.
	 *
	 * @example
	 * ```typescript
	 * const systemd = new SystemdService();
	 * await systemd.setup(true); // Force regeneration
	 * ```
	 */
	public async setup(options: SystemdSetupOptions = { force: false }) {
		try {
			this.validateEnvironment();

			await this.generateServiceFile(options.force);

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
	 * Configure permissions for the network-monitor service
	 *
	 * Creates a sudoers entry for the network-monitor service
	 * and ensures the sudoers file is valid
	 *
	 * @throws {Error} If permissions setup fails
	 *
	 * @example
	 * ```bash
	 * sudo bun run scripts/systemd-permissions.ts
	 * ```
	 */
	public async setupPermissions() {
		const currentUser = (await Bun.$`whoami`.text()).trim();

		// Create the sudoers entry
		const sudoersContent = [
			"# Permissions for network-monitor service management",
			`${currentUser} ALL=NOPASSWD: /bin/systemctl status ${SYSTEMD.SERVICE_NAME}`,
			`${currentUser} ALL=NOPASSWD: /bin/systemctl start ${SYSTEMD.SERVICE_NAME}`,
			`${currentUser} ALL=NOPASSWD: /bin/systemctl stop ${SYSTEMD.SERVICE_NAME}`,
			`${currentUser} ALL=NOPASSWD: /bin/systemctl restart ${SYSTEMD.SERVICE_NAME}`,
			`${currentUser} ALL=NOPASSWD: /bin/systemctl list-units ${SYSTEMD.SERVICE_NAME}`,
			`${currentUser} ALL=NOPASSWD: /bin/systemctl show ${SYSTEMD.SERVICE_NAME}`,
		].join("\n");

		try {
			// Check if running as root
			if (process.getuid?.() !== 0) {
				throw new Error("This script must be run with sudo privileges");
			}

			// Write the sudoers file
			await Bun.write(SYSTEMD.SUDOERS_FILE, sudoersContent, {
				mode: SYSTEMD.SUDOERS_FILE_MODE,
			});
			console.log(`✅ Successfully created sudoers file at ${SYSTEMD.SUDOERS_FILE}`);

			// Verify the syntax of the new sudoers file
			const { exitCode } = await Bun.$`visudo -c -f ${SYSTEMD.SUDOERS_FILE}`;

			if (exitCode !== 0) {
				// If validation fails, remove the file and exit
				await Bun.$`rm ${SYSTEMD.SUDOERS_FILE}`;
				throw new Error("Invalid sudoers file syntax");
			}

			console.log(`✅ Permissions configured successfully for user ${currentUser}`);
			console.log(`✅ Service: ${SYSTEMD.SERVICE_NAME}`);
		} catch (error) {
			console.error("❌ Failed to configure permissions:", error);
			process.exit(1);
		}
	}

	/**
	 * Validate the runtime environment for systemd service setup
	 *
	 * Checks operating system, user permissions, and required dependencies
	 *
	 * @throws {Error} If environment validation fails
	 *
	 * @example
	 * ```typescript
	 * systemd.validateEnvironment();
	 * ```
	 */
	private validateEnvironment() {
		/**
		 * Validates if the current runtime environment is Linux
		 * Throws an error if the platform is not Linux since systemd services
		 * are only available on Linux systems
		 */
		if (process.platform !== "linux") {
			throw new Error("This service can only run on Linux systems");
		}

		if (!this.username) {
			throw new Error("Could not determine current user");
		}

		this.checkSpeedtest();
	}

	/**
	 * Verify and install speedtest CLI if not present
	 *
	 * Downloads, extracts, and installs the Ookla speedtest CLI tool
	 *
	 * @throws {Error} If installation fails at any step
	 *
	 * @example
	 * ```typescript
	 * systemd.checkSpeedtest();
	 * ```
	 */
	private checkSpeedtest() {
		if (Bun.which("speedtest")) return;

		console.log("⚠️ speedtest not found, installing...");

		const downloadTarFile = Bun.spawnSync([
			"curl",
			"-s",
			this.SPEEDTEST_DOWNLOAD_URL,
			"-o",
			"speedtest.tgz",
		]);

		if (!downloadTarFile.success) {
			throw new Error(`Failed to download speedtest: ${downloadTarFile.stderr.toString()}`);
		}

		const extractTarFile = Bun.spawnSync(["tar", "-xzf", "speedtest.tgz"]);

		if (!extractTarFile.success) {
			throw new Error(`Failed to extract speedtest: ${extractTarFile.stderr.toString()}`);
		}

		// Move speedtest executable to /usr/local/bin
		const moveExecutable = Bun.spawnSync(["sudo", "mv", "speedtest", "/usr/local/bin/speedtest"]);

		if (!moveExecutable.success) {
			throw new Error(`Failed to move speedtest executable: ${moveExecutable.stderr.toString()}`);
		}

		// Grant executable permissions
		const grantPerms = Bun.spawnSync(["sudo", "chmod", "+x", "/usr/local/bin/speedtest"]);

		if (!grantPerms.success) {
			throw new Error(`Failed to grant executable permissions: ${grantPerms.stderr.toString()}`);
		}

		// Cleanup downloaded and extracted files
		const cleanup = Bun.spawnSync(["rm", "-f", "speedtest.tgz", "speedtest", "speedtest.5"]);

		if (!cleanup.success) {
			throw new Error(`Failed to cleanup speedtest files: ${cleanup.stderr.toString()}`);
		}

		console.log("✅ speedtest installed successfully");
	}

	/**
	 * Generate and install the systemd service unit file
	 *
	 * @param force Whether to overwrite existing service file
	 * @throws {Error} If file generation or installation fails
	 *
	 * @example
	 * ```typescript
	 * await systemd.generateServiceFile(true);
	 * ```
	 */
	private async generateServiceFile(force = false) {
		if (!force && (await Bun.file(SYSTEMD.SERVICE_FILE_PATH).exists())) {
			console.log("⚠️ Service file already exists, skipping generation");
			return;
		}

		// Write to a temporary file first since /etc requires sudo
		const tempFile = join(process.cwd(), "network-monitor.service.tmp");
		await Bun.write(tempFile, this.computedServiceFile);

		// Move to system directory with sudo
		const cmdResult = Bun.spawnSync(["sudo", "mv", tempFile, SYSTEMD.SERVICE_FILE_PATH]);

		if (!cmdResult.success) {
			throw new Error(`Failed to move service file: ${cmdResult.stderr.toString()}`);
		}

		console.log("✅ Service file generated and installed");
	}

	/**
	 * Configure log files with appropriate permissions
	 *
	 * Creates and sets up log files with correct ownership and permissions
	 *
	 * @throws {Error} If log file setup fails
	 *
	 * @example
	 * ```typescript
	 * systemd.setupLogFiles();
	 * ```
	 */
	private setupLogFiles() {
		const commands = [
			["touch", SYSTEMD.LOG_FILE_PATH],
			["touch", SYSTEMD.ERROR_LOG_FILE_PATH],
			["chown", `${this.username}:${this.username}`, SYSTEMD.LOG_FILE_PATH],
			["chown", `${this.username}:${this.username}`, SYSTEMD.ERROR_LOG_FILE_PATH],
			["chmod", "644", SYSTEMD.LOG_FILE_PATH],
			["chmod", "644", SYSTEMD.ERROR_LOG_FILE_PATH],
		];

		for (const cmd of commands) {
			const process = Bun.spawnSync(["sudo", ...cmd]);
			if (!process.success) {
				throw new Error(`Failed to setup log files: ${process.stderr.toString()}`);
			}
		}

		console.log("✅ Log files setup completed");
	}

	/**
	 * Install the systemd service by reloading the daemon
	 *
	 * @throws {Error} If daemon reload fails
	 *
	 * @example
	 * ```typescript
	 * systemd.installService();
	 * ```
	 */
	private installService() {
		const process = Bun.spawnSync(["sudo", "systemctl", "daemon-reload"]);

		if (!process.success) {
			throw new Error(`Failed to reload systemd: ${process.stderr.toString()}`);
		}

		console.log("✅ Service installed");
	}

	/**
	 * Enable the systemd service to start on system boot
	 *
	 * @throws {Error} If service enable fails
	 *
	 * @example
	 * ```typescript
	 * systemd.enableService();
	 * ```
	 */
	private enableService() {
		const process = Bun.spawnSync(["sudo", "systemctl", "enable", SYSTEMD.SERVICE_NAME]);

		if (!process.success) {
			throw new Error(`Failed to enable service: ${process.stderr.toString()}`);
		}

		console.log("✅ Service enabled");
	}

	/**
	 * Start the systemd service immediately
	 *
	 * @throws {Error} If service start fails
	 *
	 * @example
	 * ```typescript
	 * systemd.startService();
	 * ```
	 */
	private startService() {
		const process = Bun.spawnSync(["sudo", "systemctl", "start", SYSTEMD.SERVICE_NAME]);

		if (!process.success) {
			throw new Error(`Failed to start service: ${process.stderr.toString()}`);
		}

		console.log("✅ Service started");
	}

	/**
	 * Generate the systemd service unit file content
	 *
	 * @returns Computed systemd service unit file content with environment-specific values
	 *
	 * @example
	 * ```typescript
	 * const serviceFileContent = systemd.computedServiceFile;
	 * ```
	 */
	private get computedServiceFile() {
		const projectRoot = process.cwd();

		return `[Unit]
Description=Network Speed Test Monitor Service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${this.username}
Group=${this.username}
WorkingDirectory=${projectRoot}
Environment=SPEEDTEST_VERBOSE=${this.options.verbose}
Environment=SPEEDTEST_INTERVAL=${this.options.testInterval}
Environment=SPEEDTEST_MAX_RETRIES=${this.options.maxRetries}
Environment=SPEEDTEST_BACKOFF_DELAY=${this.options.backoffDelay}
Environment=SPEEDTEST_MAX_BACKOFF_DELAY=${this.options.maxBackoffDelay}
Environment=SPEEDTEST_CIRCUIT_BREAKER_THRESHOLD=${this.options.circuitBreakerThreshold}
Environment=SPEEDTEST_CIRCUIT_BREAKER_TIMEOUT=${this.options.circuitBreakerTimeout}
ExecStart=${Bun.which("bun") || "bun"} ${join(projectRoot, "bin/monitor.ts")}
Restart=always
RestartSec=10
StandardOutput=append:${SYSTEMD.LOG_FILE_PATH}
StandardError=append:${SYSTEMD.ERROR_LOG_FILE_PATH}

[Install]
WantedBy=multi-user.target`;
	}
}
