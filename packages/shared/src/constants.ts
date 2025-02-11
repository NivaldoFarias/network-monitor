/**
 * Default configuration values for the speed test monitor service.
 *
 * These values are used when no environment variables are provided.
 *
 * @example
 * ```typescript
 * import { DEFAULT_CONFIG } from "@network-monitor/shared";
 * console.log(`Default test interval: ${DEFAULT_CONFIG.testInterval}ms`);
 * ```
 */
export const DEFAULT_CONFIG = {
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
