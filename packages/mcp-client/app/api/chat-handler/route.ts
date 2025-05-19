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
    // Commented out: Last message user check - consider if this business rule is still needed.
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
    console.error(
      '[ChatHandler:_validateChatRequest] ERROR: Invalid request body | Error: %o',
      error
    );
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
    console.error(
      '[ChatHandler:_getValidatedLLMConfig] ERROR: LLM model not configured.'
    );
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
      '[ChatHandler:_getValidatedLLMConfig] WARN: llmConfig.maxSteps is not a number, defaulting behavior may occur in streamText.'
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

  // Directly use providerConfig.type as it's already derived and validated by getMcpConfig
  switch (providerConfig.type) {
    case 'stdio':
      // Cast to McpStdioProvider is safe here due to the switch case
      const stdioConfig = providerConfig as McpStdioProvider;
      // The 'command' field is guaranteed by McpStdioProvider type
      transport = new StdioMCPTransport({
        command: stdioConfig.command,
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
      console.warn(
        '[ChatHandler:_initializeMcpClientAndTools] WARN: Unsupported provider type for auto-discovery | ProviderID: %s, Type: %s',
        providerId,
        providerConfig.type // Log the actual type from the config
      );
      return {}; // Skip MCP client init for non-STDIO or unhandled types
  }

  let mcpClient: InferredMCPClient | undefined;
  try {
    mcpClient = await createMCPClient({ transport });
    const discoveredMcpTools: Record<string, Tool> = await mcpClient.tools();
    console.info(
      '[ChatHandler:_initializeMcpClientAndTools] INFO: Discovered MCP Tools | ProviderID: %s, Type: %s, Tools: %o',
      providerId,
      providerConfig.type,
      Object.keys(discoveredMcpTools)
    );
    return { mcpClient, discoveredMcpTools };
  } catch (err: any) {
    console.error(
      '[ChatHandler:_initializeMcpClientAndTools] ERROR: Error initializing MCP client | ProviderID: %s, Type: %s, Error: %o',
      providerId,
      providerConfig.type,
      err
    );
    if (mcpClient) {
      await mcpClient
        .close()
        .catch((closeError: Error) =>
          console.error(
            '[ChatHandler:_initializeMcpClientAndTools] ERROR: Error closing MCP client during init error | ProviderID: %s, Type: %s, Error: %o',
            providerId,
            providerConfig.type,
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
function vercelAiErrorHandler(error: unknown): string {
  if (error == null) {
    return 'Unknown error';
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    // Log the full error on the server for more details
    console.error(
      '[ChatHandler:vercelAiErrorHandler] ERROR: Detailed error from streamText | Error: %o',
      error
    );
    return error.message; // Send only the message to the client
  }
  // Log the full error object if it's not an Error instance
  console.error(
    '[ChatHandler:vercelAiErrorHandler] ERROR: Detailed non-Error object from streamText | Error: %o',
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
          const initResult = await _initializeMcpClientAndTools(
            providerId,
            providerConfig
          );
          if (initResult.errorResponse) {
            console.error(
              '[ChatHandler:POST] ERROR: Failed to initialize provider or fetch its tools | ProviderID: %s, Status: %s, Response: %o',
              providerId,
              initResult.errorResponse.statusText,
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
              }
            }
          } else if (initResult.mcpClient) {
            activeMcpClients.push(initResult.mcpClient);
            console.info(
              '[ChatHandler:POST] INFO: Provider initialized but exposed no tools | ProviderID: %s',
              providerId
            );
          }
        } else {
          console.info(
            '[ChatHandler:POST] INFO: Skipping disabled provider | ProviderID: %s',
            providerId
          );
        }
      }
    }

    if (Object.keys(discoveredMcpToolsCombined).length === 0) {
      console.warn(
        '[ChatHandler:POST] WARN: No tools were successfully loaded from any provider for LLM use.'
      );
    }

    const streamTextPayload = _prepareStreamTextCallPayload(
      llmConfig,
      messages,
      discoveredMcpToolsCombined
    );

    let result;
    try {
      result = await streamText({
        ...streamTextPayload,
        onFinish: async (event) => {
          // onFinish signals completion. Detailed errors are handled by vercelAiErrorHandler or outer catch.
        },
      });
    } catch (streamTextError: any) {
      console.error(
        '[ChatHandler:POST] ERROR: Error directly from streamText call | Error: %o, Message: %s, Stack: %s, Cause: %o',
        streamTextError,
        streamTextError.message,
        streamTextError.stack,
        streamTextError.cause
      );
      throw streamTextError;
    }

    return result.toDataStreamResponse({
      getErrorMessage: vercelAiErrorHandler,
    });
  } catch (error: any) {
    console.error(
      '[ChatHandler:POST] ERROR: POST handler error | Error: %o',
      error
    );
    // Log additional properties if they exist
    if (error.message) {
      console.error('[ChatHandler:POST] ERROR_MESSAGE: %s', error.message);
    }
    if (error.stack) {
      console.error('[ChatHandler:POST] ERROR_STACK: %s', error.stack);
    }
    if (error.cause) {
      console.error('[ChatHandler:POST] ERROR_CAUSE: %o', error.cause);
    }
    try {
      console.error(
        '[ChatHandler:POST] ERROR_FULL_OBJECT: %s',
        JSON.stringify(error, Object.getOwnPropertyNames(error))
      );
    } catch (e) {
      console.error(
        '[ChatHandler:POST] ERROR: Could not stringify full error object | StringifyError: %o',
        e
      );
    }

    let errorMessage = 'Handler error'; // Default error message
    const errorStatus = 500;

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
    // MCP client closing
    if (activeMcpClients.length > 0) {
      console.info(
        '[ChatHandler:POST_Finally] INFO: Ensuring %d MCP client(s) are closed.',
        activeMcpClients.length
      );
      for (const client of activeMcpClients) {
        if (client && typeof client.close === 'function') {
          await client
            .close()
            .catch((closeError: Error) =>
              console.error(
                '[ChatHandler:POST_Finally] ERROR: Error closing an MCP client | Error: %o',
                closeError
              )
            );
        } else {
          console.warn(
            '[ChatHandler:POST_Finally] WARN: Attempted to close an invalid or already closed client.'
          );
        }
      }
    }
  }
}
