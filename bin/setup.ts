#!/usr/bin/env bun
import { SystemdService } from "../src/services/systemd.service";

if (import.meta.main) {
  try {
    const service = new SystemdService();

    await service.setup(process.argv.includes("--force"));
  } catch (error) {
    console.error("❌ Service setup failed:", error);
    process.exit(1);
  }
}
