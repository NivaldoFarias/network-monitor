# Network Monitor

A lightweight network monitor that runs as a systemd service and stores results in SQLite.

## Features

- Runs speed tests using the official Ookla Speedtest CLI
- Stores comprehensive network metrics in SQLite database:
  - Basic speed metrics (download, upload, ping)
  - Network information (SSID, type, IP address)
  - Server details (location, distance, ID)
  - Connection quality metrics (jitter, packet loss)
  - ISP information
  - Device identification
- Automatic network type detection (WiFi, Ethernet, Cellular)
- Connection quality assessment
- Runs as a systemd service with:
  - Graceful shutdown handling
  - Error recovery with exponential backoff
  - Circuit breaker for failure protection
  - Health monitoring
  - Automatic restart on failure
- Minimal resource usage with idle optimization
- TypeScript implementation using Bun runtime
- Detailed logging with rotation

## Prerequisites

You'll only need two dependencies:

1. [Bun](https://bun.sh/docs/installation)
2. [Ookla's Speedtest CLI](https://www.speedtest.net/apps/cli)

## Installation

1. Clone this repository and navigate to the directory.
2. Install dependencies using Bun.
3. Install the systemd service:

> [!IMPORTANT]
> Replace `username` with your main user's username.

```bash
# Copy service file to systemd directory
sudo cp network-monitor.service /etc/systemd/system/

# Create log files with appropriate permissions
sudo touch /var/log/network-monitor.log /var/log/network-monitor.error.log
sudo chown username:username /var/log/network-monitor.log /var/log/network-monitor.error.log

# Reload systemd daemon
sudo systemctl daemon-reload

# Enable and start the service
sudo systemctl enable network-monitor
sudo systemctl start network-monitor
```

## Service Management

### Checking Status

```bash
# View service status
sudo systemctl status network-monitor

# View logs
sudo journalctl -u network-monitor -f

# View application logs
tail -f /var/log/network-monitor.log
tail -f /var/log/network-monitor.error.log
```

### Configuration

The service can be configured through environment variables in the systemd service file:

| Variable | Description | Default |
|----------|-------------|---------|
| SPEEDTEST_VERBOSE | Enable verbose logging | false |
| SPEEDTEST_INTERVAL | Test interval in milliseconds | 1800000 (30 min) |
| SPEEDTEST_MAX_RETRIES | Maximum retry attempts | 3 |
| SPEEDTEST_BACKOFF_DELAY | Base delay for exponential backoff | 5000 (5s) |
| SPEEDTEST_MAX_BACKOFF_DELAY | Maximum backoff delay | 300000 (5min) |
| SPEEDTEST_CIRCUIT_BREAKER_THRESHOLD | Failures before circuit breaks | 5 |
| SPEEDTEST_CIRCUIT_BREAKER_TIMEOUT | Circuit breaker reset time | 1800000 (30min) |

To modify these settings:

1. Edit the service file:

```bash
sudo systemctl edit network-monitor
```

2. Restart the service:

```bash
sudo systemctl restart network-monitor
```

### Manual Execution

For testing or debugging, you can run the service manually:

```bash
bun run src/index.ts
```

## Database Schema

The SQLite database (`speedtest.db`) contains a single table `speed_results` with the following columns:

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| timestamp | TEXT | ISO 8601 timestamp |
| ping | REAL | Latency in milliseconds |
| download | REAL | Download speed in Mbps |
| upload | REAL | Upload speed in Mbps |
| network_ssid | TEXT | WiFi network SSID (if applicable) |
| network_type | TEXT | Connection type (wifi/ethernet/cellular) |
| ip_address | TEXT | External IP address |
| server_id | TEXT | Speedtest server identifier |
| server_location | TEXT | Server location (city, country) |
| isp | TEXT | Internet Service Provider name |
| latency_jitter | REAL | Jitter in milliseconds |
| packet_loss | REAL | Packet loss percentage |
| connection_quality | TEXT | Overall quality rating |
| device_name | TEXT | System hostname |

## Project Structure

```plaintext
├── src/
│   ├── index.ts                # Main entry point
│   ├── service.ts              # Service implementation
│   ├── config.ts               # Configuration management
│   ├── db.ts                   # Database operations
│   └── types/                  # TypeScript type definitions
├── speedtest.db                # SQLite database
├── package.json                # Project configuration
└── network-monitor.service     # Systemd service file
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
