# Systemd Service Manager API

A secure and efficient REST API for managing systemd services, built with Bun and Elysia.js.

## Features

- 🔒 JWT-based authentication
- 🚦 Systemd service management (start/stop/restart)
- 📊 Service status monitoring
- 📝 Operation logging
- 🔍 Service history tracking
- 🛡️ Secure system operations
- 📚 OpenAPI documentation

## Prerequisites

- Bun runtime (latest version)
- Linux system with systemd
- Sudo privileges for systemd operations

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd apps/server
```

2. Install dependencies:

```bash
bun install
```

3. Configure environment variables:

```bash
cp .env.example .env
```

Edit `.env` file with your configuration.

4. Setup the systemd service:

```bash
bunx @network-monitor/server setup-systemd
```

## Development

Start the development server:

```bash
bun run dev
```

The server will be available at `http://localhost:3000` by default.

## API Documentation

Once the server is running, visit `http://localhost:3000/swagger` for the OpenAPI documentation.

### Available Endpoints

- `GET /services` - List all systemd services
- `GET /services/:name` - Get service status
- `POST /services/:name/start` - Start a service
- `POST /services/:name/stop` - Stop a service
- `POST /services/:name/restart` - Restart a service
- `GET /services/:name/logs` - Get service operation logs

## Security

- All endpoints require JWT authentication
- System operations are logged with user tracking
- CORS is configured for specified origins only
- Error handling prevents sensitive information leakage

## Production Deployment

1. Build the application:

```bash
bun run build
```

2. Set production environment variables:

```bash
NODE_ENV=production
JWT_SECRET=<strong-secret-key>
ALLOWED_ORIGINS=<your-frontend-domain>
```

3. Run the server:

```bash
bun run start
```

## License

MIT
