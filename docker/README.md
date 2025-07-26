# Docker Setup for Qixin MCP Server (SSE Mode)

## Quick Start

1. Copy the example environment file and add your credentials:
   ```bash
   cp .env.example .env
   # Edit .env and add your QIXIN_APP_KEY and QIXIN_SECRET_KEY
   ```

2. Build and run with docker-compose:
   ```bash
   docker-compose up -d
   ```

3. Check the logs:
   ```bash
   docker-compose logs -f
   ```

4. Test the SSE endpoint:
   ```bash
   curl http://localhost:3000/health
   ```

## Available Endpoints

- `GET /mcp` - SSE connection endpoint
- `POST /mcp` - Send JSON-RPC messages
- `GET /health` - Health check
- `GET /` - Server information

## Stopping the Server

```bash
docker-compose down
```

## Building Without Cache

```bash
docker-compose build --no-cache
docker-compose up -d
```