# Speedtest Monitor

A lightweight internet speed test monitor that runs via CRON and stores results in SQLite.

## Features

- Runs speed tests using the official Ookla Speedtest CLI
- Stores results in SQLite database
- Designed to run via CRON at configurable intervals
- Minimal resource usage - runs once and exits
- TypeScript implementation using Bun runtime

## Prerequisites

1. Install Bun:
```bash
curl -fsSL https://bun.sh/install | bash
```

2. Install Ookla's Speedtest CLI:
```bash
# Add Ookla's repository
curl -s https://packagecloud.io/install/repositories/ookla/speedtest-cli/script.deb.sh | sudo bash

# Install the package
sudo apt install speedtest
```

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

With verbose output:
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

Example query to view all results:
```sql
SELECT 
  datetime(timestamp) as time,
  ping as ping_ms,
  download as download_mbps,
  upload as upload_mbps
FROM speed_results
ORDER BY timestamp DESC;
```

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
