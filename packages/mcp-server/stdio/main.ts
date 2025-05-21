import { z } from 'zod';
import { McpServer } from '../base/McpServer';
import { StdioTransport } from './StdioTransport';

async function startServer() {
  const server = new McpServer({
    name: 'mcp-stdio-server',
    version: '1.0.0',
  });

  // Example: Register a simple tool
  server.tool(
    'echo-stdio',
    z.object({ message: z.string() }),
    async ({ message }) => ({
      content: [{ type: 'text', text: `STDIO Echo: ${message}` }],
    })
  );

  const transport = new StdioTransport();
  await server.connect(transport);
  // StdioTransport sends a 'ready' message, so no extra log here unless desired.
  console.log('MCP Server with STDIO transport connected and ready.');
}

startServer().catch((error) => {
  console.error('Failed to start STDIO server:', error);
  process.exit(1);
});
