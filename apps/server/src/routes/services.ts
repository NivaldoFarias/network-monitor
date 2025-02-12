import { createDatabaseConnection } from "@network-monitor/shared";
import { Elysia, t } from "elysia";

import { SystemdService } from "../services/systemd.service";

const systemd = new SystemdService();
const db = createDatabaseConnection();

/**
 * Service routes handler
 */
export const services = new Elysia({ prefix: "/services" })
	.get("/", async () => {
		const services = await systemd.listServices();
		return { services };
	})
	.get(
		"/:name",
		async ({ params: { name } }) => {
			const status = await systemd.getStatus(name);
			return { status };
		},
		{
			params: t.Object({ name: t.String() }),
		},
	)
	.post(
		"/:name/start",
		async ({ params: { name } }) => {
			const status = await systemd.startService(name);
			db.execute("INSERT INTO service_logs (service_name, action, status) VALUES (?, 'start', ?)", [
				name,
				status.activeState,
			]);
			return { status };
		},
		{
			params: t.Object({ name: t.String() }),
		},
	)
	.post(
		"/:name/stop",
		async ({ params: { name } }) => {
			const status = await systemd.stopService(name);
			db.execute("INSERT INTO service_logs (service_name, action, status) VALUES (?, 'stop', ?)", [
				name,
				status.activeState,
			]);
			return { status };
		},
		{
			params: t.Object({ name: t.String() }),
		},
	)
	.post(
		"/:name/restart",
		async ({ params: { name } }) => {
			const status = await systemd.restartService(name);
			db.execute(
				"INSERT INTO service_logs (service_name, action, status) VALUES (?, 'restart', ?)",
				[name, status.activeState],
			);
			return { status };
		},
		{
			params: t.Object({ name: t.String() }),
		},
	)
	.get(
		"/:name/logs",
		({ params: { name } }) => {
			const logs = db.query(
				"SELECT * FROM service_logs WHERE service_name = ? ORDER BY created_at DESC LIMIT 100",
				[name],
			);
			return { logs };
		},
		{
			params: t.Object({ name: t.String() }),
		},
	);
