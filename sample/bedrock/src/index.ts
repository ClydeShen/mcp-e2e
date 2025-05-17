import {
  BedrockRuntimeClient,
  ContentBlock,
  InvokeModelCommand,
  InvokeModelCommandInput,
  Message,
  Tool,
  ToolConfiguration,
  ToolResultBlock,
} from '@aws-sdk/client-bedrock-runtime';
import {
  InvocationType,
  InvokeCommand,
  LambdaClient,
} from '@aws-sdk/client-lambda';
import { APIGatewayProxyResult, Handler } from 'aws-lambda';

// Environment variables
const AWS_REGION = process.env.AWS_REGION || 'ap-southeast-2';
const CLAUDE_MODEL_ID =
  process.env.CLAUDE_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0'; // Ensure this is a model that supports tools
const MCP_LAMBDA_NAME = process.env.MCP_LAMBDA_NAME;

const bedrockClient = new BedrockRuntimeClient({ region: AWS_REGION });
const lambdaClient = new LambdaClient({ region: AWS_REGION });

interface LambdaEvent {
  prompt: string;
  // Potentially add conversationHistory here if maintaining state across multiple turns
}

// Tool definition for Claude - this tells Claude what tools it can request
// This structure should match what MCPLambda can handle.
const tools: Tool[] = [
  {
    toolSpec: {
      name: 'get_customer_plan_info',
      description:
        "Fetches customer plan information based on a customer ID. Use this to find details about a customer's current mobile or broadband plan, data usage, billing, etc.",
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            customerId: {
              type: 'string',
              description:
                'The unique identifier for the customer (e.g., CUST1001)',
            },
          },
          required: ['customerId'],
        },
      },
    },
  },
  {
    toolSpec: {
      name: 'get_product_info',
      description:
        'Fetches details about a specific product or service offered by One NZ, based on a product ID. Use this to get information like price, features, availability.',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            productId: {
              type: 'string',
              description:
                'The unique identifier for the product (e.g., PROD001)',
            },
          },
          required: ['productId'],
        },
      },
    },
  },
  {
    toolSpec: {
      name: 'lookup_knowledge_base',
      description:
        'Searches the knowledge base for articles or troubleshooting guides based on an article ID or keywords. Use this to find help articles, setup guides, or troubleshooting steps.',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            articleId: {
              type: 'string',
              description:
                'The unique identifier for the knowledge base article (e.g., KB001)',
            },
          },
          required: ['articleId'],
        },
      },
    },
  },
];

const toolConfig: ToolConfiguration = {
  tools: tools,
  // toolChoice: { auto: {} } // Let Claude decide when to use tools
};

interface McpLambdaPayload {
  dataType: string;
  id: string;
}

interface ClaudeToolUseResponseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: any;
}

export const handler: Handler<LambdaEvent, APIGatewayProxyResult> = async (
  event
) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  if (!MCP_LAMBDA_NAME) {
    console.error('MCP_LAMBDA_NAME environment variable is not set.');
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server configuration error: MCPLambda name not set.',
      }),
    };
  }

  const userPrompt = event.prompt || 'Tell me about the One NZ Smart Plan.';

  // Initial conversation messages for Claude, explicitly typed
  let messages: Message[] = [
    { role: 'user', content: [{ text: userPrompt }] }, // Wrap prompt in ContentBlock
  ];

  try {
    const bedrockRequestBody = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1024,
      messages: messages,
      tool_config: toolConfig, // Send tool configuration
    };

    console.log(
      'Invoking Bedrock (1st call) with body:',
      JSON.stringify(bedrockRequestBody, null, 2)
    );

    const params: InvokeModelCommandInput = {
      body: JSON.stringify(bedrockRequestBody),
      modelId: CLAUDE_MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
    };

    let bedrockResponse = await bedrockClient.send(
      new InvokeModelCommand(params)
    );
    let responseBody = JSON.parse(
      new TextDecoder().decode(bedrockResponse.body)
    );

    console.log(
      'Bedrock response (1st call):',
      JSON.stringify(responseBody, null, 2)
    );

    // Check if Claude wants to use a tool
    if (responseBody.stop_reason === 'tool_use') {
      console.log('Claude wants to use a tool.');
      messages.push({
        role: 'assistant',
        content: responseBody.content as ContentBlock[],
      }); // Add Claude's tool_use request to messages

      const toolUseBlock = (responseBody.content as ContentBlock[]).find(
        (block) => block.toolUse
      )?.toolUse;

      if (toolUseBlock) {
        const toolName = toolUseBlock.name as string;
        const toolInput = toolUseBlock.input as any;
        const toolUseId = toolUseBlock.toolUseId as string;

        let mcpPayload: McpLambdaPayload;

        // Map Claude tool to MCPLambda dataType and id
        if (toolName === 'get_customer_plan_info' && toolInput.customerId) {
          mcpPayload = {
            dataType: 'customerPlanInfo',
            id: toolInput.customerId,
          };
        } else if (toolName === 'get_product_info' && toolInput.productId) {
          mcpPayload = { dataType: 'productInfo', id: toolInput.productId };
        } else if (
          toolName === 'lookup_knowledge_base' &&
          toolInput.articleId
        ) {
          mcpPayload = { dataType: 'knowledgeBase', id: toolInput.articleId };
        } else {
          console.error(
            'Unknown tool or invalid input from Claude:',
            toolName,
            toolInput
          );
          // Construct error tool_result to send back to Claude
          const errorResult: ToolResultBlock = {
            toolUseId: toolUseId || 'unknown_tool_use_id',
            content: [
              {
                text: `Orchestrator received unknown tool request: ${toolName}`,
              },
            ],
            status: 'error',
          };
          messages.push({
            role: 'user',
            content: [{ toolResult: errorResult }],
          });
          // Skip MCPLambda call and go to 2nd Bedrock call to inform Claude of the error
        }

        if (mcpPayload!) {
          // Check if mcpPayload was set (i.e., not an unknown tool)
          console.log(
            `Invoking MCPLambda (${MCP_LAMBDA_NAME}) with payload:`,
            JSON.stringify(mcpPayload)
          );
          const mcpInvokeCommand = new InvokeCommand({
            FunctionName: MCP_LAMBDA_NAME,
            Payload: JSON.stringify(mcpPayload),
            InvocationType: InvocationType.RequestResponse,
          });

          const mcpResponse = await lambdaClient.send(mcpInvokeCommand);
          const mcpResponseBodyStr = new TextDecoder().decode(
            mcpResponse.Payload
          );
          console.log('MCPLambda response:', mcpResponseBodyStr);

          let toolResultContent: ContentBlock[];
          let toolStatus: 'success' | 'error' = 'success';

          try {
            const mcpData = JSON.parse(mcpResponseBodyStr);
            if (
              mcpResponse.FunctionError ||
              (mcpData.statusCode && mcpData.statusCode >= 400)
            ) {
              console.error('MCPLambda returned an error:', mcpResponseBodyStr);
              toolResultContent = [
                {
                  text: `Error invoking ${toolName}: MCPLambda responded with an error. Details: ${mcpResponseBodyStr}`,
                },
              ];
              toolStatus = 'error';
            } else {
              const actualData = mcpData.body
                ? JSON.parse(mcpData.body)
                : mcpData;
              toolResultContent = [{ text: JSON.stringify(actualData) }];
            }
          } catch (parseError: any) {
            console.error('Error parsing MCPLambda response:', parseError);
            toolResultContent = [
              {
                text: `Error processing tool result for ${toolName}: Could not parse MCPLambda response. Details: ${parseError.message}`,
              },
            ];
            toolStatus = 'error';
          }
          const toolResult: ToolResultBlock = {
            toolUseId,
            content: toolResultContent,
            status: toolStatus,
          };
          messages.push({ role: 'user', content: [{ toolResult }] });
        }

        // Second call to Bedrock with the tool result or error notification
        const bedrockRequestBody2 = {
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 1024,
          messages: messages, // Now includes original prompt, assistant's tool_use, and user's tool_result
          tool_config: toolConfig, // Important to pass tool_config again
        };

        console.log(
          'Invoking Bedrock (2nd call) with body:',
          JSON.stringify(bedrockRequestBody2, null, 2)
        );
        bedrockResponse = await bedrockClient.send(
          new InvokeModelCommand({
            body: JSON.stringify(bedrockRequestBody2),
            modelId: CLAUDE_MODEL_ID,
            contentType: 'application/json',
            accept: 'application/json',
          })
        );
        responseBody = JSON.parse(
          new TextDecoder().decode(bedrockResponse.body)
        );
        console.log(
          'Bedrock response (2nd call):',
          JSON.stringify(responseBody, null, 2)
        );
      } else {
        console.log(
          'Tool use indicated, but no toolUse block found in content.'
        );
        // Proceed without tool use if block is missing, Claude might just output text.
      }
    }

    // Extract final text response from Claude
    const finalClaudeResponseText =
      (responseBody.content as ContentBlock[]).find((c) => c.text)?.text ||
      'No final text content received from Claude after potential tool use.';

    console.log('Final Claude text response:', finalClaudeResponseText);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Successfully processed orchestrator request.',
        claudeResponse: finalClaudeResponseText,
        fullClaudeResponse: responseBody,
        conversationHistory: messages, // For debugging or if state is passed back
      }),
    };
  } catch (error: any) {
    console.error('Error in TestOrchestratorLambda handler:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to process orchestrator request',
        details: error.message,
        name: error.name,
      }),
    };
  }
};
