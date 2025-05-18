import {
  getMcpProviderById, // This is now a union type
  McpStdioProvider,
} from '@/lib/mcp-client-config';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { NextRequest, NextResponse } from 'next/server';

interface StdioHandlerRequest {
  providerId: string;
  inputData: string;
}

interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

// Helper function to spawn process and get response
async function _spawnAndGetResponse(
  stdioProvider: McpStdioProvider,
  inputData: string,
  providerId: string // Added providerId for logging consistency
): Promise<SpawnResult> {
  return new Promise((resolve) => {
    const commandExecutable = stdioProvider.command;
    const commandArgs = stdioProvider.args || [];

    const child: ChildProcessWithoutNullStreams = spawn(
      commandExecutable,
      commandArgs,
      {
        cwd: stdioProvider.cwd || process.cwd(),
        env: { ...process.env, ...stdioProvider.env },
        stdio: ['pipe', 'pipe', 'pipe'], // Ensure stdio options are correctly typed for ChildProcessWithoutNullStreams
      }
    );

    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', (data: Buffer) => {
      console.log('[MCP-STDIO-HANDLER] Raw STDOUT Data Chunk (Buffer):', data);
      console.log(
        '[MCP-STDIO-HANDLER] Raw STDOUT Data Chunk (String):',
        data.toString()
      );
      stdoutData += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      console.log('[MCP-STDIO-HANDLER] Raw STDERR Data Chunk (Buffer):', data);
      console.log(
        '[MCP-STDIO-HANDLER] Raw STDERR Data Chunk (String):',
        data.toString()
      );
      stderrData += data.toString();
    });

    child.on('error', (error) => {
      console.error(
        `[MCP-STDIO-HANDLER] Failed to start process for "${providerId}":`,
        error
      );
      // Resolve with error information, but let the main handler decide the HTTP response
      resolve({
        stdout: stdoutData,
        stderr: `Failed to start STDIO process: ${error.message}`,
        exitCode: null, // Or a specific error code if applicable
      });
    });

    child.on('close', (code) => {
      console.log(
        `[MCP-STDIO-HANDLER] Child process for "${providerId}" closed with code ${code}.`
      );
      console.log(
        `[MCP-STDIO-HANDLER] STDOUT for "${providerId}":\n${stdoutData}`
      );
      console.log(
        `[MCP-STDIO-HANDLER] STDERR for "${providerId}":\n${stderrData}`
      );
      if (code !== 0 && stderrData === '') {
        // check if stderrData is empty string
        stderrData = `STDIO process for "${providerId}" exited with code ${code}`;
      }
      resolve({
        stdout: stdoutData,
        stderr: stderrData,
        exitCode: code,
      });
    });

    console.log(
      `[MCP-STDIO-HANDLER] Writing to STDIN for "${providerId}":\n${inputData}`
    );
    if (inputData) {
      child.stdin.write(inputData + '\n');
    }
    child.stdin.end();
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as StdioHandlerRequest;
    const { providerId, inputData } = body;

    if (!providerId || typeof inputData === 'undefined') {
      return NextResponse.json(
        { error: 'Missing providerId or inputData' },
        { status: 400 }
      );
    }

    const provider = getMcpProviderById(providerId);

    if (!provider) {
      return NextResponse.json(
        { error: `Provider with id "${providerId}" not found.` },
        { status: 404 }
      );
    }

    // Determine effectiveType for the provider, similar to chat-handler
    let effectiveType = provider.type;
    if (
      !effectiveType &&
      'command' in provider &&
      typeof provider.command === 'string'
    ) {
      effectiveType = 'stdio';
    }

    if (effectiveType !== 'stdio') {
      return NextResponse.json(
        {
          error: `Provider "${providerId}" is not a configured STDIO provider (type is '${
            effectiveType || 'undefined'
          }').`,
        },
        { status: 400 }
      );
    }

    // Now we can safely cast to McpStdioProvider
    const stdioProvider = provider as McpStdioProvider;

    // The command presence is already implicitly checked by the effectiveType logic for stdio,
    // but an explicit check on stdioProvider.command (which should exist if type is stdio)
    // isn't harmful, though might be redundant if types are strict.
    // Given McpStdioProvider type mandates command, this specific check might be less critical here
    // if effectiveType derivation is robust.
    // For now, let's rely on the effectiveType === 'stdio' implying command exists as per McpStdioProvider type.

    // Call the helper function
    const result = await _spawnAndGetResponse(
      stdioProvider,
      inputData,
      providerId
    );

    // Determine response based on helper function's result
    if (result.stderr && result.exitCode !== 0 && result.exitCode !== null) {
      // Added null check for exitCode
      // If there was an error starting the process (indicated by specific stderr from _spawnAndGetResponse error handler)
      // or if the process exited with an error code.
      // Note: _spawnAndGetResponse's 'error' event already logs to console.
      return NextResponse.json(
        {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
        },
        // Optionally, decide status based on exitCode or specific stderr messages
        result.stderr.startsWith('Failed to start STDIO process:')
          ? { status: 500 }
          : { status: 200 } // Or 400/500 based on error type
      );
    }

    return NextResponse.json(result); // This will send { stdout, stderr, exitCode }
  } catch (error: any) {
    console.error('[MCP-STDIO-HANDLER] Error:', error);
    let errorMessage = 'An unexpected error occurred.';
    if (error instanceof SyntaxError) {
      errorMessage = 'Invalid JSON in request body.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
