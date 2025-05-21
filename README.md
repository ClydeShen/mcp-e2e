# MCP E2E (Model Context Protocol End-to-End)

A complete implementation of the Model Context Protocol (MCP) with both client and server components, supporting multiple transport methods.

## Features

- Multiple transport options:
  - HTTP (RESTful API)
  - SSE (Server-Sent Events)
  - WebSocket
  - STDIO (Command Line Interface)
- Modern TypeScript implementation
- Monorepo structure using pnpm workspaces
- Comprehensive test coverage
- Clean, maintainable code following SOLID principles

## Prerequisites

- Node.js >= 14.0.0
- pnpm >= 10.10.0

## Installation

    ```bash
# Install dependencies
pnpm install
```

## Development

The project uses pnpm workspaces to manage multiple packages. Here are the main commands:

### Global Commands

    ```bash
# Clean all packages
pnpm clean

# Build all packages
pnpm build

# Run all tests
pnpm test

# Run linting
pnpm lint

# Start development mode for all packages
pnpm dev

# Start production mode for all packages
pnpm start
```

### Client Commands

    ```bash
# Development mode
pnpm client.dev

# Build
pnpm client.build

# Production start
pnpm client.start

# Lint
pnpm client.lint
```

### Server Commands

The server supports multiple transport methods. You can run them individually or all at once.

#### All Servers

```bash
# Build all servers
pnpm server.build

# Development mode (all servers)
pnpm server.dev:all

# Production start (all servers)
pnpm server.start:all
```

#### Individual Servers

HTTP Server:

```bash
pnpm server.http.dev    # Development mode
pnpm server.http.start  # Production mode
```

SSE Server:

```bash
pnpm server.sse.dev     # Development mode
pnpm server.sse.start   # Production mode
```

WebSocket Server:

```bash
pnpm server.websocket.dev    # Development mode
pnpm server.websocket.start  # Production mode
```

STDIO Server:

```bash
pnpm server.stdio.dev    # Development mode
pnpm server.stdio.start  # Production mode
```

## Project Structure

```
mcp-e2e/
├── packages/
│   ├── mcp-client/     # Client implementation
│   └── mcp-server/     # Server implementation
│       ├── base/       # Core server functionality
│       ├── http/       # HTTP transport
│       ├── sse/        # SSE transport
│       ├── websocket/  # WebSocket transport
│       └── stdio/      # STDIO transport
└── README.md
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC
