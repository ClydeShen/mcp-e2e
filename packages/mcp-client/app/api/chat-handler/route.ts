import { getLLMConfig, getMcpConfig } from '@/lib/mcp-client-config';
import type {
  LLMConfig,
  McpProviderConfig,
  McpSseProvider,
  McpStdioProvider,
} from '@/lib/mcp-config.schema';
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
// import { Experimental_SseMCPTransport as SseMCPTransport } from 'ai/experimental/mcp-sse'; // Adjusted path
// import { Experimental_WebSocketMCPTransport as WebSocketMCPTransport } from 'ai/experimental/mcp-websocket'; // Adjusted path
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
      const stdioConfig = providerConfig as McpStdioProvider;
      transport = new StdioMCPTransport({
        command: stdioConfig.command,
        args: stdioConfig.args,
        env: stdioConfig.env,
      });
      break;
    case 'sse':
      const sseConfig = providerConfig as McpSseProvider;
      transport = {
        type: 'sse',
        url: sseConfig.config.url,
        // TODO: Add headers from sseConfig.config.headers if needed and supported by your SseConfig schema
      } as any; // Cast to any to satisfy type checker, runtime follows docs
      break;
    /* case 'websocket':
      const wsConfig = providerConfig as McpWebSocketProvider;
      transport = new WebSocketMCPTransport({
        url: wsConfig.config.url,
      });
      break; */
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
    console.warn(
      '[ChatHandler:vercelAiErrorHandler] WARN: Received null or undefined error object.'
    );
    return 'Unknown error';
  }
  if (typeof error === 'string') {
    console.log(
      '[ChatHandler:vercelAiErrorHandler] INFO: Error is a string. | Error: %s',
      error
    );
    return error;
  }
  if (error instanceof Error) {
    // Log the full error on the server for more details
    console.error(
      '[ChatHandler:vercelAiErrorHandler] ERROR: Detailed error from streamText | Error Name: %s, Message: %s, Stack: %s',
      error.name,
      error.message,
      error.stack
    );
    return error.message; // Return only the message to the client for brevity
  }
  console.warn(
    '[ChatHandler:vercelAiErrorHandler] WARN: Unknown error type. | Error: %o',
    error
  );
  return 'An unexpected error occurred.';
}

export async function POST(req: NextRequest) {
  console.log(
    '[ChatHandler:POST] INFO: Received POST request. | URL: %s, Headers: %o',
    req.url,
    Object.fromEntries(req.headers)
  );
  const requestTimestamp = Date.now();
  let llmConfig: LLMConfig | undefined;
  let fullAppConfig: ReturnType<typeof getMcpConfig>;

  // Step 0: Load Critical Configurations First & Catch Early
  try {
    console.log(
      '[ChatHandler:POST] INFO: Attempting to load critical configurations (LLM & MCP).'
    );
    const llmConfigResult = _getValidatedLLMConfig();
    if (llmConfigResult.errorResponse) {
      console.warn(
        '[ChatHandler:POST] WARN: LLM configuration loading/validation failed early. | Status: %s',
        llmConfigResult.errorResponse.status
      );
      return llmConfigResult.errorResponse;
    }
    llmConfig = llmConfigResult.llmConfig!;
    fullAppConfig = getMcpConfig(); // This can throw if mcp.config.json is invalid/missing
    console.log(
      '[ChatHandler:POST] INFO: Critical configurations loaded successfully.'
    );
  } catch (configError: any) {
    console.error(
      '[ChatHandler:POST] CRITICAL_CONFIG_ERROR: Failed to load initial configurations. | ErrorName: %s, ErrorMessage: %s',
      configError.name,
      configError.message // Stack can be too verbose for this specific log, but good for the generic catch
    );
    return NextResponse.json(
      {
        error: 'ServerConfigurationError',
        message:
          'Critical server configuration is missing or invalid. Please contact an administrator.',
        details: configError.message, // Provide some technical detail
      },
      { status: 503 } // Service Unavailable due to config issue
    );
  }

  // Main processing block - wrapped in its own try/catch for operational errors
  try {
    // 1. Validate Request
    console.log('[ChatHandler:POST] INFO: Validating chat request...');
    const {
      messages: originalMessages,
      errorResponse: validationErrorResponse,
    } = await _validateChatRequest(req);
    if (validationErrorResponse) {
      console.warn(
        '[ChatHandler:POST] WARN: Chat request validation failed. | Status: %s',
        validationErrorResponse.status
      );
      return validationErrorResponse;
    }
    console.log(
      '[ChatHandler:POST] INFO: Chat request validated successfully.'
    );

    const currentMessageContent =
      originalMessages![originalMessages!.length - 1].content;
    console.log(
      '[ChatHandler:POST] INFO: Current message content. | Content: %s',
      typeof currentMessageContent === 'string'
        ? currentMessageContent.substring(0, 100) + '...'
        : 'Non-string content'
    );

    // LLM Config is already validated and loaded into llmConfig variable
    console.log(
      '[ChatHandler:POST] INFO: Using pre-validated LLM configuration. | Model: %s',
      llmConfig?.model // llmConfig is guaranteed to be defined here by successful config load phase
    );

    // 3. Initialize MCP Clients and Discover Tools
    const allDiscoveredTools: Record<string, Tool> = {};
    const activeMcpClients: InferredMCPClient[] = [];

    if (fullAppConfig.mcpProviders) {
      console.log(
        '[ChatHandler:POST] INFO: Initializing MCP providers and discovering tools...'
      );
      for (const providerId in fullAppConfig.mcpProviders) {
        const providerConfig = fullAppConfig.mcpProviders[providerId];
        if (providerConfig.disabled) {
          console.log(
            '[ChatHandler:POST] INFO: Skipping disabled MCP provider. | ProviderID: %s',
            providerConfig.id
          );
          continue;
        }
        console.log(
          '[ChatHandler:POST] INFO: Initializing MCP provider. | ProviderID: %s, Type: %s',
          providerConfig.id,
          providerConfig.type
        );
        const {
          mcpClient,
          discoveredMcpTools,
          errorResponse: mcpInitError,
        } = await _initializeMcpClientAndTools(
          providerConfig.id,
          providerConfig
        );

        if (mcpInitError) {
          console.warn(
            '[ChatHandler:POST] WARN: Failed to initialize MCP provider or discover tools, skipping this provider. | ProviderID: %s, Error Status: %s',
            providerConfig.id,
            mcpInitError.status
          );
          continue;
        }

        if (mcpClient) {
          activeMcpClients.push(mcpClient);
        }

        if (discoveredMcpTools) {
          for (const originalToolName in discoveredMcpTools) {
            if (
              Object.prototype.hasOwnProperty.call(
                discoveredMcpTools,
                originalToolName
              )
            ) {
              const prefixedToolName = `${providerConfig.id}_${originalToolName}`;
              if (allDiscoveredTools[prefixedToolName]) {
                console.warn(
                  '[ChatHandler:POST] WARN: Duplicate prefixed tool name found. Overwriting. | PrefixedToolName: %s, NewProvider: %s',
                  prefixedToolName,
                  providerConfig.id
                );
              }
              allDiscoveredTools[prefixedToolName] =
                discoveredMcpTools[originalToolName];
            }
          }
          console.log(
            '[ChatHandler:POST] INFO: Successfully discovered tools for provider. | ProviderID: %s, PrefixedToolsCount: %s, ExamplePrefixedTool: %s',
            providerConfig.id,
            Object.keys(discoveredMcpTools).length,
            Object.keys(discoveredMcpTools).length > 0
              ? `${providerConfig.id}_${Object.keys(discoveredMcpTools)[0]}`
              : 'N/A'
          );
        }
      }
      console.log(
        '[ChatHandler:POST] INFO: MCP providers initialization and tool discovery complete. | TotalDiscoveredTools: %s, ToolNames: %o',
        Object.keys(allDiscoveredTools).length,
        Object.keys(allDiscoveredTools)
      );
    } else {
      console.log(
        '[ChatHandler:POST] INFO: No MCP providers configured or found in mcp.config.json. Proceeding without MCP tools.'
      );
    }

    // 4. Prepare and Execute streamText Call
    console.log('[ChatHandler:POST] INFO: Preparing streamText call...');
    const streamTextPayload = _prepareStreamTextCallPayload(
      llmConfig!, // llmConfig is defined due to early check
      originalMessages!,
      allDiscoveredTools
    );
    console.log(
      '[ChatHandler:POST] INFO: Executing streamText call. | Model: %s, Temperature: %s, MaxSteps: %s, Tools: %o',
      llmConfig?.model,
      streamTextPayload.temperature,
      streamTextPayload.maxSteps,
      Object.keys(streamTextPayload.tools || {})
    );

    // Inner try for streamText specific operations and its own finally for MCP client cleanup
    try {
      const result = await streamText({
        ...streamTextPayload,
        onFinish: async (event) => {
          console.log(
            '[ChatHandler:POST:streamText:onFinish] INFO: streamText finished. | Usage: %o, FinishReason: %s',
            event.usage,
            event.finishReason
          );
          // This onFinish is for the LLM stream itself. MCP clients are closed after the entire request handler for streamText is done.
        },
      });
      console.log(
        '[ChatHandler:POST] INFO: streamText call initiated successfully, streaming response...'
      );
      return result.toDataStreamResponse();
    } finally {
      // This finally block ensures MCP clients are closed whether streamText succeeds or fails within this inner try
      console.log(
        '[ChatHandler:POST:streamText:finally] INFO: Closing active MCP clients after streamText operation...'
      );
      for (const client of activeMcpClients) {
        try {
          await client.close();
          console.log(
            '[ChatHandler:POST:streamText:finally] INFO: MCP client closed successfully.'
          );
        } catch (closeError: any) {
          console.error(
            '[ChatHandler:POST:streamText:finally] ERROR: Failed to close MCP client. | Error: %o',
            closeError
          );
        }
      }
      console.log(
        '[ChatHandler:POST:streamText:finally] INFO: All active MCP clients processed for closure.'
      );
      const duration = Date.now() - requestTimestamp;
      console.log(
        '[ChatHandler:POST:streamText:finally] INFO: streamText processing block finished. | Duration: %sms',
        duration
      );
    }
  } catch (error: any) {
    // This is the main operational error handler
    console.error(
      '[ChatHandler:POST] CRITICAL_OPERATIONAL_ERROR: Error during main processing. | ErrorName: %s, ErrorMessage: %s, Stack: %s',
      error.name,
      error.message,
      error.stack // Full stack for unexpected operational errors
    );
    // Ensure MCP clients are closed (redundant if the inner finally always runs, but safe)
    // Note: activeMcpClients might not be in scope here if the error happened before its definition in the outer try.
    // However, the structure ensures it is defined if we reach this catch from within the main processing block.

    const duration = Date.now() - requestTimestamp;
    console.error(
      '[ChatHandler:POST] CRITICAL_OPERATIONAL_ERROR: Request failed. | Duration: %sms',
      duration
    );
    return NextResponse.json(
      {
        error:
          'Failed to process chat request due to an internal server error.',
        details: vercelAiErrorHandler(error), // Use the helper to format the error message
      },
      { status: 500 }
    );
  }
}
