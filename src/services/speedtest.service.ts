import Bun from "bun";
import { networkInterfaces, hostname } from "os";

import {
  initializeDatabase,
  storeResult,
  closeDatabase,
  cleanupOldResults,
} from "../database";
import { loadConfig } from "../config";

import type {
  ServiceState,
  SpeedtestMetrics,
  HealthStatus,
  SpeedtestData
} from "../types";

/**
 * Service class managing network speed test monitoring and execution
 * 
 * Handles speed test scheduling, execution, error handling, and circuit breaking
 * to prevent excessive resource usage during failures.
 * 
 * @example
 * ```typescript
 * const service = new SpeedTestService();
 * await service.start();
 * ```
 */
export class SpeedTestService {
  private readonly startTime = Date.now();
  private readonly config = loadConfig();
  private state: ServiceState = {
    isRunning: false,
    lastTestTime: 0,
    consecutiveFailures: 0,
    isCircuitBroken: false,
    circuitBreakerResetTime: null,
    db: null,
  };

  /**
   * Initialize the speed test service and set up signal handlers
   * 
   * @throws {Error} If service initialization fails
   * 
   * @example
   * ```typescript
   * await service.initialize();
   * ```
   */
  private async initialize() {
    try {
      this.state.db = initializeDatabase();
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
   * Start the speed test monitoring service main loop
   * 
   * Continuously runs speed tests based on configured intervals,
   * handles errors, and implements circuit breaking for failure scenarios.
   * 
   * @throws {Error} If service initialization fails
   * 
   * @example
   * ```typescript
   * await service.start();
   * ```
   */
  public async start() {
    if (!this.state.isRunning || !this.state.db) await this.initialize();

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
        if (this.state.db) cleanupOldResults(this.state.db);

        // Force garbage collection hint
        if (global.gc) global.gc();
      } catch (error) {
        console.error("Error in service loop:", error);
        await this.handleError();
      }
    }
  }

  /**
   * Execute a single speed test iteration
   * 
   * Attempts to run the speed test with configured retries and backoff delays
   * 
   * @throws {Error} If all retry attempts fail
   * 
   * @example
   * ```typescript
   * await service.runTest();
   * ```
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

    if (!success) await this.handleError();
  }

  /**
   * Execute the speed test command and process its results
   * 
   * @returns Processed speed test results with calculated metrics
   * @throws {Error} If the speed test command fails or returns invalid data
   * 
   * @example
   * ```typescript
   * const result = await service.executeSpeedTest();
   * console.log(`Download speed: ${result.download} Mbps`);
   * ```
   */
  private async executeSpeedTest() {
    const proc = Bun.spawn({
      cmd: [ "speedtest", "--format=json" ],
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

    const data = JSON.parse(output) as SpeedtestData;

    const result: SpeedtestMetrics = {
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
    };

    return result;
  }

  /**
   * Handle service errors and implement circuit breaker pattern
   * 
   * Tracks consecutive failures and triggers circuit breaker when threshold is reached
   * 
   * @example
   * ```typescript
   * await service.handleError();
   * if (service.state.isCircuitBroken) {
   *   console.log("Circuit breaker activated");
   * }
   * ```
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
   * Get current health status of the speed test service
   * 
   * @returns Health status object containing service metrics and state
   * 
   * @example
   * ```typescript
   * const health = service.getHealth();
   * console.log(`Service status: ${health.status}`);
   * ```
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
   * Determine current service health status based on state
   * 
   * @returns Health status string: 'healthy', 'degraded', or 'unhealthy'
   * 
   * @example
   * ```typescript
   * const status = service.determineHealthStatus();
   * ```
   */
  private determineHealthStatus() {
    if (!this.state.isRunning) return 'unhealthy';
    if (this.state.isCircuitBroken) return 'unhealthy';
    if (this.state.consecutiveFailures > 0) return 'degraded';
    return 'healthy';
  }

  /**
   * Detect the type of network interface being used
   * 
   * @returns Network type string: 'wifi', 'ethernet', 'cellular', or 'unknown'
   * 
   * @example
   * ```typescript
   * const networkType = service.detectNetworkType();
   * ```
   */
  private detectNetworkType() {
    const interfaces = networkInterfaces();

    for (const [ name, address ] of Object.entries(interfaces)) {
      if (!address) continue;

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
   * Determine connection quality based on speed test metrics
   * 
   * @param ping Network latency in milliseconds
   * @param jitter Latency variation in milliseconds
   * @param packetLoss Packet loss percentage
   * @returns Connection quality string: 'excellent', 'good', 'fair', or 'poor'
   * 
   * @example
   * ```typescript
   * const quality = service.determineConnectionQuality(20, 5, 0.1);
   * ```
   */
  private determineConnectionQuality(ping: number, jitter: number, packetLoss: number) {
    if (ping < 20 && jitter < 5 && packetLoss < 0.1) return 'excellent';
    if (ping < 50 && jitter < 15 && packetLoss < 1) return 'good';
    if (ping < 100 && jitter < 30 && packetLoss < 2.5) return 'fair';
    return 'poor';
  }

  /**
   * Sleep for a specified duration
   * 
   * @param ms Time to sleep in milliseconds
   * @returns Promise that resolves after the specified duration
   * 
   * @example
   * ```typescript
   * await service.sleep(1000); // Sleep for 1 second
   * ```
   */
  private async sleep(ms: number) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gracefully shutdown the speed test service
   * 
   * Closes database connections and exits the process
   * 
   * @example
   * ```typescript
   * await service.shutdown();
   * ```
   */
  public async shutdown(): Promise<void> {
    console.log("Shutting down speed test service...");
    this.state.isRunning = false;
    closeDatabase(this.state.db);
    process.exit(0);
  }
} 