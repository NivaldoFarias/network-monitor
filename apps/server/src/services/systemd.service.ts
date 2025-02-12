import { join } from "path";
import process from "process";

import { SYSTEMD } from "@network-monitor/shared";
import Bun from "bun";

import type { SystemdSetupOptions } from "@network-monitor/shared";

import { ValidationError } from "../utils/errors";

/**
 * Type definition for systemd service status
 */
export type ServiceStatus = {
	/** The name of the service */
	name: string;
	/** The description of the service */
	description: string;
	/** The load state of the service */
	loadState: string;
	/** The active state of the service */
	activeState: string;
	/** The sub state of the service */
	subState: string;
	/** The unit file of the service */
	unitFile: string;
};

/**
 * Service class for handling systemd operations
 *
 * @example
 * ```typescript
 * const systemd = new SystemdService();
 * const status = await systemd.getStatus("my-service");
 * console.log(status);
 * ```
 */
export class SystemdService {
	private readonly username = process.env["USER"] ?? "";
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
			await this.installService();
			await this.enableService();
			await this.startService();

			console.log("✅ Service setup completed successfully");
		} catch (error) {
			console.error("❌ Service setup failed:", error);
			throw error;
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

		for (const [cmd, ...args] of commands) {
			const result = Bun.spawnSync(["sudo", cmd, ...args]);
			if (!result.success) {
				throw new Error(`Failed to setup log files: ${result.stderr.toString()}`);
			}
		}

		console.log("✅ Log files configured");
	}

	/**
	 * Install the systemd service
	 *
	 * @throws {Error} If service installation fails
	 *
	 * @example
	 * ```typescript
	 * systemd.installService();
	 * ```
	 */
	private async installService() {
		await this.executeSystemctl(["daemon-reload"]);
		console.log("✅ Service installed");
	}

	/**
	 * Enable the systemd service to start on boot
	 *
	 * @throws {Error} If service enabling fails
	 *
	 * @example
	 * ```typescript
	 * systemd.enableService();
	 * ```
	 */
	private async enableService() {
		await this.executeSystemctl(["enable", SYSTEMD.SERVICE_NAME]);
		console.log("✅ Service enabled");
	}

	/**
	 * Get the computed systemd service unit file content
	 */
	private get computedServiceFile() {
		return `[Unit]
Description=Network Monitor Service
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=${this.username}
Group=${this.username}
WorkingDirectory=${process.cwd()}
Environment=NODE_ENV=production
ExecStart=${Bun.which("bun")} run scripts/network-monitor.ts
Restart=always
RestartSec=10
StandardOutput=append:${SYSTEMD.LOG_FILE_PATH}
StandardError=append:${SYSTEMD.ERROR_LOG_FILE_PATH}

[Install]
WantedBy=multi-user.target`;
	}

	/**
	 * Executes a systemctl command and returns its output
	 *
	 * @param args The arguments to pass to systemctl
	 * @returns The output of the systemctl command
	 */
	private async executeSystemctl(args: string[]) {
		const proc = Bun.spawn(["sudo", "systemctl", ...args], {
			stderr: "pipe",
			stdout: "pipe",
		});

		const [output, error] = await Promise.all([
			new Response(proc.stdout).text(),
			new Response(proc.stderr).text(),
		]);

		const exitCode = await proc.exited;

		if (exitCode !== 0) {
			const errorMessage = error.trim() || output.trim() || "Failed to execute systemctl command";
			throw new ValidationError(`systemctl error (exit code ${exitCode}): ${errorMessage}`);
		}

		return output.trim();
	}

	/**
	 * Gets the status of a systemd service
	 *
	 * @param serviceName The name of the service to get the status of
	 * @returns The status of the service
	 */
	public async getStatus() {
		const output = await this.executeSystemctl([
			"show",
			SYSTEMD.SERVICE_NAME,
			"--property=Description,LoadState,ActiveState,SubState,UnitFile",
		]);

		const properties = output.split("\n").reduce<Record<string, string>>((acc, line) => {
			const [key, value] = line.split("=");
			return { ...acc, [key]: value };
		}, {});

		const status: ServiceStatus = {
			name: SYSTEMD.SERVICE_NAME,
			description: properties.Description || "",
			loadState: properties.LoadState || "",
			activeState: properties.ActiveState || "",
			subState: properties.SubState || "",
			unitFile: properties.UnitFile || "",
		};

		return status;
	}

	/**
	 * Starts a systemd service
	 *
	 * @param serviceName The name of the service to start
	 * @returns The status of the service after starting it
	 */
	public async startService() {
		await this.executeSystemctl(["start", SYSTEMD.SERVICE_NAME]);
		return this.getStatus();
	}

	/**
	 * Stops a systemd service
	 *
	 * @param serviceName The name of the service to stop
	 * @returns The status of the service after stopping it
	 */
	public async stopService() {
		await this.executeSystemctl(["stop", SYSTEMD.SERVICE_NAME]);
		return this.getStatus();
	}

	/**
	 * Restarts a systemd service
	 *
	 * @param serviceName The name of the service to restart
	 * @returns The status of the service after restarting it
	 */
	public async restartService() {
		await this.executeSystemctl(["restart", SYSTEMD.SERVICE_NAME]);
		return this.getStatus();
	}

	/**
	 * Lists all systemd services
	 *
	 * @returns An array of all systemd services
	 */
	public async listServices() {
		const output = await this.executeSystemctl([
			"list-units",
			"--type=service",
			"--all",
			"--no-pager",
			"--plain",
		]);

		return output
			.split("\n")
			.slice(1) // Skip header
			.filter(Boolean)
			.map((line) => {
				const [unit, load, active, sub, description] = line.split(/\s+/);
				return {
					name: unit.replace(".service", ""),
					loadState: load,
					activeState: active,
					subState: sub,
					description: description || "",
				};
			});
	}
}
