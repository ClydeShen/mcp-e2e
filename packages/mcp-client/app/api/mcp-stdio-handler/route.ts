import { getMcpProviderById, StdioConfig } from '@/lib/mcp-client-config';
import { spawn } from 'child_process';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

interface StdioRequest {
  providerId: string;
  inputData: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as StdioRequest;
    const { providerId, inputData } = body;

    if (!providerId || typeof inputData === 'undefined') {
      return NextResponse.json(
        { error: 'Missing providerId or inputData' },
        { status: 400 }
      );
    }

    const providerConfig = getMcpProviderById(providerId);

    if (!providerConfig) {
      return NextResponse.json(
        { error: `Provider with id ${providerId} not found.` },
        { status: 404 }
      );
    }

    if (providerConfig.type !== 'stdio') {
      return NextResponse.json(
        { error: `Provider ${providerId} is not of type stdio.` },
        { status: 400 }
      );
    }

    const stdioConfig = providerConfig.config as StdioConfig;
    if (!stdioConfig.command || stdioConfig.command.length === 0) {
      return NextResponse.json(
        {
          error: `Provider ${providerId} has invalid stdio command configuration.`,
        },
        { status: 500 }
      );
    }

    // Resolve command path relative to monorepo root if it looks like a path
    // This is a simple heuristic; adjust if necessary for your command structure
    const commandParts = [...stdioConfig.command];
    const executable = commandParts[0];
    const args = commandParts.slice(1);

    // Determine CWD: Use providerConfig.config.cwd or default to monorepo root for path resolution
    // For simplicity, assuming commands are often specified relative to the monorepo root or are globally available.
    // If a command is like `node ./packages/some-script.js`, process.cwd() (mcp-client package root) might not be correct.
    // Using an absolute path or a CWD relative to the monorepo root might be more robust.
    // For now, let's assume commands are either global or paths are handled by the execution environment correctly.
    // A more robust solution might involve resolving paths based on a known monorepo root marker.
    const effectiveCwd = stdioConfig.cwd
      ? path.resolve(process.cwd(), '../../', stdioConfig.cwd)
      : path.resolve(process.cwd(), '../../');
    // process.cwd() for an API route in Next.js is typically the root of the Next.js project (e.g., packages/mcp-client)
    // So, '../../' goes up to the monorepo root (mcp-e2e)

    return new Promise((resolve) => {
      const child = spawn(executable, args, {
        cwd: effectiveCwd, // TR_CONFIG_004: Optional cwd
        env: { ...process.env, ...stdioConfig.env }, // TR_CONFIG_004: Optional env
        stdio: ['pipe', 'pipe', 'pipe'], // stdin, stdout, stderr
      });

      let stdoutData = '';
      let stderrData = '';
      let errorOccurred = false;

      child.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      child.on('error', (err) => {
        errorOccurred = true;
        console.error(
          `[mcp-stdio-handler] Failed to start process for ${providerId}:`,
          err
        );
        resolve(
          NextResponse.json(
            {
              error: `Failed to start process: ${err.message}`,
              stderr: stderrData,
              stdout: stdoutData,
            },
            { status: 500 }
          )
        );
      });

      child.on('close', (code) => {
        if (errorOccurred) return; // Error already handled by 'error' event

        if (code === 0) {
          resolve(
            NextResponse.json({
              output: stdoutData,
              stderr: stderrData || undefined,
            })
          );
        } else {
          console.error(
            `[mcp-stdio-handler] Process for ${providerId} exited with code ${code}. Stderr: ${stderrData}`
          );
          resolve(
            NextResponse.json(
              {
                error: `Process exited with code ${code}.`,
                stderr: stderrData,
                stdout: stdoutData,
              },
              { status: 500 }
            )
          );
        }
      });

      try {
        child.stdin.write(inputData);
        child.stdin.end();
      } catch (stdinError: any) {
        errorOccurred = true;
        console.error(
          `[mcp-stdio-handler] Error writing to stdin for ${providerId}:`,
          stdinError
        );
        // Try to kill the process if it started, as stdin is broken
        child.kill();
        resolve(
          NextResponse.json(
            {
              error: `Error writing to stdin: ${stdinError.message}`,
              stderr: stderrData,
              stdout: stdoutData,
            },
            { status: 500 }
          )
        );
      }
    });
  } catch (error: any) {
    console.error('[mcp-stdio-handler] Error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
