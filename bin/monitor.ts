#!/usr/bin/env bun
import { SpeedTestService } from "../src/services/speedtest.service";

if (import.meta.main) {
  try {
    const service = new SpeedTestService();

    for (const signal of [ "SIGTERM", "SIGINT", "SIGQUIT" ]) {
      process.on(signal, () => service.shutdown());
    }

    await service.start();
  } catch (error) {
    console.error("❌ Fatal error: ", error);
    process.exit(1);
  }
}