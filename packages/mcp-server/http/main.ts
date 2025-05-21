import { z } from 'zod';
import { McpServer } from '../base/McpServer';
import { HttpTransport } from './HttpTransport';

async function startServer() {
  const server = new McpServer({
    name: 'mcp-http-server',
    version: '1.0.0',
  });

  // Example: Register a simple tool
  server.tool(
    'echo-http',
    z.object({ message: z.string() }),
    async ({ message }) => ({
      content: [{ type: 'text', text: `HTTP Echo: ${message}` }],
    })
  );

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const transport = new HttpTransport({ port });
  await server.connect(transport);
  // HttpTransport already logs its listening status, so no extra log here unless desired.
}

startServer().catch((error) => {
  console.error('Failed to start HTTP server:', error);
  process.exit(1);
});
