# Network Monitor

A lightweight network monitor that runs as a systemd service and stores results in SQLite. Built with TypeScript and Bun runtime, it provides comprehensive network speed monitoring with robust error handling and data persistence.

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
- Connection quality assessment based on multiple metrics
- Runs as a systemd service with:
  - Graceful shutdown handling
  - Error recovery with exponential backoff
  - Circuit breaker for failure protection
  - Health monitoring
  - Automatic restart on failure
- Minimal resource usage with idle optimization
- TypeScript implementation using Bun runtime
- Detailed logging with rotation
- XDG-compliant data storage

## Prerequisites

You'll need these dependencies:

1. [Bun Runtime](https://bun.sh/docs/installation)
2. [Ookla's Speedtest CLI](https://www.speedtest.net/apps/cli) _(optional, will be installed automatically if not found)_

## Installation

1. Clone this repository and navigate to the directory
2. Install dependencies:

```bash
bun install
```

3. Copy the example environment file and adjust as needed:

```bash
cp .env.example .env
```

4. Setup the systemd service:

```bash
# Regular setup
bun run bin/setup.ts

# Force setup (overwrites existing service)
bun run bin/setup.ts --force
```

The setup script will automatically:

- Generate the systemd service file
- Setup log files with appropriate permissions
- Install and enable the service
- Start the service

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

The service can be configured through environment variables:

| Variable                            | Description                        | Default          |
| ----------------------------------- | ---------------------------------- | ---------------- |
| SPEEDTEST_VERBOSE                   | Enable verbose logging             | false            |
| SPEEDTEST_INTERVAL                  | Test interval in milliseconds      | 1800000 (30 min) |
| SPEEDTEST_MAX_RETRIES               | Maximum retry attempts             | 3                |
| SPEEDTEST_BACKOFF_DELAY             | Base delay for exponential backoff | 5000 (5s)        |
| SPEEDTEST_MAX_BACKOFF_DELAY         | Maximum backoff delay              | 300000 (5min)    |
| SPEEDTEST_CIRCUIT_BREAKER_THRESHOLD | Failures before circuit breaks     | 5                |
| SPEEDTEST_CIRCUIT_BREAKER_TIMEOUT   | Circuit breaker reset time         | 1800000 (30min)  |

To modify these settings:

1. Edit the environment variables:

```bash
sudo systemctl edit network-monitor
```

2. Add your overrides in the following format:

```ini
[Service]
Environment=SPEEDTEST_INTERVAL=3600000
Environment=SPEEDTEST_VERBOSE=true
```

3. Restart the service:

```bash
sudo systemctl restart network-monitor
```

### Development

For development and testing:

```bash
# Run the monitor directly
bun run bin/monitor.ts

# Setup systemd service
bun run bin/setup.ts
```

## Database Schema

The SQLite database is stored in `~/.local/share/network-monitor/speedtest.db` (following XDG base directory specification) and contains a single table `speed_results` with the following schema:

| Column             | Type    | Description                              |
| ------------------ | ------- | ---------------------------------------- |
| id                 | INTEGER | Primary key                              |
| timestamp          | TEXT    | ISO 8601 timestamp                       |
| ping               | REAL    | Latency in milliseconds                  |
| download           | REAL    | Download speed in Mbps                   |
| upload             | REAL    | Upload speed in Mbps                     |
| network_ssid       | TEXT    | WiFi network SSID (if applicable)        |
| network_type       | TEXT    | Connection type (wifi/ethernet/cellular) |
| ip_address         | TEXT    | External IP address                      |
| server_id          | TEXT    | Speedtest server identifier              |
| server_location    | TEXT    | Server location (city, country)          |
| isp                | TEXT    | Internet Service Provider name           |
| latency_jitter     | REAL    | Jitter in milliseconds                   |
| packet_loss        | REAL    | Packet loss percentage                   |
| connection_quality | TEXT    | Overall quality rating                   |
| device_name        | TEXT    | System hostname                          |

## Project Structure

```plaintext
.
├── bin/
│   ├── monitor.ts               # Service entry point
│   └── setup.ts                 # Systemd setup script
├── src/
│   ├── services/
│   │   ├── speedtest.service.ts # Core speed test implementation
│   │   └── systemd.service.ts   # Systemd service management
│   ├── config.ts               # Configuration management
│   ├── database.ts             # Database operations
│   └── types.d.ts             # TypeScript type definitions
├── .env.example               # Environment variables template
├── package.json              # Project configuration
├── tsconfig.json            # TypeScript configuration
└── README.md               # Documentation
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
