import Bun from "bun";
import { networkInterfaces, hostname } from "os";

import {
  initializeDatabase,
  storeResult,
  closeDatabase,
  cleanupOldResults,
} from "./database";

import type {
  ServiceConfig,
  ServiceState,
  SpeedTestResult,
  HealthStatus,
  SpeedTestData
} from "./types";

/**
 * Service class managing the speed test monitoring
 */
export class SpeedTestService {
  private readonly config: ServiceConfig;
  private state: ServiceState;
  private startTime: number;

  constructor(config: ServiceConfig) {
    this.config = config;
    this.startTime = Date.now();
    this.state = {
      isRunning: false,
      lastTestTime: 0,
      consecutiveFailures: 0,
      isCircuitBroken: false,
      circuitBreakerResetTime: null,
      db: null,
    };
  }

  /**
   * Initialize the service
   */
  public async initialize() {
    try {
      this.state.db = initializeDatabase(this.config.dbPath);
      this.state.isRunning = true;

      // Setup signal handlers
      process.on("SIGTERM", () => this.shutdown());
      process.on("SIGINT", () => this.shutdown());

      if (this.config.verbose) {
        console.log("Speed test service initialized");
      }
    } catch (error) {
      console.error("Failed to initialize service:", error);
      throw error;
    }
  }

  /**
   * Start the service main loop
   */
  public async start() {
    if (!this.state.isRunning || !this.state.db) {
      throw new Error("Service not properly initialized");
    }

    while (this.state.isRunning) {
      try {
        // Check circuit breaker
        if (this.state.isCircuitBroken) {
          if (this.state.circuitBreakerResetTime && Date.now() >= this.state.circuitBreakerResetTime) {
            this.state.isCircuitBroken = false;
            this.state.consecutiveFailures = 0;
            this.state.circuitBreakerResetTime = null;
          } else {
            await this.sleep(5000); // Check every 5 seconds when circuit is broken
            continue;
          }
        }

        // Check if it's time for next test
        const timeSinceLastTest = Date.now() - this.state.lastTestTime;
        if (timeSinceLastTest < this.config.testInterval) {
          await this.sleep(Math.min(5000, this.config.testInterval - timeSinceLastTest));
          continue;
        }

        // Run the speed test
        await this.runTest();

        // Cleanup old results periodically
        if (this.state.db) {
          cleanupOldResults(this.state.db);
        }

        // Force garbage collection hint
        if (global.gc) {
          global.gc();
        }

      } catch (error) {
        console.error("Error in service loop:", error);
        await this.handleError();
      }
    }
  }

  /**
   * Run a single speed test
   */
  private async runTest() {
    if (!this.state.db) return;

    let retryCount = 0;
    let success = false;

    while (retryCount <= this.config.maxRetries && !success) {
      try {
        const result = await this.executeSpeedTest();
        if (result) {
          storeResult(this.state.db, result);
          this.state.lastTestTime = Date.now();
          this.state.consecutiveFailures = 0;
          success = true;

          if (this.config.verbose) {
            console.log(`Speed test completed successfully at ${new Date().toISOString()}`);
          }
        }
      } catch (error) {
        retryCount++;
        if (retryCount <= this.config.maxRetries) {
          const backoffDelay = Math.min(
            this.config.backoffDelay * Math.pow(2, retryCount - 1),
            this.config.maxBackoffDelay
          );
          await this.sleep(backoffDelay);
        }
      }
    }

    if (!success) {
      await this.handleError();
    }
  }

  /**
   * Execute the speed test and return results
   */
  private async executeSpeedTest() {
    const proc = Bun.spawn({
      cmd: [ "speedtest-ookla", "--format=json" ],
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      throw new Error(`Speedtest failed with exit code ${exitCode}: ${stderr}`);
    }

    const output = await new Response(proc.stdout).text();
    if (!output) {
      throw new Error("No output received from speedtest command");
    }

    const data = JSON.parse(output) as SpeedTestData;

    return {
      timestamp: new Date().toISOString(),
      ping: data.ping?.latency ?? 0,
      download: data.download?.bandwidth ? (data.download.bandwidth * 8) / 1e6 : 0,
      upload: data.upload?.bandwidth ? (data.upload.bandwidth * 8) / 1e6 : 0,
      network_ssid: data.interface?.name ?? null,
      network_type: this.detectNetworkType(),
      ip_address: data.interface?.externalIp ?? "unknown",
      server_id: data.server?.id?.toString() ?? "unknown",
      server_location: `${data.server?.name ?? "unknown"}, ${data.server?.country ?? "unknown"}`,
      isp: data.isp ?? "unknown",
      latency_jitter: data.ping?.jitter ?? 0,
      packet_loss: data.packetLoss ?? 0,
      connection_quality: this.determineConnectionQuality(
        data.ping?.latency ?? 0,
        data.ping?.jitter ?? 0,
        data.packetLoss ?? 0
      ),
      device_name: hostname(),
    } as SpeedTestResult;
  }

  /**
   * Handle errors and implement circuit breaker pattern
   */
  private async handleError() {
    this.state.consecutiveFailures++;
    console.error(`Speed test failed. Consecutive failures: ${this.state.consecutiveFailures}`);

    if (this.state.consecutiveFailures >= this.config.circuitBreakerThreshold) {
      this.state.isCircuitBroken = true;
      this.state.circuitBreakerResetTime = Date.now() + this.config.circuitBreakerTimeout;
      console.error("Circuit breaker triggered. Pausing tests.");
    }
  }

  /**
   * Get current service health status
   */
  public getHealth(): HealthStatus {
    const status = this.determineHealthStatus();

    return {
      status,
      lastTestTime: new Date(this.state.lastTestTime).toISOString(),
      consecutiveFailures: this.state.consecutiveFailures,
      isCircuitBroken: this.state.isCircuitBroken,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Determine current health status
   */
  private determineHealthStatus() {
    if (!this.state.isRunning) return 'unhealthy';
    if (this.state.isCircuitBroken) return 'unhealthy';
    if (this.state.consecutiveFailures > 0) return 'degraded';
    return 'healthy';
  }

  /**
   * Determine network type
   */
  private detectNetworkType() {
    const interfaces = networkInterfaces();

    for (const [ name, addrs ] of Object.entries(interfaces)) {
      if (!addrs) continue;

      if (name.toLowerCase().includes('wlan') || name.toLowerCase().includes('wifi')) {
        return 'wifi';
      }
      if (name.toLowerCase().includes('eth') || name.toLowerCase().includes('enp')) {
        return 'ethernet';
      }
      if (name.toLowerCase().includes('wwan') || name.toLowerCase().includes('cellular')) {
        return 'cellular';
      }
    }

    return 'unknown';
  }

  /**
   * Determine connection quality
   */
  private determineConnectionQuality(ping: number, jitter: number, packetLoss: number) {
    if (ping < 20 && jitter < 5 && packetLoss < 0.1) return 'excellent';
    if (ping < 50 && jitter < 15 && packetLoss < 1) return 'good';
    if (ping < 100 && jitter < 30 && packetLoss < 2.5) return 'fair';
    return 'poor';
  }

  /**
   * Sleep for specified duration
   */
  private async sleep(ms: number) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Shutdown the service
   */
  public async shutdown(): Promise<void> {
    console.log("Shutting down speed test service...");
    this.state.isRunning = false;
    closeDatabase(this.state.db);
    process.exit(0);
  }
} 