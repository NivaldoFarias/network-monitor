import { z } from "zod";

/**
 * Configuration schema for the speed test monitor service
 */
export const configSchema = z.object({
  dbPath: z.string().default("speedtest.db"),
  verbose: z.boolean().default(false),
  testInterval: z.number().positive().default(1_800_000),           // 30 minutes
  maxRetries: z.number().positive().default(3),
  backoffDelay: z.number().positive().default(5_000),               // 5 seconds
  maxBackoffDelay: z.number().positive().default(300_000),          // 5 minutes
  circuitBreakerThreshold: z.number().positive().default(5),
  circuitBreakerTimeout: z.number().positive().default(1_800_000),  // 30 minutes
});

export type ServiceConfig = z.infer<typeof configSchema>;

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): ServiceConfig {
  return configSchema.parse({
    dbPath: process.env.SPEEDTEST_DB_PATH,
    verbose: process.env.SPEEDTEST_VERBOSE === "true",
    testInterval: process.env.SPEEDTEST_INTERVAL
      ? Number.parseInt(process.env.SPEEDTEST_INTERVAL)
      : undefined,
    maxRetries: process.env.SPEEDTEST_MAX_RETRIES
      ? Number.parseInt(process.env.SPEEDTEST_MAX_RETRIES)
      : undefined,
    backoffDelay: process.env.SPEEDTEST_BACKOFF_DELAY
      ? Number.parseInt(process.env.SPEEDTEST_BACKOFF_DELAY)
      : undefined,
    maxBackoffDelay: process.env.SPEEDTEST_MAX_BACKOFF_DELAY
      ? Number.parseInt(process.env.SPEEDTEST_MAX_BACKOFF_DELAY)
      : undefined,
    circuitBreakerThreshold: process.env.SPEEDTEST_CIRCUIT_BREAKER_THRESHOLD
      ? Number.parseInt(process.env.SPEEDTEST_CIRCUIT_BREAKER_THRESHOLD)
      : undefined,
    circuitBreakerTimeout: process.env.SPEEDTEST_CIRCUIT_BREAKER_TIMEOUT
      ? Number.parseInt(process.env.SPEEDTEST_CIRCUIT_BREAKER_TIMEOUT)
      : undefined,
  });
}

/**
 * Default configuration values (these are handled by Zod schema defaults)
 */
export const DEFAULT_CONFIG = configSchema.parse({}); 