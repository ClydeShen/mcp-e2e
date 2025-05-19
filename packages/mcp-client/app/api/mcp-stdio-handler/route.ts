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
  stdioProvider: McpStdioProvider, // Type is already specific
  inputData: string,
  providerId: string
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
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );

    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', (data: Buffer) => {
      console.debug(
        '[McpStdioHandler:_spawnAndGetResponse] DEBUG: Raw STDOUT Data Chunk (Buffer) | ProviderID: %s, Chunk: %o',
        providerId,
        data
      );
      console.debug(
        '[McpStdioHandler:_spawnAndGetResponse] DEBUG: Raw STDOUT Data Chunk (String) | ProviderID: %s, Chunk: %s',
        providerId,
        data.toString()
      );
      stdoutData += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      console.debug(
        '[McpStdioHandler:_spawnAndGetResponse] DEBUG: Raw STDERR Data Chunk (Buffer) | ProviderID: %s, Chunk: %o',
        providerId,
        data
      );
      console.debug(
        '[McpStdioHandler:_spawnAndGetResponse] DEBUG: Raw STDERR Data Chunk (String) | ProviderID: %s, Chunk: %s',
        providerId,
        data.toString()
      );
      stderrData += data.toString();
    });

    child.on('error', (error) => {
      console.error(
        '[McpStdioHandler:_spawnAndGetResponse] ERROR: Failed to start process | ProviderID: %s, Error: %o',
        providerId,
        error
      );
      resolve({
        stdout: stdoutData,
        stderr: `Failed to start STDIO process: ${error.message}`,
        exitCode: null,
      });
    });

    child.on('close', (code) => {
      console.info(
        '[McpStdioHandler:_spawnAndGetResponse] INFO: Child process closed | ProviderID: %s, Code: %s',
        providerId,
        code
      );
      console.debug(
        '[McpStdioHandler:_spawnAndGetResponse] DEBUG: STDOUT on close | ProviderID: %s, STDOUT: %s',
        providerId,
        stdoutData
      );
      console.debug(
        '[McpStdioHandler:_spawnAndGetResponse] DEBUG: STDERR on close | ProviderID: %s, STDERR: %s',
        providerId,
        stderrData
      );
      if (code !== 0 && stderrData === '') {
        stderrData = `STDIO process for "${providerId}" exited with code ${code}`;
      }
      resolve({
        stdout: stdoutData,
        stderr: stderrData,
        exitCode: code,
      });
    });

    console.debug(
      '[McpStdioHandler:_spawnAndGetResponse] DEBUG: Writing to STDIN | ProviderID: %s, InputData: %s',
      providerId,
      inputData
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

    // Directly use provider.type as it's validated by getMcpConfig
    if (provider.type !== 'stdio') {
      return NextResponse.json(
        {
          error: `Provider "${providerId}" is not a configured STDIO provider (type is '${
            provider.type || 'undefined' // provider.type will always exist here
          }').`,
        },
        { status: 400 }
      );
    }

    // Now we can safely cast to McpStdioProvider (though it's already narrowed by the check above)
    const stdioProvider = provider as McpStdioProvider;

    const result = await _spawnAndGetResponse(
      stdioProvider,
      inputData,
      providerId
    );

    if (result.stderr && result.exitCode !== 0 && result.exitCode !== null) {
      return NextResponse.json(
        {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
        },
        result.stderr.startsWith('Failed to start STDIO process:')
          ? { status: 500 }
          : { status: 200 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error(
      '[McpStdioHandler:POST] ERROR: Handler error | Error: %o',
      error
    );
    let errorMessage = 'An unexpected error occurred.';
    if (error instanceof SyntaxError) {
      errorMessage = 'Invalid JSON in request body.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
