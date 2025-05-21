import fs from 'fs';
import path from 'path';
import type { LLMConfig } from './mcp-config.schema';
import { AppConfigSchema } from './mcp-config.schema';

// --- Configuration Types ---

// Config for providers OTHER than stdio (they have direct props)
// interface BaseProviderSpecificConfig {} // Removed

// export interface StdioConfig { // Removed
//   // This type might become obsolete or represent direct props
//   command: string; // Executable
//   args?: string[];
//   cwd?: string;
//   env?: Record<string, string>;
// }

export interface SseConfig {
  // Removed extension
  url: string;
  withCredentials?: boolean;
}

export interface WebSocketConfig {
  // Removed extension
  url: string;
  protocols?: string[];
}

export interface HttpConfig {
  // Removed extension
  url: string;
  method: string; // e.g., "GET", "POST"
  headers?: Record<string, string>;
}

export type ProviderType = 'stdio' | 'sse' | 'websocket' | 'http';

// Base properties common to all provider objects (the value in the mcpProviders map)
interface McpProviderBase {
  name: string;
  description?: string;
  capabilities?: string[];
  enabled?: boolean;
}

// Specific provider type configurations
export interface McpStdioProvider extends McpProviderBase {
  id: string;
  type: 'stdio';
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
}

export interface McpHtttpProvider extends McpProviderBase {
  id: string;
  type: 'http';
  config: HttpConfig;
}

export interface McpSseProvider extends McpProviderBase {
  id: string;
  type: 'sse';
  config: SseConfig;
}

export interface McpWebSocketProvider extends McpProviderBase {
  id: string;
  type: 'websocket';
  config: WebSocketConfig;
}

export type McpProviderConfig =
  | McpStdioProvider
  | McpHtttpProvider
  | McpSseProvider
  | McpWebSocketProvider;

export interface AppConfig {
  llm?: LLMConfig; // Optional global LLM config as per TR_CONFIG_008
  mcpProviders: Record<string, McpProviderConfig>; // Changed from Omit<McpProviderConfig, 'id'>
  // Optional root fields as per TR_CONFIG_002
  $schema?: string;
  version?: string;
}

// --- Configuration Loader ---

let loadedConfig: AppConfig | null = null;
const projectRoot = process.cwd(); // This is typically packages/mcp-client/
const configFilePath = path.join(projectRoot, 'mcp.config.json');

/**
 * Loads, parses, and validates the mcp.config.json file using Zod schemas.
 * This function is intended for server-side use in a Next.js application.
 * @returns The parsed and validated AppConfig object.
 * @throws Error if the config file cannot be read, parsed, or fails validation.
 */
export function getMcpConfig(): AppConfig {
  if (loadedConfig) {
    return loadedConfig;
  }

  try {
    if (!fs.existsSync(configFilePath)) {
      throw new Error(
        `mcp.config.json not found at ${configFilePath}. Please ensure the file exists.`
      );
    }

    const fileContents = fs.readFileSync(configFilePath, 'utf-8');
    const parsedJson = JSON.parse(fileContents);

    // Validate the config using Zod schema
    const validationResult = AppConfigSchema.safeParse(parsedJson);

    if (!validationResult.success) {
      throw new Error(
        `Invalid mcp.config.json: ${validationResult.error.message}`
      );
    }

    loadedConfig = validationResult.data;
    return loadedConfig;
  } catch (error: any) {
    console.error(
      '[McpClientConfig:getMcpConfig] ERROR: Failed to load or validate mcp.config.json | Message: %s',
      error.message
    );
    throw new Error(
      `Failed to load mcp.config.json from ${configFilePath}: ${error.message}`
    );
  }
}

/**
 * Utility function to get a specific MCP provider configuration by its ID.
 * @param providerId The ID of the provider to find.
 * @returns The McpProviderConfig if found, otherwise undefined.
 */
export function getMcpProviderById(
  providerId: string
): McpProviderConfig | undefined {
  const config = getMcpConfig();
  return config.mcpProviders[providerId];
}

/**
 * Utility function to get the LLM configuration.
 * @returns The LLMConfig if defined, otherwise undefined.
 */
export function getLLMConfig(): LLMConfig | undefined {
  const config = getMcpConfig();
  return config.llm;
}

// Example of how this might be used server-side:
// server-side-file.ts
// import { getMcpConfig, getMcpProviderById } from './mcp-client-config';
// try {
//   const fullConfig = getMcpConfig();
//   console.log('LLM Config:', fullConfig.llm);
//   const stdioProvider = getMcpProviderById('example-stdio-echo');
//   if (stdioProvider) {
//     console.log('Stdio Provider Command:', (stdioProvider.config as StdioConfig).command);
//   }
// } catch (e) {
//   console.error(e);
// }

// For the example, if it was to be kept and stdioProvider was of type McpStdioProvider,
// it would be stdioProvider.command directly.
