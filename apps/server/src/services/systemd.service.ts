import { SYSTEMD } from "@network-monitor/shared";
import Bun from "bun";

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
