import fs from 'fs';
import path from 'path';

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

export interface LLMConfig {
  provider: string; // e.g., "bedrock", "openai"
  model: string;
  defaultSystemPrompt?: string; // Optional as per TR_CONFIG_008 & our simplification
  temperature?: number; // Optional as per TR_CONFIG_008 & our simplification
  maxTokens?: number; // Added max_tokens
  maxSteps?: number; // Added maxSteps
  // API keys/credentials MUST be handled server-side and not stored here.
}

export interface AppConfig {
  llm?: LLMConfig; // Optional global LLM config as per TR_CONFIG_008
  mcpProviders: Record<string, McpProviderConfig>; // Changed from Omit<McpProviderConfig, 'id'>
  // Optional root fields as per TR_CONFIG_002
  $schema?: string;
  version?: string;
}

// --- Configuration Loader ---

let loadedConfig: AppConfig | null = null;
// Construct configFilePath at the module level for clarity
// Assumes mcp.config.json is in the root of the mcp-client package when Next.js server runs.
const projectRoot = process.cwd(); // This is typically packages/mcp-client/
const configFilePath = path.join(projectRoot, 'mcp.config.json');

/**
 * Loads, parses, and caches the mcp.config.json file.
 * This function is intended for server-side use in a Next.js application.
 * @returns The parsed AppConfig object.
 * @throws Error if the config file cannot be read or parsed.
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
    const parsedJson = JSON.parse(fileContents) as Partial<AppConfig>;

    if (
      !parsedJson.mcpProviders ||
      typeof parsedJson.mcpProviders !== 'object'
    ) {
      throw new Error(
        'Invalid mcp.config.json: mcpProviders is missing or not an object.'
      );
    }

    const validatedProviders: Record<string, McpProviderConfig> = {};

    for (const providerId in parsedJson.mcpProviders) {
      if (
        Object.prototype.hasOwnProperty.call(
          parsedJson.mcpProviders,
          providerId
        )
      ) {
        const providerRaw = parsedJson.mcpProviders[providerId] as any;

        if (!providerRaw.name) {
          throw new Error(
            `Provider "${providerId}" is missing required field: name.`
          );
        }

        let effectiveType = providerRaw.type as ProviderType | undefined;
        if (
          !effectiveType &&
          providerRaw.command &&
          typeof providerRaw.command === 'string'
        ) {
          effectiveType = 'stdio';
        }

        if (!effectiveType) {
          throw new Error(
            `Provider "${providerId}" is missing type or cannot be inferred as stdio.`
          );
        }

        const commonData = {
          name: providerRaw.name,
          description: providerRaw.description,
          capabilities: providerRaw.capabilities,
          enabled:
            providerRaw.enabled !== undefined ? providerRaw.enabled : true,
        };

        switch (effectiveType) {
          case 'stdio':
            if (
              !providerRaw.command ||
              typeof providerRaw.command !== 'string'
            ) {
              throw new Error(
                `Invalid stdio provider "${providerId}": command (string) missing.`
              );
            }
            validatedProviders[providerId] = {
              id: providerId,
              ...commonData,
              type: 'stdio',
              command: providerRaw.command,
              args: providerRaw.args || [],
              cwd: providerRaw.cwd,
              env: providerRaw.env,
            } as McpStdioProvider;
            break;
          case 'http':
            if (
              !providerRaw.config ||
              typeof providerRaw.config !== 'object' ||
              !providerRaw.config.url ||
              !providerRaw.config.method
            ) {
              throw new Error(
                `Invalid http provider "${providerId}": config, config.url, or method missing.`
              );
            }
            validatedProviders[providerId] = {
              id: providerId,
              ...commonData,
              type: 'http',
              config: providerRaw.config as HttpConfig,
            } as McpHtttpProvider;
            break;
          case 'sse':
            if (
              !providerRaw.config ||
              typeof providerRaw.config !== 'object' ||
              !providerRaw.config.url
            ) {
              throw new Error(
                `Invalid sse provider "${providerId}": config or config.url missing.`
              );
            }
            validatedProviders[providerId] = {
              id: providerId,
              ...commonData,
              type: 'sse',
              config: providerRaw.config as SseConfig,
            } as McpSseProvider;
            break;
          case 'websocket':
            if (
              !providerRaw.config ||
              typeof providerRaw.config !== 'object' ||
              !providerRaw.config.url
            ) {
              throw new Error(
                `Invalid websocket provider "${providerId}": config or config.url missing.`
              );
            }
            validatedProviders[providerId] = {
              id: providerId,
              ...commonData,
              type: 'websocket',
              config: providerRaw.config as WebSocketConfig,
            } as McpWebSocketProvider;
            break;
          default:
            throw new Error(
              `Unknown provider type "${effectiveType}" for "${providerId}".`
            );
        }
      }
    }
    loadedConfig = {
      llm: parsedJson.llm,
      mcpProviders: validatedProviders,
      $schema: parsedJson.$schema,
      version: parsedJson.version,
    };

    return loadedConfig;
  } catch (error: any) {
    console.error(
      '[ERROR] Failed to load or parse mcp.config.json:',
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
