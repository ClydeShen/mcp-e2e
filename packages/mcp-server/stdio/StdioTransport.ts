import { McpServer } from '../base/McpServer';
import { JsonRpcRequest, JsonRpcResponse, Transport } from '../types';
import { jsonRpcRequestSchema, validateParams } from '../utils/validation';

export class StdioTransport implements Transport {
  private mcpServer?: McpServer;
  private isRunning: boolean = false;

  async connect(server: McpServer): Promise<void> {
    this.mcpServer = server;
    this.isRunning = true;

    // Handle input from stdin
    process.stdin.on('data', async (chunk: Buffer) => {
      const dataStr = chunk.toString().trim();
      if (!dataStr) return;

      // Handle multiple JSON objects if they are sent in a single chunk
      const jsonLines = dataStr
        .split('\\n')
        .filter((line) => line.trim() !== '');

      for (const line of jsonLines) {
        try {
          const request = await validateParams(
            jsonRpcRequestSchema,
            JSON.parse(line)
          );
          const response = await this.handleRequest(request);
          this.sendResponse(response);
        } catch (error: any) {
          this.sendError(
            error.message || 'Internal error',
            error.code || -32000,
            error.data
          );
        }
      }
    });

    // Handle process termination
    process.on('SIGINT', () => {
      this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.disconnect();
      process.exit(0);
    });

    // Send initial ready message
    this.sendResponse({
      jsonrpc: '2.0',
      result: { status: 'ready' },
    });
  }

  async disconnect(): Promise<void> {
    this.isRunning = false;
  }

  isConnected(): boolean {
    return this.isRunning;
  }

  getSessionId(): string | undefined {
    return undefined; // STDIO transport is stateless
  }

  private async handleRequest(
    request: JsonRpcRequest
  ): Promise<JsonRpcResponse> {
    if (!this.mcpServer) {
      throw new Error('Transport not connected to a server');
    }

    try {
      let result;
      switch (request.method) {
        case 'mcp_toolDiscovery':
          result = this.mcpServer.getTools();
          break;
        case 'mcp_resourceDiscovery':
          result = this.mcpServer.getResources();
          break;
        case 'mcp_promptDiscovery':
          result = this.mcpServer.getPrompts();
          break;
        default:
          // Handle tool execution
          if (request.method.startsWith('tool_')) {
            const toolName = request.method.substring(5);
            result = await this.mcpServer.executeTool(toolName, request.params);
          }
          // Handle resource retrieval
          else if (request.method.startsWith('resource_')) {
            const resourceUri = request.method.substring(9);
            result = await this.mcpServer.getResource(resourceUri);
          }
          // Handle prompt execution
          else if (request.method.startsWith('prompt_')) {
            const promptName = request.method.substring(7);
            result = await this.mcpServer.executePrompt(
              promptName,
              request.params
            );
          } else {
            throw new Error(`Unknown method: ${request.method}`);
          }
      }

      return {
        jsonrpc: '2.0',
        result,
        id: request.id,
      };
    } catch (error: any) {
      throw {
        code: error.code || -32000,
        message: error.message || 'Internal error',
        data: error.data,
      };
    }
  }

  private sendResponse(response: JsonRpcResponse): void {
    process.stdout.write(JSON.stringify(response) + '\\n');
  }

  private sendError(message: string, code: number = -32000, data?: any): void {
    const errorResponse: JsonRpcResponse = {
      jsonrpc: '2.0',
      error: {
        code,
        message,
        data,
      },
    };
    this.sendResponse(errorResponse);
  }
}
