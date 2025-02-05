# Speedtest Monitor

A lightweight internet speed test monitor that runs via CRON and stores results in SQLite.

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
- Designed to run via CRON at configurable intervals
- Minimal resource usage - runs once and exits
- TypeScript implementation using Bun runtime
- Detailed verbose logging option

## Prerequisites

You'll only need two dependencies:

1. [Bun](https://bun.sh/docs/installation)
2. [Ookla's Speedtest CLI](https://www.speedtest.net/apps/cli)

## Installation

1. Clone this repository:

```bash
git clone https://github.com/yourusername/speedtest-monitor.git
cd speedtest-monitor
```

2. Install dependencies:

```bash
bun install
```

## Usage

### Manual Execution

Run a single speed test:

```bash
bun run src/index.ts
```

With verbose output (includes detailed metrics):

```bash
bun run src/index.ts --verbose
```

### Setting up CRON

1. Open your crontab for editing:

```bash
crontab -e
```

2. Add an entry to run the speed test at your desired interval. For example, to run every 30 minutes:

```cron
*/30 * * * * cd /path/to/speedtest-monitor && /home/yourusername/.bun/bin/bun run src/index.ts
```

Replace `/path/to/speedtest-monitor` with the actual path to your installation.

Common cron intervals:
- Every 30 minutes: `*/30 * * * *`
- Every hour: `0 * * * *`
- Every 2 hours: `0 */2 * * *`
- Every day at midnight: `0 0 * * *`

### Viewing Results

The results are stored in `speedtest.db` in the project directory. You can query them using any SQLite client or the Bun SQLite API.

Example queries to view results:


#### Basic speed test results

```sql
SELECT 
  datetime(timestamp) as time,
  ping as ping_ms,
  download as download_mbps,
  upload as upload_mbps,
  connection_quality
FROM speed_results
ORDER BY timestamp DESC;
```

#### Network and server details

```sql
SELECT 
  datetime(timestamp) as time,
  network_type,
  network_ssid,
  isp,
  server_location,
  test_server_distance as server_distance_km
FROM speed_results
ORDER BY timestamp DESC;
```

#### Connection quality metrics

```sql
SELECT 
  datetime(timestamp) as time,
  ping as ping_ms,
  latency_jitter as jitter_ms,
  packet_loss as packet_loss_percent,
  connection_quality
FROM speed_results
ORDER BY timestamp DESC;
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
| test_server_distance | REAL | Distance to server in kilometers |

## Project Structure

- `src/index.ts` - Main application code
- `speedtest.db` - SQLite database (created on first run)
- `package.json` - Project configuration
- `tsconfig.json` - TypeScript configuration

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
