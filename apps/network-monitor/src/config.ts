import { z } from "zod";

/**
 * Default configuration values for the speed test monitor service.
 * 
 * These values are used when no environment variables are provided.
 * 
 * @example
 * ```typescript
 * import { defaults } from "./config";
 * console.log(`Default test interval: ${defaults.testInterval}ms`);
 * ```
 */
export const defaults = {
  /** Verbose logging disabled by default */
  verbose: "false",
  /** Default test interval: 30 minutes (in milliseconds) */
  testInterval: 1_800_000,
  /** Maximum number of retry attempts for failed tests */
  maxRetries: 3,
  /** Initial delay between retries: 5 seconds (in milliseconds) */
  backoffDelay: 5_000,
  /** Maximum delay between retries: 5 minutes (in milliseconds) */
  maxBackoffDelay: 300_000,
  /** Number of consecutive failures before circuit breaker trips */
  circuitBreakerThreshold: 5,
  /** Time circuit breaker remains open: 30 minutes (in milliseconds) */
  circuitBreakerTimeout: 1_800_000,
} as const;

/**
 * Configuration schema for the speed test monitor service.
 * 
 * Defines and validates all configuration options using Zod.
 * 
 * @example
 * ```typescript
 * const config = configSchema.parse({
 *   verbose: "true",
 *   testInterval: 3600000
 * });
 * ```
 */
export const configSchema = z.object({
  verbose: z.enum([ "true", "false" ]).transform((value) => value === "true").default(defaults.verbose),
  testInterval: z.coerce.number().positive().default(defaults.testInterval),
  maxRetries: z.coerce.number().positive().default(defaults.maxRetries),
  backoffDelay: z.coerce.number().positive().default(defaults.backoffDelay),
  maxBackoffDelay: z.coerce.number().positive().default(defaults.maxBackoffDelay),
  circuitBreakerThreshold: z.coerce.number().positive().default(defaults.circuitBreakerThreshold),
  circuitBreakerTimeout: z.coerce.number().positive().default(defaults.circuitBreakerTimeout),
});

/**
 * Load and validate configuration from environment variables.
 * 
 * Reads configuration from environment variables and validates against schema.
 * 
 * @throws {Error} If configuration validation fails.
 * @returns Validated service configuration object.
 * 
 * @example
 * ```typescript
 * const config = loadConfig();
 * console.log(`Test interval: ${config.testInterval}ms`);
 * ```
 */
export function loadConfig(): ServiceConfig {
  return configSchema.parse({
    verbose: process.env.SPEEDTEST_VERBOSE,
    testInterval: process.env.SPEEDTEST_INTERVAL,
    maxRetries: process.env.SPEEDTEST_MAX_RETRIES,
    backoffDelay: process.env.SPEEDTEST_BACKOFF_DELAY,
    maxBackoffDelay: process.env.SPEEDTEST_MAX_BACKOFF_DELAY,
    circuitBreakerThreshold: process.env.SPEEDTEST_CIRCUIT_BREAKER_THRESHOLD,
    circuitBreakerTimeout: process.env.SPEEDTEST_CIRCUIT_BREAKER_TIMEOUT,
  });
}

/**
 * Default configuration values (these are handled by Zod schema defaults)
 */
export const DEFAULT_CONFIG = configSchema.parse({});

export type ServiceConfig = z.infer<typeof configSchema>;
