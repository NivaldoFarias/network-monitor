import type { Database } from "bun:sqlite";

/**
 * Configuration interface for the speed test monitor service
 */
export interface ServiceConfig {
  /** Database file path relative to the current directory */
  readonly dbPath: string;
  /** Whether to output verbose logs */
  readonly verbose: boolean;
  /** Test interval in milliseconds */
  readonly testInterval: number;
  /** Maximum retry attempts for failed tests */
  readonly maxRetries: number;
  /** Base delay for exponential backoff (ms) */
  readonly backoffDelay: number;
  /** Maximum backoff delay (ms) */
  readonly maxBackoffDelay: number;
  /** Circuit breaker failure threshold */
  readonly circuitBreakerThreshold: number;
  /** Circuit breaker reset timeout (ms) */
  readonly circuitBreakerTimeout: number;
}

/**
 * Interface representing the complete speed test results
 */
export interface SpeedTestResult {
  timestamp: string;
  ping: number;
  download: number;
  upload: number;
  network_ssid: string | null;
  network_type: string;
  ip_address: string;
  server_id: string;
  server_location: string;
  isp: string;
  latency_jitter: number;
  packet_loss: number;
  connection_quality: string;
  device_name: string;
}

/**
 * Service state interface
 */
export interface ServiceState {
  isRunning: boolean;
  lastTestTime: number;
  consecutiveFailures: number;
  isCircuitBroken: boolean;
  circuitBreakerResetTime: number | null;
  db: Database | null;
}

/**
 * Health check response interface
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastTestTime: string;
  consecutiveFailures: number;
  isCircuitBroken: boolean;
  uptime: number;
}

/**
 * Interface representing the speed test data
 */
export interface SpeedTestData {
  type: string;
  timestamp: string;
  ping: {
    jitter: number;
    latency: number;
    low: number;
    high: number;
  };
  download: {
    bandwidth: number;
    bytes: number;
    elapsed: number;
    latency: {
      iqm: number;
      low: number;
      high: number;
      jitter: number;
    };
  };
  upload: {
    bandwidth: number;
    bytes: number;
    elapsed: number;
    latency: {
      iqm: number;
      low: number;
      high: number;
      jitter: number;
    };
  };
  packetLoss: number;
  isp: string;
  interface: {
    internalIp: string;
    name: string;
    macAddr: string;
    isVpn: boolean;
    externalIp: string;
  };
  server: {
    id: number;
    host: string;
    port: number;
    name: string;
    location: string;
    country: string;
    ip: string;
  };
  result: {
    id: string;
    url: string;
    persisted: boolean;
  };
};
