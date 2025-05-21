import express, { Express, Request, Response } from 'express';
import { McpServer } from '../base/McpServer';
import { Transport, JsonRpcRequest, JsonRpcResponse } from '../types';
import { validateParams, jsonRpcRequestSchema } from '../utils/validation';

export interface HttpTransportConfig {
  port?: number;
  host?: string;
  path?: string;
}

export class HttpTransport implements Transport {
  private server?: Express;
  private httpServer?: any;
  private mcpServer?: McpServer;
  private readonly config: Required<HttpTransportConfig>;

  constructor(config: HttpTransportConfig = {}) {
    this.config = {
      port: config.port || 3000,
      host: config.host || 'localhost',
      path: config.path || '/mcp',
    };
  }

  async connect(server: McpServer): Promise<void> {
    this.mcpServer = server;
    this.server = express();
    this.server.use(express.json());

    // Handle JSON-RPC requests
    this.server.post(this.config.path, async (req: Request, res: Response) => {
      try {
        const request = await validateParams(jsonRpcRequestSchema, req.body);
        const response = await this.handleRequest(request);
        res.json(response);
      } catch (error: any) {
        const errorResponse: JsonRpcResponse = {
          jsonrpc: '2.0',
          error: {
            code: error.code || -32000,
            message: error.message || 'Internal error',
            data: error.data,
          },
          id: req.body?.id,
        };
        res.status(error.code === -32600 ? 400 : 500).json(errorResponse);
      }
    });

    // Health check endpoint
    this.server.get('/health', (_req: Request, res: Response) => {
      res.json({ status: 'ok' });
    });

    // Start the server
    return new Promise((resolve, reject) => {
      try {
        this.httpServer = this.server!.listen(this.config.port, this.config.host, () => {
          console.log(`HTTP transport listening on http://${this.config.host}:${this.config.port}${this.config.path}`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.httpServer) {
        this.httpServer.close((error: Error) => {
          if (error) {
            reject(error);
          } else {
            this.httpServer = undefined;
            this.server = undefined;
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  isConnected(): boolean {
    return !!this.server && !!this.httpServer;
  }

  getSessionId(): string | undefined {
    return undefined; // HTTP transport is stateless
  }

  private async handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
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
            result = await this.mcpServer.executePrompt(promptName, request.params);
          }
          else {
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
} 