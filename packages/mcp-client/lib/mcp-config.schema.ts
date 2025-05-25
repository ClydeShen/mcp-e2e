import { z } from 'zod';

// Base configurations for different provider types
export const SseConfigSchema = z.object({
  url: z.string().url(),
  withCredentials: z.boolean().optional(),
});

export const WebSocketConfigSchema = z.object({
  url: z.string().url(),
  protocols: z.array(z.string()).optional(),
});

export const HttpConfigSchema = z.object({
  url: z.string().url(),
  method: z.string(),
  headers: z.record(z.string()).optional(),
});

// Base provider properties
const McpProviderBaseSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  disabled: z.boolean().optional(),
});

// Provider-specific schemas
export const McpStdioProviderSchema = McpProviderBaseSchema.extend({
  id: z.string(),
  type: z.literal('stdio'),
  command: z.string(),
  args: z.array(z.string()).optional(),
  cwd: z.string().optional(),
  env: z.record(z.string()).optional(),
});

export const McpHttpProviderSchema = McpProviderBaseSchema.extend({
  id: z.string(),
  type: z.literal('http'),
  config: HttpConfigSchema,
});

export const McpSseProviderSchema = McpProviderBaseSchema.extend({
  id: z.string(),
  type: z.literal('sse'),
  config: SseConfigSchema,
});

export const McpWebSocketProviderSchema = McpProviderBaseSchema.extend({
  id: z.string(),
  type: z.literal('websocket'),
  config: WebSocketConfigSchema,
});

// Combined provider schema
export const McpProviderConfigSchema = z.discriminatedUnion('type', [
  McpStdioProviderSchema,
  McpHttpProviderSchema,
  McpSseProviderSchema,
  McpWebSocketProviderSchema,
]);

// LLM configuration schema
export const LLMConfigSchema = z.object({
  provider: z.string(),
  model: z.string(),
  defaultSystemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().positive().optional(),
  maxSteps: z.number().positive().optional(),
});

// Complete app configuration schema
export const AppConfigSchema = z.object({
  llm: LLMConfigSchema.optional(),
  mcpProviders: z.record(McpProviderConfigSchema),
  $schema: z.string().optional(),
  version: z.string().optional(),
});

// Export types using z.infer
export type SseConfig = z.infer<typeof SseConfigSchema>;
export type WebSocketConfig = z.infer<typeof WebSocketConfigSchema>;
export type HttpConfig = z.infer<typeof HttpConfigSchema>;
export type McpProviderBase = z.infer<typeof McpProviderBaseSchema>;
export type McpStdioProvider = z.infer<typeof McpStdioProviderSchema>;
export type McpHttpProvider = z.infer<typeof McpHttpProviderSchema>;
export type McpSseProvider = z.infer<typeof McpSseProviderSchema>;
export type McpWebSocketProvider = z.infer<typeof McpWebSocketProviderSchema>;
export type McpProviderConfig = z.infer<typeof McpProviderConfigSchema>;
export type LLMConfig = z.infer<typeof LLMConfigSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;
