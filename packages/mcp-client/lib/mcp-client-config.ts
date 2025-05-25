import fs from 'fs';
import path from 'path';
import type {
  AppConfig,
  LLMConfig,
  McpProviderConfig,
} from './mcp-config.schema';
import { AppConfigSchema } from './mcp-config.schema';

// --- Configuration Types ---

// Only keep ProviderType, remove all other local type/interface definitions
export type ProviderType = 'stdio' | 'sse' | 'websocket' | 'http';

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
