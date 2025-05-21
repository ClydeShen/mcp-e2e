# MCP Server

A TypeScript implementation of the Model Context Protocol (MCP) server with multiple transport options.

## Features

- Multiple transport options:
  - HTTP (RESTful API)
  - SSE (Server-Sent Events)
  - WebSocket
  - STDIO (Command Line Interface)
- Session management
- Tool registration and discovery
- Resource management
- Prompt templates
- JSON-RPC 2.0 compliant
- TypeScript support with full type definitions

## Installation

```bash
npm install @mcp/server
```

## Usage

### Basic Server Setup

```typescript
import { McpServer, HttpTransport } from '@mcp/server';

// Create a new server instance
const server = new McpServer({
  name: 'my-mcp-server',
  version: '1.0.0',
});

// Register a tool
server.tool(
  'echo',
  z.object({
    message: z.string(),
  }),
  async ({ message }) => ({
    content: [{ type: 'text', text: message }],
  })
);

// Create and connect a transport
const transport = new HttpTransport({
  port: 3000,
  host: 'localhost',
  path: '/mcp',
});

await server.connect(transport);
```

### Using Different Transports

#### HTTP Transport

```typescript
import { HttpTransport } from '@mcp/server';

const transport = new HttpTransport({
  port: 3000,
  host: 'localhost',
  path: '/mcp',
});
```

#### SSE Transport

```typescript
import { SseTransport } from '@mcp/server';

const transport = new SseTransport({
  port: 3000,
  host: 'localhost',
  path: '/sse',
  messagePath: '/messages',
});
```

#### WebSocket Transport

```typescript
import { WebSocketTransport } from '@mcp/server';

const transport = new WebSocketTransport({
  port: 3000,
  host: 'localhost',
  path: '/ws',
});
```

#### STDIO Transport

```typescript
import { StdioTransport } from '@mcp/server';

const transport = new StdioTransport();
```

### Registering Tools

```typescript
import { z } from 'zod';

server.tool(
  'calculate',
  z.object({
    a: z.number(),
    b: z.number(),
  }),
  async ({ a, b }) => ({
    content: [{ type: 'text', text: String(a + b) }],
  })
);
```

### Registering Resources

```typescript
server.resource('config', 'config://app', async (uri) => ({
  contents: [
    {
      uri: uri.href,
      text: JSON.stringify({ version: '1.0.0' }),
    },
  ],
}));
```

### Using Prompt Templates

```typescript
server.prompt(
  'greet',
  z.object({
    name: z.string(),
  }),
  async ({ name }) => ({
    messages: [
      {
        role: 'assistant',
        content: { type: 'text', text: `Hello, ${name}!` },
      },
    ],
  })
);
```

### Session Management

```typescript
import { SessionManager } from '@mcp/server';

const sessionManager = new SessionManager({
  cleanupInterval: 5 * 60 * 1000, // 5 minutes
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
});

// Create a session
const session = sessionManager.createSession();

// Update session metadata
sessionManager.updateSession(session.id, {
  lastActivity: new Date(),
});

// Get session by ID
const existingSession = sessionManager.getSession(session.id);

// Delete session
sessionManager.deleteSession(session.id);
```

## Development

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Run tests
npm test

# Run linting
npm run lint

# Watch mode during development
npm run dev
```

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
