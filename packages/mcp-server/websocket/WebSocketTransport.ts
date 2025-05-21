import { WebSocketServer, WebSocket } from 'ws';
import { McpServer } from '../base/McpServer';
import { Transport, JsonRpcRequest, JsonRpcResponse } from '../types';
import { validateParams, jsonRpcRequestSchema } from '../utils/validation';
import { SessionManager } from '../utils/session';

export interface WebSocketTransportConfig {
  port?: number;
  host?: string;
  path?: string;
}

export class WebSocketTransport implements Transport {
  private wss?: WebSocketServer;
  private mcpServer?: McpServer;
  private sessionManager: SessionManager;
  private readonly config: Required<WebSocketTransportConfig>;
  private clients: Map<WebSocket, string>;

  constructor(config: WebSocketTransportConfig = {}) {
    this.config = {
      port: config.port || 3000,
      host: config.host || 'localhost',
      path: config.path || '/ws',
    };
    this.sessionManager = new SessionManager();
    this.clients = new Map();
  }

  async connect(server: McpServer): Promise<void> {
    this.mcpServer = server;

    this.wss = new WebSocketServer({
      port: this.config.port,
      host: this.config.host,
      path: this.config.path,
    });

    this.wss.on('connection', (ws: WebSocket) => {
      const session = this.sessionManager.createSession();
      this.clients.set(ws, session.id);

      // Send session ID to client
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        method: 'mcp_session',
        params: { sessionId: session.id },
      }));

      ws.on('message', async (data: string) => {
        try {
          const request = await validateParams(jsonRpcRequestSchema, JSON.parse(data));
          const response = await this.handleRequest(request, session.id);
          ws.send(JSON.stringify(response));
        } catch (error: any) {
          const errorResponse: JsonRpcResponse = {
            jsonrpc: '2.0',
            error: {
              code: error.code || -32000,
              message: error.message || 'Internal error',
              data: error.data,
            },
            id: JSON.parse(data)?.id,
          };
          ws.send(JSON.stringify(errorResponse));
        }
      });

      ws.on('close', () => {
        const sessionId = this.clients.get(ws);
        if (sessionId) {
          this.sessionManager.deleteSession(sessionId);
          this.clients.delete(ws);
        }
      });

      // Keep connection alive with ping/pong
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      }, 30000);

      ws.on('close', () => {
        clearInterval(pingInterval);
      });
    });

    this.wss.on('error', (error: Error) => {
      console.error('WebSocket server error:', error);
    });

    return new Promise((resolve) => {
      this.wss!.on('listening', () => {
        console.log(`WebSocket transport listening on ws://${this.config.host}:${this.config.port}${this.config.path}`);
        resolve();
      });
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.wss) {
        this.wss.close((error?: Error) => {
          if (error) {
            reject(error);
          } else {
            this.wss = undefined;
            this.clients.clear();
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  isConnected(): boolean {
    return !!this.wss;
  }

  getSessionId(): string | undefined {
    return undefined; // Session ID is managed per connection
  }

  private async handleRequest(request: JsonRpcRequest, sessionId: string): Promise<JsonRpcResponse> {
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

  /**
   * Broadcasts a message to all connected clients
   */
  broadcast(method: string, params: any): void {
    if (!this.wss) {
      return;
    }

    const message = JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
    });

    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  /**
   * Sends a message to a specific client by session ID
   */
  sendToSession(sessionId: string, method: string, params: any): boolean {
    for (const [ws, sid] of this.clients.entries()) {
      if (sid === sessionId && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          method,
          params,
        }));
        return true;
      }
    }
    return false;
  }
} 