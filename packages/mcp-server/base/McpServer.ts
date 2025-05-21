import { z } from 'zod';
import {
  McpError,
  McpServerConfig,
  MethodNotFoundError,
  PromptResponse,
  PromptTemplate,
  Resource,
  ResourceNotFoundError,
  ResourceResponse,
  Tool,
  ToolResponse,
  Transport,
} from '../types';
import { SessionManager } from '../utils/session';
import { serverConfigSchema, validateParams } from '../utils/validation';

export class McpServer {
  private tools: Map<string, Tool>;
  private resources: Map<string, Resource>;
  private prompts: Map<string, PromptTemplate>;
  private sessionManager: SessionManager;
  private transport?: Transport;
  private readonly config: McpServerConfig;

  constructor(config: McpServerConfig) {
    this.config = serverConfigSchema.parse(config);
    this.tools = new Map();
    this.resources = new Map();
    this.prompts = new Map();
    this.sessionManager = new SessionManager();
  }

  /**
   * Registers a tool with the server
   */
  tool(
    name: string,
    parameters: z.ZodSchema,
    handler: (params: any) => Promise<ToolResponse>
  ): void {
    if (this.tools.has(name)) {
      throw new McpError(`Tool '${name}' is already registered`);
    }

    this.tools.set(name, {
      name,
      description: parameters.description || '',
      parameters,
      handler,
    });
  }

  /**
   * Registers a resource with the server
   */
  resource(
    name: string,
    uri: string,
    handler: (uri: URL) => Promise<ResourceResponse>
  ): void {
    if (this.resources.has(uri)) {
      throw new McpError(`Resource '${uri}' is already registered`);
    }

    this.resources.set(uri, {
      uri,
      handler,
    });
  }

  /**
   * Registers a prompt template with the server
   */
  prompt(
    name: string,
    parameters: z.ZodSchema,
    handler: (params: any) => Promise<PromptResponse>
  ): void {
    if (this.prompts.has(name)) {
      throw new McpError(`Prompt '${name}' is already registered`);
    }

    this.prompts.set(name, {
      name,
      parameters,
      handler,
    });
  }

  /**
   * Gets all registered tools
   */
  getTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Gets all registered resources
   */
  getResources(): Resource[] {
    return Array.from(this.resources.values());
  }

  /**
   * Gets all registered prompt templates
   */
  getPrompts(): PromptTemplate[] {
    return Array.from(this.prompts.values());
  }

  /**
   * Executes a tool by name
   */
  async executeTool(name: string, params: any): Promise<ToolResponse> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new MethodNotFoundError(`Tool '${name}' not found`);
    }

    const validatedParams = await validateParams(tool.parameters, params);
    return tool.handler(validatedParams);
  }

  /**
   * Retrieves a resource by URI
   */
  async getResource(uri: string): Promise<ResourceResponse> {
    const resource = this.resources.get(uri);
    if (!resource) {
      throw new ResourceNotFoundError(`Resource '${uri}' not found`);
    }

    return resource.handler(new URL(uri));
  }

  /**
   * Executes a prompt template by name
   */
  async executePrompt(name: string, params: any): Promise<PromptResponse> {
    const prompt = this.prompts.get(name);
    if (!prompt) {
      throw new MethodNotFoundError(`Prompt '${name}' not found`);
    }

    const validatedParams = await validateParams(prompt.parameters, params);
    return prompt.handler(validatedParams);
  }

  /**
   * Connects a transport to the server
   */
  async connect(transport: Transport): Promise<void> {
    if (this.transport) {
      throw new McpError('Server is already connected to a transport');
    }

    this.transport = transport;
    await transport.connect(this);
  }

  /**
   * Disconnects the current transport
   */
  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.disconnect();
      this.transport = undefined;
    }
  }

  /**
   * Gets the session manager instance
   */
  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  /**
   * Gets the server configuration
   */
  getConfig(): McpServerConfig {
    return this.config;
  }

  /**
   * Checks if the server is connected to a transport
   */
  isConnected(): boolean {
    return this.transport?.isConnected() || false;
  }

  /**
   * Gets the current transport's session ID if available
   */
  getCurrentSessionId(): string | undefined {
    return this.transport?.getSessionId();
  }
}
