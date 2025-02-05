import { loadConfig } from "./src/config";
import { SpeedTestService } from "./src/speedtest-service";

async function main() {
  try {
    // Load configuration
    const config = loadConfig();

    // Create and initialize service
    const service = new SpeedTestService(config);
    await service.initialize();

    // Start the service
    await service.start();
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
