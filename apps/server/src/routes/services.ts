import { createDatabaseConnection, SYSTEMD } from "@network-monitor/shared";
import Bun from "bun";
import { Elysia } from "elysia";

import { SystemdService } from "../services/systemd.service";

const systemd = new SystemdService();
const db = createDatabaseConnection();

/**
 * Interface representing the systemd service configuration
 */
export interface ServiceConfig {
	/**
	 * Unit section configuration
	 */
	Unit: {
		Description: string;
		After: string;
		Wants: string;
	};
	/**
	 * Service section configuration
	 */
	Service: {
		Type: string;
		User: string;
		Group: string;
		WorkingDirectory: string;
		Environment: string;
		ExecStart: string;
		Restart: string;
		RestartSec: string;
		StandardOutput: string;
		StandardError: string;
	};
	/**
	 * Install section configuration
	 */
	Install: {
		WantedBy: string;
	};
}

/**
 * Service routes handler
 */
export const services = new Elysia({ prefix: "/services" })
	.get("/status", async () => {
		const status = await systemd.getStatus();
		return { status };
	})
	.post("/start", async () => {
		const status = await systemd.startService();
		db.execute("INSERT INTO service_logs (service_name, action, status) VALUES (?, 'start', ?)", [
			SYSTEMD.SERVICE_NAME,
			status.activeState,
		]);
		return { status };
	})
	.post("/stop", async () => {
		const status = await systemd.stopService();
		db.execute("INSERT INTO service_logs (service_name, action, status) VALUES (?, 'stop', ?)", [
			SYSTEMD.SERVICE_NAME,
			status.activeState,
		]);
		return { status };
	})
	.post("/restart", async () => {
		const status = await systemd.restartService();
		db.execute("INSERT INTO service_logs (service_name, action, status) VALUES (?, 'restart', ?)", [
			SYSTEMD.SERVICE_NAME,
			status.activeState,
		]);
		return { status };
	})
	.get("/logs", () => {
		const logs = db.query(
			"SELECT * FROM service_logs WHERE service_name = ? ORDER BY created_at DESC LIMIT 100",
			[SYSTEMD.SERVICE_NAME],
		);
		return { logs };
	})
	.get("/config", async () => {
		const configText = await Bun.file(SYSTEMD.SERVICE_FILE_PATH).text();

		// Parse systemd unit file into sections
		const config = configText
			.split("\n")
			.reduce<Record<string, Record<string, string>>>((acc, line) => {
				line = line.trim();

				// Skip empty lines and comments
				if (!line || line.startsWith("#")) return acc;

				// New section
				if (line.match(/^\[.*\]$/)) {
					const section = line.slice(1, -1);
					acc[section] = {};
					return acc;
				}

				// Key-value pair
				const currentSection = Object.keys(acc).pop();
				if (currentSection && line.includes("=")) {
					const [key, ...values] = line.split("=");
					acc[currentSection][key.trim()] = values.join("=").trim();
				}

				return acc;
			}, {});

		return { config: config as unknown as ServiceConfig };
	});
// .put(
// 	"/config",
// 	async ({ body }) => {
// 		await Bun.write(SYSTEMD.SERVICE_FILE_PATH, JSON.stringify(body, null, 2));
// 		// Restart service to apply new config
// 		const status = await systemd.restartService();
// 		return { status };
// 	},
// 	{
// 		body: t.Object({
// 			// Define your config schema here
// 			// Example:
// 			interval: t.Number(),
// 			targets: t.Array(t.String()),
// 			// Add other config properties as needed
// 		}),
// 	},
// );
