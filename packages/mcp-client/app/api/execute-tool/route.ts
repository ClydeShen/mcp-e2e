import {
  executeMcpTool,
  McpToolExecutionResult,
} from '@/lib/mcp-tool-executor'; // Assuming @ is mapped to root or lib
import { NextRequest, NextResponse } from 'next/server';

interface ExecuteToolRequest {
  // providerId: string; // This will now come from toolArgsFromLlm
  llmToolName: string; // e.g., Context7MCPServerResolveLibraryId
  toolArgsFromLlm: any; // These are the arguments from the LLM, containing 'command' and 'provider_id_for_tool_execution'
}

export async function POST(req: NextRequest) {
  console.log(
    '[ExecuteTool:POST] INFO: Received POST request. | URL: %s, Headers: %o',
    req.url,
    Object.fromEntries(req.headers)
  );
  const requestTimestamp = Date.now();
  let providerIdForExecution: string | undefined;
  let llmToolNameReceived: string | undefined;
  let actualToolNameExtracted: string | undefined;

  try {
    const body = (await req.json()) as ExecuteToolRequest;
    llmToolNameReceived = body.llmToolName; // For logging in catch/finally
    const { toolArgsFromLlm } = body;

    console.log(
      '[ExecuteTool:POST] INFO: Validating request body... | Body: %o',
      body
    );

    if (!llmToolNameReceived || typeof toolArgsFromLlm === 'undefined') {
      console.warn(
        '[ExecuteTool:POST] WARN: Validation failed - Missing llmToolName or toolArgsFromLlm.'
      );
      return NextResponse.json(
        { error: 'Missing llmToolName or toolArgsFromLlm' },
        { status: 400 }
      );
    }

    providerIdForExecution = toolArgsFromLlm.provider_id_for_tool_execution;

    if (!providerIdForExecution) {
      console.warn(
        '[ExecuteTool:POST] WARN: Validation failed - Tool arguments from LLM are missing provider_id_for_tool_execution.'
      );
      return NextResponse.json(
        {
          error:
            'Tool arguments from LLM are missing required field: provider_id_for_tool_execution',
        },
        { status: 400 }
      );
    }
    console.log(
      '[ExecuteTool:POST] INFO: Request body validated. | ProviderForExecution: %s, LLMToolName: %s',
      providerIdForExecution,
      llmToolNameReceived
    );

    actualToolNameExtracted = llmToolNameReceived;
    if (llmToolNameReceived.startsWith(providerIdForExecution + '_')) {
      actualToolNameExtracted = llmToolNameReceived.substring(
        providerIdForExecution.length + 1
      );
    }
    console.log(
      '[ExecuteTool:POST] INFO: Actual tool name extracted. | ActualToolName: %s',
      actualToolNameExtracted
    );

    const executionPayload = {
      tool_name: actualToolNameExtracted,
      arguments: toolArgsFromLlm.arguments || toolArgsFromLlm.args || {},
    };
    const inputData = JSON.stringify(executionPayload);

    console.log(
      '[ExecuteTool:POST] INFO: Calling executeMcpTool... | ProviderID: %s, InputData: %s',
      providerIdForExecution,
      inputData
    );

    const result: McpToolExecutionResult = await executeMcpTool(
      providerIdForExecution,
      inputData
    );

    console.log(
      '[ExecuteTool:POST] INFO: executeMcpTool returned. | ProviderID: %s, Success: %s',
      providerIdForExecution,
      !result.error
    );

    if (result.error) {
      console.error(
        '[ExecuteTool:POST] ERROR: Error from executeMcpTool. | ProviderID: %s, LLMToolName: %s, ActualToolName: %s, Error: %s',
        providerIdForExecution,
        llmToolNameReceived,
        actualToolNameExtracted,
        result.error
      );
      return NextResponse.json(
        { error: `Tool execution failed: ${result.error}` },
        { status: 500 }
      );
    }

    try {
      const jsonOutput = JSON.parse(result.output || '');
      console.log(
        '[ExecuteTool:POST] INFO: Successfully executed tool and parsed output as JSON. | ProviderID: %s, LLMToolName: %s, Result: %o',
        providerIdForExecution,
        llmToolNameReceived,
        jsonOutput
      );
      const duration = Date.now() - requestTimestamp;
      console.log(
        '[ExecuteTool:POST] INFO: Request processed successfully (JSON output). | Duration: %sms',
        duration
      );
      return NextResponse.json({ result: jsonOutput });
    } catch (e) {
      console.log(
        '[ExecuteTool:POST] INFO: Successfully executed tool, output is not JSON (or empty). | ProviderID: %s, LLMToolName: %s, Output: %s',
        providerIdForExecution,
        llmToolNameReceived,
        result.output ? result.output.substring(0, 200) + '...' : '' // Log snippet
      );
      const duration = Date.now() - requestTimestamp;
      console.log(
        '[ExecuteTool:POST] INFO: Request processed successfully (non-JSON/empty output). | Duration: %sms',
        duration
      );
      return NextResponse.json({ result: result.output });
    }
  } catch (error: any) {
    console.error(
      '[ExecuteTool:POST] CRITICAL: Unexpected error in POST handler. | ProviderID: %s, LLMToolName: %s, ActualToolName: %s, ErrorName: %s, ErrorMessage: %s, Stack: %s',
      providerIdForExecution || 'unknown',
      llmToolNameReceived || 'unknown',
      actualToolNameExtracted || 'unknown',
      error.name,
      error.message,
      error.stack
    );
    let errorMessage = 'An unexpected error occurred during tool execution.';
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      errorMessage = 'Invalid JSON in request body.';
    }
    const duration = Date.now() - requestTimestamp;
    console.error(
      '[ExecuteTool:POST] CRITICAL: Request failed. | Duration: %sms',
      duration
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
