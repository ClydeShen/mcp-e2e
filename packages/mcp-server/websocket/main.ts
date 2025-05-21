import { z } from 'zod';
import { McpServer } from '../base/McpServer';
import { WebSocketTransport } from './WebSocketTransport';

async function startServer() {
  const server = new McpServer({
    name: 'mcp-websocket-server',
    version: '1.0.0',
  });

  // Example: Register a simple tool
  server.tool(
    'echo-websocket',
    z.object({ message: z.string() }),
    async ({ message }) => ({
      content: [{ type: 'text', text: `WebSocket Echo: ${message}` }],
    })
  );

  const port = process.env.WS_PORT ? parseInt(process.env.WS_PORT, 10) : 3002;
  const transport = new WebSocketTransport({ port });
  await server.connect(transport);
  // WebSocketTransport already logs its listening status.
}

startServer().catch((error) => {
  console.error('Failed to start WebSocket server:', error);
  process.exit(1);
});
