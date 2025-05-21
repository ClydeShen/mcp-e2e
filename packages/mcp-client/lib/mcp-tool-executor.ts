import {
  getMcpProviderById,
  HttpConfig,
  McpHtttpProvider,
  McpProviderConfig,
  McpSseProvider,
  McpStdioProvider,
  McpWebSocketProvider,
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

  // Construct the absolute URL for the API endpoint
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000'; // Fallback for safety, but ENV var is better
  if (!process.env.APP_BASE_URL) {
    console.warn(
      '[McpToolExecutor:_executeStdioViaApi] WARN: APP_BASE_URL environment variable not set. Defaulting to http://localhost:3000. This might not work in deployed environments.'
    );
  }
  const apiUrl = `${baseUrl}/api/mcp-stdio-handler`;

  console.log(
    '[McpToolExecutor:_executeStdioViaApi] INFO: Calling STDIO handler via API | URL: %s',
    apiUrl
  );

  const stdioResponse = await fetch(apiUrl, {
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
  console.log(
    '[McpToolExecutor:_executeStdioViaApi] DEBUG: Result from STDIO handler | Provider: %s, Result: %o',
    providerId,
    stdioResult
  );

  // Only treat stderr as an error if the exit code was non-zero
  const executionError =
    stdioResult.exitCode !== 0 ? stdioResult.stderr : undefined;
  // If there was stderr output but exit code was 0, it might be just logs/warnings.
  // We could choose to log stdioResult.stderr here if exitCode is 0 and stderr is not empty.
  if (stdioResult.exitCode === 0 && stdioResult.stderr) {
    console.log(
      '[McpToolExecutor:_executeStdioViaApi] INFO: STDIO provider wrote to stderr (exit code 0) | Provider: %s, Stderr: %s',
      providerId,
      stdioResult.stderr
    );
  }

  return {
    output: stdioResult.stdout,
    error: executionError,
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
  providerConfig: McpSseProvider,
  inputData: string // This inputData should be a JSON string with tool_name and arguments
): Promise<McpToolExecutionResult> {
  const providerId = providerConfig.id;
  const sseConfig = providerConfig.config;
  const sseUrl = new URL(sseConfig.url);
  const toolExecutionUrl = `${sseUrl.protocol}//${sseUrl.host}/execute-tool`;

  let eventSource: EventSource | null = null;

  return new Promise<McpToolExecutionResult>((resolve, reject) => {
    try {
      const parsedInput = JSON.parse(inputData);
      const { tool_name, arguments: args } = parsedInput;

      if (!tool_name) {
        return reject({
          // Reject promise for clarity
          error: `SSE tool execution for ${providerId} failed: 'tool_name' missing in inputData.`,
          providerId,
        });
      }

      const requestId = `sse-tool-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 10)}`;

      eventSource = new EventSource(sseConfig.url, {
        withCredentials: sseConfig.withCredentials,
      });

      const timeoutId = setTimeout(() => {
        if (eventSource) eventSource.close();
        reject({
          // Reject promise for clarity
          error: `SSE tool execution for ${providerId} timed out waiting for tool_response for request_id: ${requestId}.`,
          providerId,
        });
      }, 30000); // 30-second timeout

      eventSource.addEventListener('tool_response', (event: MessageEvent) => {
        try {
          const toolResponseData = JSON.parse(event.data);
          if (toolResponseData.request_id === requestId) {
            clearTimeout(timeoutId);
            if (eventSource) eventSource.close();
            if (toolResponseData.error) {
              resolve({ error: toolResponseData.error, providerId });
            } else {
              resolve({
                output: JSON.stringify(toolResponseData.result),
                providerId,
              });
            }
          }
        } catch (e) {
          console.error(
            '[McpToolExecutor:_executeSse] ERROR: Could not parse tool_response data | Error: %o',
            e
          );
          // Don't resolve/reject here, might be a message for another request
        }
      });

      eventSource.onerror = (error) => {
        clearTimeout(timeoutId);
        if (eventSource) eventSource.close();
        console.error(
          '[McpToolExecutor:_executeSse] ERROR: SSE connection error | Provider: %s, URL: %s, Error: %o',
          providerId,
          sseConfig.url,
          error
        );
        reject({
          // Reject promise for clarity
          error: `SSE connection to ${providerId} at ${sseConfig.url} failed.`,
          providerId,
        });
      };

      // Now, make the HTTP POST request to trigger the tool
      fetch(toolExecutionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_name,
          arguments: args,
          request_id: requestId,
        }),
      })
        .then((response) => {
          if (!response.ok) {
            response
              .json()
              .then((errData) => {
                clearTimeout(timeoutId);
                if (eventSource) eventSource.close();
                console.error(
                  '[McpToolExecutor:_executeSse] ERROR: HTTP POST to /execute-tool failed | Status: %s, Body: %o',
                  response.status,
                  errData
                );
                reject({
                  // Reject promise for clarity
                  error: `Failed to trigger tool ${tool_name} on ${providerId}. HTTP status: ${
                    response.status
                  }. Error: ${errData.error || response.statusText}`,
                  providerId,
                });
              })
              .catch(() => {
                clearTimeout(timeoutId);
                if (eventSource) eventSource.close();
                reject({
                  error: `Failed to trigger tool ${tool_name} on ${providerId}. HTTP status: ${response.status}. Could not parse error response.`,
                  providerId,
                });
              });
          } else {
            // HTTP call was successful, now we just wait for the SSE 'tool_response' event
            console.log(
              `[McpToolExecutor:_executeSse] INFO: Successfully sent tool execution request to ${toolExecutionUrl} for request_id: ${requestId}`
            );
          }
        })
        .catch((fetchError) => {
          clearTimeout(timeoutId);
          if (eventSource) eventSource.close();
          console.error(
            '[McpToolExecutor:_executeSse] ERROR: Network error during HTTP POST to /execute-tool | Error: %o',
            fetchError
          );
          reject({
            // Reject promise for clarity
            error: `Network error when trying to trigger tool ${tool_name} on ${providerId}: ${fetchError.message}`,
            providerId,
          });
        });
    } catch (e: any) {
      // Catch JSON parsing errors for inputData or other synchronous errors
      if (eventSource) eventSource.close();
      reject({
        error: `Error preparing SSE tool execution for ${providerId}: ${e.message}`,
        providerId,
      });
    }
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
        '[McpToolExecutor:_executeWebSocket] ERROR: WebSocket connection error | Provider: %s, URL: %s, Error: %o',
        providerId,
        wsConfig.url,
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
          '[McpToolExecutor:_executeWebSocket] WARN: WebSocket closed uncleanly | Provider: %s, Event: %o',
          providerId,
          event
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
const providerExecutorMap: Partial<
  Record<McpProviderConfig['type'], ToolExecutor>
> = {
  stdio: _executeStdioViaApi as ToolExecutor, // Cast needed due to specific type in helper
  http: _executeHttp as ToolExecutor, // Cast needed
  sse: (providerConfig, inputData) =>
    _executeSse(providerConfig as McpSseProvider, inputData), // Wrapper for sse
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
        error: `MCP Provider type '${
          (providerConfig as any).type
        }' for ID '${currentProviderId}' is not supported by executeMcpTool.`,
        providerId: currentProviderId,
      };
    }
  } catch (err: any) {
    console.error(
      '[McpToolExecutor:executeMcpTool] ERROR: Unexpected error executing tool | Provider: %s, Error: %s',
      currentProviderId,
      err.message,
      err // include full error object for more details if needed
    );
    return {
      error: `Unexpected error executing tool for ${currentProviderId}: ${err.message}`,
      providerId: currentProviderId,
    };
  }
}
