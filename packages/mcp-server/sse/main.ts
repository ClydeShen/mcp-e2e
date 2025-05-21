import { z } from 'zod';
import { McpServer } from '../base/McpServer';
import { SseTransport } from './SseTransport';

async function startServer() {
  const server = new McpServer({
    name: 'mcp-sse-server',
    version: '1.0.0',
  });

  // Example: Register a simple tool
  server.tool(
    'echo-sse',
    z.object({ message: z.string() }),
    async ({ message }) => ({
      content: [{ type: 'text', text: `SSE Echo: ${message}` }],
    })
  );

  const port = process.env.SSE_PORT ? parseInt(process.env.SSE_PORT, 10) : 3001;
  const transport = new SseTransport({ port }); // Ensure SseTransportConfig aligns
  await server.connect(transport);
  // SseTransport already logs its listening status.
}

startServer().catch((error) => {
  console.error('Failed to start SSE server:', error);
  process.exit(1);
});
