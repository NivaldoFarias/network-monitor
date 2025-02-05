import { type ServiceConfig } from "./types";

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): ServiceConfig {
  return {
    dbPath: process.env.SPEEDTEST_DB_PATH ?? "speedtest.db",
    verbose: process.env.SPEEDTEST_VERBOSE === "true",
    testInterval: parseInt(process.env.SPEEDTEST_INTERVAL ?? "1800000", 10), // 30 minutes
    maxRetries: parseInt(process.env.SPEEDTEST_MAX_RETRIES ?? "3", 10),
    backoffDelay: parseInt(process.env.SPEEDTEST_BACKOFF_DELAY ?? "5000", 10), // 5 seconds
    maxBackoffDelay: parseInt(process.env.SPEEDTEST_MAX_BACKOFF_DELAY ?? "300000", 10), // 5 minutes
    circuitBreakerThreshold: parseInt(process.env.SPEEDTEST_CIRCUIT_BREAKER_THRESHOLD ?? "5", 10),
    circuitBreakerTimeout: parseInt(process.env.SPEEDTEST_CIRCUIT_BREAKER_TIMEOUT ?? "1800000", 10), // 30 minutes
  };
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: ServiceConfig = {
  dbPath: "speedtest.db",
  verbose: false,
  testInterval: 1_800_000,            // 30 minutes
  maxRetries: 3,
  backoffDelay: 5_000,               // 5 seconds
  maxBackoffDelay: 300_000,          // 5 minutes
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 1_800_000,   // 30 minutes
}; 