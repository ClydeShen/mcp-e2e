import {
  getMcpProviderById,
  HttpConfig,
  McpHtttpProvider,
  McpSseProvider,
  McpStdioProvider,
  McpWebSocketProvider,
  SseConfig,
  WebSocketConfig,
  McpProviderConfig,
} from './mcp-client-config';

export interface McpToolExecutionResult {
  output?: string; // Raw string output from the provider
  error?: string;
  providerId: string;
  // We might add a flag like `isJsonOutput: boolean` if we want to hint at parsing later
}

// Helper function for STDIO provider (via API)
async function _executeStdioViaApi(
  providerConfig: McpStdioProvider,
  inputData: string
): Promise<McpToolExecutionResult> {
  const providerId = providerConfig.id;
  const stdioResponse = await fetch('/api/mcp-stdio-handler', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ providerId, inputData }),
  });

  if (!stdioResponse.ok) {
    const errorResult = await stdioResponse
      .json()
      .catch(() => ({ error: stdioResponse.statusText }));
    return {
      error: `Stdio provider ${providerId} API call failed with status ${
        stdioResponse.status
      }: ${errorResult.error || stdioResponse.statusText}`,
      providerId,
    };
  }
  const stdioResult = await stdioResponse.json();
  return {
    output: stdioResult.stdout, // Changed from stdioResult.output to stdioResult.stdout
    error: stdioResult.stderr, // Changed from stdioResult.error to stdioResult.stderr
    providerId,
  };
}

// Helper function for HTTP provider
async function _executeHttp(
  providerConfig: McpHtttpProvider,
  inputData: string
): Promise<McpToolExecutionResult> {
  const providerId = providerConfig.id;
  const httpConfig = providerConfig.config as HttpConfig; // No longer need 'as HttpConfig' if type is McpHtttpProvider
  const httpResponse = await fetch(httpConfig.url, {
    method: httpConfig.method,
    headers: httpConfig.headers,
    body: inputData,
  });

  if (!httpResponse.ok) {
    const errorText = await httpResponse
      .text()
      .catch(() => httpResponse.statusText);
    return {
      error: `HTTP provider ${providerId} request to ${httpConfig.url} failed with status ${httpResponse.status}: ${errorText}`,
      providerId,
    };
  }
  const outputText = await httpResponse.text();
  return { output: outputText, providerId };
}

// Helper function for SSE provider
async function _executeSse(
  providerConfig: McpSseProvider
): Promise<McpToolExecutionResult> {
  const providerId = providerConfig.id;
  const sseConfig = providerConfig.config; // No longer need 'as SseConfig' due to McpSseProvider type
  return new Promise<McpToolExecutionResult>((resolve) => {
    const eventSource = new EventSource(sseConfig.url, {
      withCredentials: sseConfig.withCredentials,
    });

    eventSource.onmessage = (event) => {
      eventSource.close();
      resolve({ output: event.data, providerId });
    };

    eventSource.onerror = (error) => {
      eventSource.close();
      console.error(
        `[mcp-tool-executor] SSE error for ${providerId} at ${sseConfig.url}:`,
        error
      );
      resolve({
        error: `SSE connection to ${providerId} at ${sseConfig.url} failed.`,
        providerId,
      });
    };
  });
}

// Helper function for WebSocket provider
async function _executeWebSocket(
  providerConfig: McpWebSocketProvider,
  inputData: string
): Promise<McpToolExecutionResult> {
  const providerId = providerConfig.id;
  const wsConfig = providerConfig.config; // No longer need 'as WebSocketConfig' due to McpWebSocketProvider type
  return new Promise<McpToolExecutionResult>((resolve) => {
    const socket = new WebSocket(wsConfig.url, wsConfig.protocols);

    socket.onopen = () => {
      socket.send(inputData);
    };

    socket.onmessage = (event) => {
      socket.close();
      resolve({ output: event.data.toString(), providerId });
    };

    socket.onerror = (error) => {
      socket.close();
      console.error(
        `[mcp-tool-executor] WebSocket error for ${providerId} at ${wsConfig.url}:`,
        error
      );
      resolve({
        error: `WebSocket connection to ${providerId} at ${wsConfig.url} failed.`,
        providerId,
      });
    };

    socket.onclose = (event) => {
      if (!event.wasClean) {
        console.warn(
          `[mcp-tool-executor] WebSocket for ${providerId} closed uncleanly.`
        );
        // Avoid resolving if already resolved by onmessage or onerror
        // Consider if an error should be resolved here if not already.
        // For now, matching existing behavior where it might not resolve if onerror/onmessage didn't fire.
      }
    };
  });
}

// Define a type for the handler functions for better type safety in the map
type ToolExecutor = ( 
  providerConfig: McpProviderConfig, 
  inputData: string
) => Promise<McpToolExecutionResult>;

// Handler map
const providerExecutorMap: Partial<Record<McpProviderConfig['type'], ToolExecutor>> = {
  stdio: _executeStdioViaApi as ToolExecutor, // Cast needed due to specific type in helper
  http: _executeHttp as ToolExecutor,       // Cast needed
  sse: (providerConfig) => _executeSse(providerConfig as McpSseProvider), // Wrapper for sse
  websocket: _executeWebSocket as ToolExecutor, // Cast needed
};

export async function executeMcpTool(
  providerId: string,
  inputData: string
): Promise<McpToolExecutionResult> {
  const providerConfig = getMcpProviderById(providerId);

  if (!providerConfig) {
    return {
      error: `MCP Provider with ID '${providerId}' not found in configuration.`,
      providerId,
    };
  }

  const currentProviderId = providerConfig.id;

  try {
    const executor = providerExecutorMap[providerConfig.type];

    if (executor) {
      // The type assertion for providerConfig might be needed if the map isn't perfectly typed
      // to satisfy the specific helper function signatures directly from the map lookup.
      // However, with the ToolExecutor type and casts/wrappers in map, this should be okay.
      return await executor(providerConfig, inputData);
    } else {
      // This case should ideally not be reached if McpProviderConfig['type'] is exhaustive
      // and providerExecutorMap covers all types.
      return {
        error: `MCP Provider type '${(providerConfig as any).type}' for ID '${currentProviderId}' is not supported by executeMcpTool.`,
        providerId: currentProviderId,
      };
    }
  } catch (err: any) {
    console.error(
      `[mcp-tool-executor] Unexpected error executing tool for ${currentProviderId}:`,
      err
    );
    return {
      error: `Unexpected error executing tool for ${currentProviderId}: ${err.message}`,
      providerId: currentProviderId,
    };
  }
}
