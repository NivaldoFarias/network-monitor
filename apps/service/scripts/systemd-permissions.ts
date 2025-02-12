#!/usr/bin/env bun
import { SystemdService } from "../src/services/systemd.service";

if (import.meta.main) {
	try {
		const service = new SystemdService();

		await service.setupPermissions();
	} catch (error) {
		console.error("❌ Permissions setup failed:", error);
		process.exit(1);
	}
}
