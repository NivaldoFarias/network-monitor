import { DEFAULT_CONFIG } from "@network-monitor/shared";
import { z } from "zod";

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
	verbose: z
		.enum(["true", "false"])
		.transform((value) => value === "true")
		.default(DEFAULT_CONFIG.verbose),
	testInterval: z.coerce.number().positive().default(DEFAULT_CONFIG.testInterval),
	maxRetries: z.coerce.number().positive().default(DEFAULT_CONFIG.maxRetries),
	backoffDelay: z.coerce.number().positive().default(DEFAULT_CONFIG.backoffDelay),
	maxBackoffDelay: z.coerce.number().positive().default(DEFAULT_CONFIG.maxBackoffDelay),
	circuitBreakerThreshold: z.coerce
		.number()
		.positive()
		.default(DEFAULT_CONFIG.circuitBreakerThreshold),
	circuitBreakerTimeout: z.coerce.number().positive().default(DEFAULT_CONFIG.circuitBreakerTimeout),
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

export type ServiceConfig = z.infer<typeof configSchema>;
