import express, { Express, Request, Response } from 'express';
import { McpServer } from '../base/McpServer';
import { JsonRpcRequest, JsonRpcResponse, Transport } from '../types';
import { SessionManager } from '../utils/session';
import { jsonRpcRequestSchema, validateParams } from '../utils/validation';

export interface SseTransportConfig {
  port?: number;
  host?: string;
  path?: string;
  messagePath?: string;
}

export class SseTransport implements Transport {
  private server?: Express;
  private httpServer?: any;
  private mcpServer?: McpServer;
  private sessionManager: SessionManager;
  private readonly config: Required<SseTransportConfig>;

  constructor(config: SseTransportConfig = {}) {
    this.config = {
      port: config.port || 3000,
      host: config.host || 'localhost',
      path: config.path || '/sse',
      messagePath: config.messagePath || '/messages',
    };
    this.sessionManager = new SessionManager();
  }

  async connect(server: McpServer): Promise<void> {
    this.mcpServer = server;
    this.server = express();
    this.server.use(express.json());

    // SSE connection endpoint
    this.server.get(this.config.path, (req: Request, res: Response) => {
      const session = this.sessionManager.createSession();

      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      // Send session ID
      res.write(`data: ${JSON.stringify({ sessionId: session.id })}\\n\\n`);

      // Handle client disconnect
      req.on('close', () => {
        this.sessionManager.deleteSession(session.id);
      });

      // Keep connection alive
      const keepAlive = setInterval(() => {
        res.write(':\\n\\n'); // SSE comment for keep-alive
      }, 30000);

      // Clean up on client disconnect
      req.on('close', () => {
        clearInterval(keepAlive);
      });
    });

    // Message handling endpoint
    this.server.post(
      this.config.messagePath,
      async (req: Request, res: Response) => {
        const sessionId = req.query.sessionId as string;
        if (!sessionId) {
          res.status(400).json({ error: 'Session ID is required' });
          return;
        }

        const session = this.sessionManager.getSession(sessionId);
        if (!session) {
          res.status(404).json({ error: 'Session not found' });
          return;
        }

        try {
          const request = await validateParams(jsonRpcRequestSchema, req.body);
          const response = await this.handleRequest(request, sessionId);
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
      }
    );

    // Health check endpoint
    this.server.get('/health', (_req: Request, res: Response) => {
      res.json({ status: 'ok' });
    });

    // Start the server
    return new Promise((resolve, reject) => {
      try {
        this.httpServer = this.server!.listen(
          this.config.port,
          this.config.host,
          () => {
            console.log(
              `SSE transport listening on http://${this.config.host}:${this.config.port}${this.config.path}`
            );
            resolve();
          }
        );
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
    return undefined; // Session ID is managed per connection
  }

  private async handleRequest(
    request: JsonRpcRequest,
    sessionId: string
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

      // Update session metadata with last activity
      this.sessionManager.updateSession(sessionId, {
        lastMethod: request.method,
        lastRequestTime: new Date().toISOString(),
      });

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
