import { z } from 'zod';

// Server configuration
export interface McpServerConfig {
  name: string;
  version: string;
  baseUrl?: URL;
  serviceDocumentationUrl?: URL;
}

// Tool definition
export interface Tool {
  name: string;
  description: string;
  parameters: z.ZodSchema;
  handler: (params: any) => Promise<ToolResponse>;
}

// Resource definition
export interface Resource {
  uri: string;
  handler: (uri: URL) => Promise<ResourceResponse>;
}

// Prompt template definition
export interface PromptTemplate {
  name: string;
  parameters: z.ZodSchema;
  handler: (params: any) => Promise<PromptResponse>;
}

// Response types
export interface ToolResponse {
  content: Array<ContentBlock>;
  metadata?: Record<string, any>;
}

export interface ResourceResponse {
  contents: Array<ResourceContent>;
  metadata?: Record<string, any>;
}

export interface PromptResponse {
  messages: Array<Message>;
  metadata?: Record<string, any>;
}

// Content types
export interface ContentBlock {
  type: 'text' | 'json' | 'binary';
  text?: string;
  json?: any;
  binary?: Buffer;
  mimeType?: string;
}

export interface ResourceContent {
  uri: string;
  text?: string;
  binary?: Buffer;
  mimeType?: string;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: ContentBlock;
}

// Session management
export interface Session {
  id: string;
  createdAt: Date;
  lastAccessedAt: Date;
  metadata?: Record<string, any>;
}

// Transport interface
export interface Transport {
  connect(server: any): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getSessionId(): string | undefined;
}

// Error types
export class McpError extends Error {
  constructor(
    message: string,
    public code: number = -32000,
    public data?: any
  ) {
    super(message);
    this.name = 'McpError';
  }
}

export class ValidationError extends McpError {
  constructor(message: string, data?: any) {
    super(message, -32602, data);
    this.name = 'ValidationError';
  }
}

export class ResourceNotFoundError extends McpError {
  constructor(message: string) {
    super(message, -32601);
    this.name = 'ResourceNotFoundError';
  }
}

export class MethodNotFoundError extends McpError {
  constructor(message: string) {
    super(message, -32601);
    this.name = 'MethodNotFoundError';
  }
}

// Request/Response types for JSON-RPC
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id?: string | number;
}

export interface JsonRpcSuccessResponse {
  jsonrpc: '2.0';
  result: any;
  id?: string | number;
}

export interface JsonRpcErrorResponse {
  jsonrpc: '2.0';
  error: {
    code: number;
    message: string;
    data?: any;
  };
  id?: string | number;
}

export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;
