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
  try {
    const body = (await req.json()) as ExecuteToolRequest;
    const { llmToolName, toolArgsFromLlm } = body;

    if (!llmToolName || typeof toolArgsFromLlm === 'undefined') {
      return NextResponse.json(
        { error: 'Missing llmToolName or toolArgsFromLlm' },
        { status: 400 }
      );
    }

    const providerIdForExecution =
      toolArgsFromLlm.provider_id_for_tool_execution;
    const commandForStdio = toolArgsFromLlm.command;

    if (!providerIdForExecution || !commandForStdio) {
      return NextResponse.json(
        {
          error:
            'Tool arguments from LLM are missing required fields: command or provider_id_for_tool_execution',
        },
        { status: 400 }
      );
    }

    // inputData for executeMcpTool is the stringified toolArgsFromLlm,
    // as the underlying STDIO server expects the full JSON object with 'command' and other args.
    const inputData = JSON.stringify(toolArgsFromLlm);

    const result: McpToolExecutionResult = await executeMcpTool(
      providerIdForExecution, // Use the providerId extracted from LLM args
      inputData
    );

    if (result.error) {
      // Log the error server-side for more details
      console.error(
        `[EXECUTE-TOOL] Error executing tool for provider ${providerIdForExecution}: ${result.error}`
      );
      // Send a generic or specific error back to client
      return NextResponse.json(
        { error: `Tool execution failed: ${result.error}` },
        { status: 500 } // Or 400/200 depending on error type if available
      );
    }

    // If the tool output is expected to be JSON, try to parse it.
    // Otherwise, send as text.
    try {
      const jsonOutput = JSON.parse(result.output || '');
      return NextResponse.json({ result: jsonOutput });
    } catch (e) {
      // If output is not JSON, return it as plain text
      return NextResponse.json({ result: result.output });
    }
  } catch (error: any) {
    console.error('[EXECUTE-TOOL] Unexpected error in handler:', error);
    let errorMessage = 'An unexpected error occurred during tool execution.';
    if (error instanceof SyntaxError) {
      errorMessage = 'Invalid JSON in request body.';
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
