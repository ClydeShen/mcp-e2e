import {
  AppConfig,
  getLLMConfig,
  getMcpConfig,
  LLMConfig,
  McpProviderConfig,
  McpStdioProvider,
} from '@/lib/mcp-client-config';
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import {
  convertToCoreMessages,
  CoreMessage,
  experimental_createMCPClient as createMCPClient,
  LanguageModel,
  Message,
  streamText,
  Tool,
} from 'ai';
import { Experimental_StdioMCPTransport as StdioMCPTransport } from 'ai/mcp-stdio';
// Removed imports for SseMCPTransport and WebSocketMCPTransport as they are not found
// import { Experimental_SseMCPTransport as SseMCPTransport } from 'ai/mcp-sse';
// import { Experimental_WebSocketMCPTransport as WebSocketMCPTransport } from 'ai/mcp-websocket';
import { NextRequest, NextResponse } from 'next/server';

// Define a type for the MCPClient based on the return type of createMCPClient
type InferredMCPClient = Awaited<ReturnType<typeof createMCPClient>>;

// callStdioTool function is no longer needed as MCP client handles STDIO directly

// Helper to validate the chat request
async function _validateChatRequest(req: NextRequest): Promise<{
  messages?: Message[];
  errorResponse?: NextResponse;
}> {
  try {
    const body = await req.json();
    const messages: Message[] = body.messages ?? [];

    if (messages.length === 0) {
      return {
        errorResponse: NextResponse.json(
          { error: 'No messages provided' },
          { status: 400 }
        ),
      };
    }
    // const currentMessage = messages[messages.length - 1];
    // if (currentMessage.role !== 'user') {
    //   return {
    //     errorResponse: NextResponse.json(
    //       { error: 'Last message must be from user' },
    //       { status: 400 }
    //     ),
    //   };
    // }
    return { messages };
  } catch (error) {
    // Handle JSON parsing errors or other unexpected errors during request validation
    console.error('[CHAT-HANDLER] Error validating request:', error);
    return {
      errorResponse: NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      ),
    };
  }
}

// Helper to load and validate LLM configuration
function _getValidatedLLMConfig(): {
  llmConfig?: LLMConfig;
  errorResponse?: NextResponse;
} {
  const llmConfig = getLLMConfig();
  if (!llmConfig || !llmConfig.model) {
    console.error('[CHAT-HANDLER] LLM model not configured.');
    return {
      errorResponse: NextResponse.json(
        { error: 'LLM model not configured' },
        { status: 500 }
      ),
    };
  }

  // Ensure maxSteps is part of LLMConfig type and loaded by getLLMConfig()
  if (
    typeof llmConfig.maxSteps !== 'number' &&
    llmConfig.maxSteps !== undefined
  ) {
    console.warn(
      '[CHAT-HANDLER] llmConfig.maxSteps is not a number, defaulting behavior may occur in streamText.'
    );
  }
  return { llmConfig };
}

// Helper to prepare the payload for the streamText call
function _prepareStreamTextCallPayload(
  llmConfig: LLMConfig,
  originalMessages: Message[],
  discoveredTools: Record<string, Tool>
): Omit<
  Parameters<typeof streamText>[0],
  'onFinish' | 'onToolCall' | 'onToolResult'
> {
  const bedrockProvider: ReturnType<typeof createAmazonBedrock> =
    createAmazonBedrock({
      region: process.env.AWS_REGION || 'us-east-1',
      credentialProvider: fromNodeProviderChain(),
    });

  const languageModel: LanguageModel = bedrockProvider.languageModel(
    llmConfig.model
  );

  // Create a new tools object for streamText that omits the .execute method
  // This forces tool execution to be handled by the client via onToolCall
  const clientExecutionTools: Record<string, Tool> = {};
  for (const toolName in discoveredTools) {
    if (Object.prototype.hasOwnProperty.call(discoveredTools, toolName)) {
      const originalTool = discoveredTools[toolName];
      clientExecutionTools[toolName] = {
        description: originalTool.description,
        parameters: originalTool.parameters,
        // execute: undefined, // Explicitly omit or ensure it's not copied
      };
    }
  }

  const coreMessages: CoreMessage[] = convertToCoreMessages(originalMessages, {
    tools: clientExecutionTools, // Pass the tools without .execute
  });

  return {
    model: languageModel,
    messages: coreMessages,
    system: llmConfig.defaultSystemPrompt,
    temperature: llmConfig.temperature || 0.1,
    tools: clientExecutionTools, // Pass the tools without .execute here too
    maxSteps: typeof llmConfig.maxSteps === 'number' ? llmConfig.maxSteps : 5,
  };
}

// Helper to initialize MCP Client and discover tools
async function _initializeMcpClientAndTools(
  providerId: string,
  providerConfig: McpProviderConfig
): Promise<{
  mcpClient?: InferredMCPClient;
  discoveredMcpTools?: Record<string, Tool>;
  errorResponse?: NextResponse;
}> {
  let transport;

  // Determine effectiveType more safely
  let effectiveType = providerConfig.type;
  if (!effectiveType && 'command' in providerConfig && providerConfig.command) {
    effectiveType = 'stdio';
  }

  switch (effectiveType) {
    case 'stdio':
      // Now that effectiveType is 'stdio', providerConfig should be compatible with McpStdioProvider
      // However, explicit check or safer cast might still be good.
      const stdioConfig = providerConfig as McpStdioProvider; // This cast should be safer now

      // Ensure command is truly present; this check might be redundant if above logic is perfect
      // but good for robustness if McpStdioProvider definition allows optional command.
      if (!('command' in stdioConfig && stdioConfig.command)) {
        console.error(
          `[CHAT-HANDLER] STDIN provider '${providerId}' (type: ${effectiveType}) is missing a valid 'command'. Skipping MCP client init for this provider.`
        );
        return {};
      }
      transport = new StdioMCPTransport({
        command: stdioConfig.command, // Should be safe now
        args: stdioConfig.args,
        env: stdioConfig.env,
      });
      break;
    // Cases for 'sse' and 'websocket' are removed as transports are not found.
    // The default case will now handle them.
    // case 'sse':
    //   const sseConfig = providerConfig as McpSseProvider;
    //   transport = new SseMCPTransport({
    //     url: sseConfig.config.url,
    //   });
    //   break;
    // case 'websocket':
    //   const wsConfig = providerConfig as McpWebSocketProvider;
    //   transport = new WebSocketMCPTransport({
    //     url: wsConfig.config.url,
    //   });
    //   break;
    default:
      console.log(
        `[CHAT-HANDLER] Provider type '${
          effectiveType // Use effectiveType for logging
        }' for '${providerId}' is not an auto-discoverable tool server type (currently only STDIN is supported for MCP client). Skipping MCP client init for this provider.`
      );
      return {};
  }

  let mcpClient: InferredMCPClient | undefined;
  try {
    mcpClient = await createMCPClient({ transport });
    const discoveredMcpTools: Record<string, Tool> = await mcpClient.tools();
    // Keep this log as it's informative for setup verification
    console.log(
      `[CHAT-HANDLER] Discovered MCP Tools for '${providerId}' (type: ${effectiveType}):`,
      Object.keys(discoveredMcpTools)
    );
    return { mcpClient, discoveredMcpTools };
  } catch (err: any) {
    console.error(
      `[CHAT-HANDLER] Error initializing MCP client for '${providerId}' (type: ${providerConfig.type}):`,
      err
    );
    if (mcpClient) {
      await mcpClient
        .close()
        .catch((closeError: Error) =>
          console.error(
            `[CHAT-HANDLER] Error closing MCP client for '${providerId}' (type: ${providerConfig.type}) during init error:`,
            closeError
          )
        );
    }
    // Return an error that the main loop can log, but we might still want to continue with other providers.
    // So, we don't return a full NextResponse that would halt everything unless the error is truly critical.
    // For now, logging is done here, and returning empty mcpClient/tools signifies failure for this provider.
    return {
      errorResponse: NextResponse.json(
        {
          error: `Failed to initialize or fetch tools from tool provider '${providerId}'.`,
        },
        { status: 500 }
      ),
    };
  }
}

// Error handler function as suggested by AI SDK documentation
export function vercelAiErrorHandler(error: unknown): string {
  if (error == null) {
    return 'Unknown error';
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    // Log the full error on the server for more details
    console.error(
      '[CHAT-HANDLER] Detailed error from streamText via vercelAiErrorHandler:',
      error
    );
    return error.message; // Send only the message to the client
  }
  // Log the full error object if it's not an Error instance
  console.error(
    '[CHAT-HANDLER] Detailed non-Error object from streamText via vercelAiErrorHandler:',
    error
  );
  try {
    return JSON.stringify(error);
  } catch (e) {
    return 'Unstringifyable error object';
  }
}

export async function POST(req: NextRequest) {
  const activeMcpClients: InferredMCPClient[] = []; // Store active clients for cleanup
  try {
    const validationResult = await _validateChatRequest(req);
    if (validationResult.errorResponse) return validationResult.errorResponse;
    const messages: Message[] = validationResult.messages!;

    const llmConfigResult = _getValidatedLLMConfig();
    if (llmConfigResult.errorResponse) return llmConfigResult.errorResponse;
    const llmConfig: LLMConfig = llmConfigResult.llmConfig!;

    const appConfig: AppConfig = getMcpConfig();
    // This will hold the original tools discovered from MCP, including .execute
    const discoveredMcpToolsCombined: Record<string, Tool> = {};

    for (const providerId in appConfig.mcpProviders) {
      if (
        Object.prototype.hasOwnProperty.call(appConfig.mcpProviders, providerId)
      ) {
        const providerConfig = appConfig.mcpProviders[providerId];
        if (providerConfig.enabled !== false) {
          // Removed verbose log: console.log(`[CHAT-HANDLER] Attempting to initialize provider: ${providerId} (type: ${providerConfig.type})`);
          const initResult = await _initializeMcpClientAndTools(
            providerId,
            providerConfig
          );
          if (initResult.errorResponse) {
            // Keep this error log
            console.error(
              `[CHAT-HANDLER] Failed to initialize provider '${providerId}' or fetch its tools. Error: ${initResult.errorResponse.statusText}`,
              await initResult.errorResponse.json().catch(() => ({}))
            );
          } else if (initResult.mcpClient && initResult.discoveredMcpTools) {
            activeMcpClients.push(initResult.mcpClient);
            for (const toolName in initResult.discoveredMcpTools) {
              if (
                Object.prototype.hasOwnProperty.call(
                  initResult.discoveredMcpTools,
                  toolName
                )
              ) {
                const prefixedToolName = `${providerId}_${toolName}`;
                discoveredMcpToolsCombined[prefixedToolName] =
                  initResult.discoveredMcpTools[toolName];
                // Keep this log: console.log(`[CHAT-HANDLER] Registered tool for discovery: ${prefixedToolName}`);
              }
            }
          } else if (initResult.mcpClient) {
            activeMcpClients.push(initResult.mcpClient);
            // Keep this log: console.log(`[CHAT-HANDLER] Provider '${providerId}' initialized but exposed no tools.`);
          } // Other cases like error or skipped are handled/logged in the helper
        } else {
          // Keep this log: console.log(`[CHAT-HANDLER] Skipping disabled provider: ${providerId}`);
        }
      }
    }

    if (Object.keys(discoveredMcpToolsCombined).length === 0) {
      // Keep this warning
      console.warn(
        '[CHAT-HANDLER] No tools were successfully loaded from any provider for LLM use.'
      );
    }

    const streamTextPayload = _prepareStreamTextCallPayload(
      llmConfig,
      messages,
      discoveredMcpToolsCombined
    );

    let result;
    try {
      // Removed verbose log: console.log('[CHAT-HANDLER] Attempting to call streamText...');
      result = await streamText({
        ...streamTextPayload,
        onFinish: async (event) => {
          // Removed debugger;
          // The onFinish event signals completion of the LLM turn.
          // Detailed errors from the stream are handled by vercelAiErrorHandler.
          // Errors from streamText setup are caught by the outer catch block.
          // Logging the full event here can be very verbose, so it's removed.
        },
      });
      // Removed verbose log: console.log('[CHAT-HANDLER] streamText call completed.');
    } catch (streamTextError: any) {
      // Keep these detailed error logs
      console.error(
        '[CHAT-HANDLER] Error directly from streamText call:',
        streamTextError
      );
      if (streamTextError.message) {
        console.error(
          '[CHAT-HANDLER] streamText error message:',
          streamTextError.message
        );
      }
      if (streamTextError.stack) {
        console.error(
          '[CHAT-HANDLER] streamText error stack:',
          streamTextError.stack
        );
      }
      if (streamTextError.cause) {
        console.error(
          '[CHAT-HANDLER] streamText error cause:',
          streamTextError.cause
        );
      }
      throw streamTextError;
    }

    return result.toDataStreamResponse({
      getErrorMessage: vercelAiErrorHandler,
    });
  } catch (error: any) {
    console.error('[CHAT-HANDLER] POST handler error:', error);
    // Log additional properties if they exist
    if (error.message) {
      console.error('[CHAT-HANDLER] Error message:', error.message);
    }
    if (error.stack) {
      console.error('[CHAT-HANDLER] Error stack:', error.stack);
    }
    if (error.cause) {
      console.error('[CHAT-HANDLER] Error cause:', error.cause);
    }
    try {
      console.error(
        '[CHAT-HANDLER] Full error object (stringified):',
        JSON.stringify(error, Object.getOwnPropertyNames(error))
      );
    } catch (e) {
      console.error('[CHAT-HANDLER] Could not stringify full error object:', e);
    }

    let errorMessage = 'Handler error'; // Default error message
    let errorStatus = 500;

    if (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      errorMessage = error.message;
    } else if (
      error instanceof Error &&
      error.message.includes('.chat is not a function')
    ) {
      errorMessage =
        'Internal configuration error: LLM adapter setup failed. Check modelId and adapter compatibility.';
    } // else, errorMessage remains 'Handler error' if the caught error isn't an object with a message

    return NextResponse.json({ error: errorMessage }, { status: errorStatus });
  } finally {
    // Remove the diagnostic delay
    // console.log('[CHAT-HANDLER] Starting diagnostic delay in finally block...');
    // await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    // console.log('[CHAT-HANDLER] Diagnostic delay finished.');

    // MCP client closing
    if (activeMcpClients.length > 0) {
      console.log(
        `[CHAT-HANDLER] Ensuring ${activeMcpClients.length} MCP client(s) are closed (in finally block).`
      );
      for (const client of activeMcpClients) {
        if (client && typeof client.close === 'function') {
          await client
            .close()
            .catch((closeError: Error) =>
              console.error(
                '[CHAT-HANDLER] Error closing an MCP client in finally block:',
                closeError
              )
            );
        } else {
          console.warn(
            '[CHAT-HANDLER] Attempted to close an invalid or already closed client in finally block.'
          );
        }
      }
    }
    // console.log('[CHAT-HANDLER] FINALLY BLOCK REACHED - MCP CLIENT CLOSING IS CURRENTLY DISABLED FOR DEBUGGING.');
  }
}
