import fs from 'fs';
import path from 'path';

// --- Configuration Types ---

export interface StdioConfig {
  command: string[];
  cwd?: string;
  env?: Record<string, string>;
}

export interface SseConfig {
  url: string;
  withCredentials?: boolean;
}

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
}

export interface HttpConfig {
  url: string;
  method: string; // e.g., "GET", "POST"
  headers?: Record<string, string>;
}

export type ProviderType = 'stdio' | 'sse' | 'websocket' | 'http';

export interface McpProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  // Data format handling (inputMode/outputMode) is an application-level concern
  // when using the SDK, not part of this config structure.
  config: StdioConfig | SseConfig | WebSocketConfig | HttpConfig;
  description?: string; // Optional as per TR_CONFIG_003
  capabilities?: string[]; // Optional as per TR_CONFIG_003
  enabled?: boolean; // Optional as per TR_CONFIG_003 (defaults to true)
}

export interface LLMConfig {
  provider: string; // e.g., "bedrock", "openai"
  model: string;
  defaultSystemPrompt?: string; // Optional as per TR_CONFIG_008 & our simplification
  temperature?: number; // Optional as per TR_CONFIG_008 & our simplification
  max_tokens?: number; // Added max_tokens
  // API keys/credentials MUST be handled server-side and not stored here.
}

export interface AppConfig {
  llm?: LLMConfig; // Optional global LLM config as per TR_CONFIG_008
  mcpProviders: McpProviderConfig[];
  // Optional root fields as per TR_CONFIG_002
  $schema?: string;
  version?: string;
}

// --- Configuration Loader ---

let loadedConfig: AppConfig | null = null;
const configFilePath = path.resolve(process.cwd(), 'mcp.config.json');

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
        `mcp.config.json not found at ${configFilePath}. Please ensure the file exists in packages/mcp-client/`
      );
    }
    const fileContents = fs.readFileSync(configFilePath, 'utf-8');
    const parsedConfig = JSON.parse(fileContents) as AppConfig;

    // Basic validation (can be expanded)
    if (
      !parsedConfig.mcpProviders ||
      !Array.isArray(parsedConfig.mcpProviders)
    ) {
      throw new Error(
        'Invalid mcp.config.json: mcpProviders array is missing or not an array.'
      );
    }

    // Validate required fields for each provider as per TR_CONFIG_003 & type-specifics
    parsedConfig.mcpProviders.forEach((provider) => {
      if (
        !provider.id ||
        !provider.name ||
        !provider.type ||
        !provider.config
      ) {
        throw new Error(
          `Invalid provider config for provider with id "${
            provider.id || 'UNKNOWN'
          }": Missing one or more required fields (id, name, type, config).`
        );
      }
      switch (provider.type) {
        case 'stdio':
          if (
            !(provider.config as StdioConfig).command ||
            !Array.isArray((provider.config as StdioConfig).command)
          ) {
            throw new Error(
              `Invalid stdio provider config for "${provider.id}": command array is missing or invalid.`
            );
          }
          break;
        case 'sse':
          if (!(provider.config as SseConfig).url) {
            throw new Error(
              `Invalid sse provider config for "${provider.id}": url is missing.`
            );
          }
          break;
        case 'websocket':
          if (!(provider.config as WebSocketConfig).url) {
            throw new Error(
              `Invalid websocket provider config for "${provider.id}": url is missing.`
            );
          }
          break;
        case 'http':
          if (
            !(provider.config as HttpConfig).url ||
            !(provider.config as HttpConfig).method
          ) {
            throw new Error(
              `Invalid http provider config for "${provider.id}": url or method is missing.`
            );
          }
          break;
        default:
          throw new Error(
            `Unknown provider type "${provider.type}" for provider "${provider.id}".`
          );
      }
    });

    loadedConfig = parsedConfig;
    return loadedConfig;
  } catch (error: any) {
    console.error(
      '[ERROR] Failed to load or parse mcp.config.json:',
      error.message
    );
    // In a real app, you might want to throw a more specific error or handle this state
    // For now, rethrow to ensure the issue is visible during development
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
  return config.mcpProviders.find((p) => p.id === providerId);
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
