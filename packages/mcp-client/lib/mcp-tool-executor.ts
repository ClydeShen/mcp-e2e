import {
  getMcpProviderById,
  HttpConfig,
  SseConfig,
  WebSocketConfig,
} from './mcp-client-config';

export interface McpToolExecutionResult {
  output?: string; // Raw string output from the provider
  error?: string;
  providerId: string;
  // We might add a flag like `isJsonOutput: boolean` if we want to hint at parsing later
}

export async function executeMcpTool(
  providerId: string,
  inputData: string // Assumed to be pre-formatted string (e.g., JSON.stringified if provider expects JSON)
): Promise<McpToolExecutionResult> {
  const providerConfig = getMcpProviderById(providerId);

  if (!providerConfig) {
    return {
      error: `MCP Provider with ID '${providerId}' not found in configuration.`,
      providerId,
    };
  }

  try {
    switch (providerConfig.type) {
      case 'stdio':
        // Delegate to the mcp-stdio-handler API route
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
          output: stdioResult.output, // The API route should return { output: "..." } on success
          error: stdioResult.error,
          providerId,
        };

      case 'http':
        const httpConfig = providerConfig.config as HttpConfig;
        const httpResponse = await fetch(httpConfig.url, {
          method: httpConfig.method,
          headers: httpConfig.headers, // TR_CONFIG_007: Optional headers
          body: inputData, // Input data is the body, assumed to be correctly formatted string
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
        // FR_CLIENT_009: Application logic parses data. For now, returning raw text.
        // Caller can decide to JSON.parse() if provider is known to return JSON.
        const outputText = await httpResponse.text();
        return { output: outputText, providerId };

      case 'sse':
        const sseConfig = providerConfig.config as SseConfig;
        return new Promise<McpToolExecutionResult>((resolve) => {
          const eventSource = new EventSource(sseConfig.url, {
            withCredentials: sseConfig.withCredentials, // TR_CONFIG_005: Optional withCredentials
          });

          eventSource.onmessage = (event) => {
            // For a tool call, we typically expect one primary response.
            // Resolve with the first message and close the connection.
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

      case 'websocket':
        const wsConfig = providerConfig.config as WebSocketConfig;
        return new Promise<McpToolExecutionResult>((resolve) => {
          const socket = new WebSocket(wsConfig.url, wsConfig.protocols); // TR_CONFIG_006: Optional protocols

          socket.onopen = () => {
            socket.send(inputData);
          };

          socket.onmessage = (event) => {
            // Similar to SSE, resolve with the first message for a tool call.
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
              // This might be redundant if onerror already caught it, but handles abrupt closes.
              console.warn(
                `[mcp-tool-executor] WebSocket for ${providerId} closed uncleanly.`
              );
              // Avoid resolving if already resolved by onmessage or onerror
            }
          };
        });

      default:
        return {
          error: `MCP Provider type '${providerConfig.type}' for ID '${providerId}' is not supported by executeMcpTool.`,
          providerId,
        };
    }
  } catch (err: any) {
    console.error(
      `[mcp-tool-executor] Unexpected error executing tool for ${providerId}:`,
      err
    );
    return {
      error: `Unexpected error executing tool for ${providerId}: ${err.message}`,
      providerId,
    };
  }
}
