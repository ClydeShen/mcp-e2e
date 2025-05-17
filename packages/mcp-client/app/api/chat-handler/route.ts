import { getLLMConfig } from '@/lib/mcp-client-config';
import { AnthropicBedrock } from '@anthropic-ai/bedrock-sdk';
import type {
  MessageCreateParams,
  MessageStreamEvent,
} from '@anthropic-ai/sdk/resources/messages';
import {
  StreamingTextResponse,
  Message as VercelChatMessage,
  experimental_StreamData,
} from 'ai';
import { NextRequest, NextResponse } from 'next/server';

const anthropicBedrock = new AnthropicBedrock({
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  // awsAccessKeyId, awsSecretAccessKey, awsSessionToken can be set if needed,
  // but environment variables or IAM roles are preferred.
});

export async function POST(req: NextRequest) {
  // console.log("AWS_REGION", process.env.AWS_BEDROCK_REGION); // Keep this commented unless debugging region explicitly

  try {
    const body = await req.json();
    const messages: VercelChatMessage[] = body.messages || [];

    if (messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      );
    }

    const currentMessage = messages[messages.length - 1];
    if (currentMessage.role !== 'user') {
      return NextResponse.json(
        { error: 'Last message must be from user' },
        { status: 400 }
      );
    }
    const inputText = currentMessage.content;

    const llmConfig = getLLMConfig();
    if (!llmConfig || !llmConfig.model) {
      console.error(
        'Invalid or missing LLM model configuration in mcp.config.json'
      );
      return NextResponse.json(
        { error: 'LLM model not configured or misconfigured.' },
        { status: 500 }
      );
    }
    const modelId = llmConfig.model;

    const systemPrompt = llmConfig.defaultSystemPrompt;
    const anthropicMessages = messages
      .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

    if (
      anthropicMessages.length === 0 ||
      anthropicMessages[anthropicMessages.length - 1].role !== 'user'
    ) {
      anthropicMessages.push({ role: 'user', content: inputText });
    }

    const data = new experimental_StreamData();

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          const params: MessageCreateParams = {
            model: modelId,
            max_tokens: llmConfig.max_tokens || 1024,
            temperature: llmConfig.temperature || 0.1,
            messages: anthropicMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            stream: true,
          };
          if (systemPrompt) {
            params.system = systemPrompt;
          }

          const messageStream: AsyncIterable<MessageStreamEvent> =
            await anthropicBedrock.messages.create(params);

          for await (const event of messageStream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta?.type === 'text_delta'
            ) {
              const textChunk = event.delta.text;
              controller.enqueue(
                encoder.encode(`0:${JSON.stringify(textChunk)}\n`)
              );
            }
          }
        } catch (error: any) {
          console.error(
            '[CHAT-HANDLER] Error streaming from Anthropic Bedrock:',
            error
          );
          const errorText = `\n[Error communicating with Bedrock via Anthropic SDK: ${error.message}]`;
          controller.enqueue(
            encoder.encode(`0:${JSON.stringify(errorText)}\n`)
          );
        } finally {
          controller.close();
          data.close();
        }
      },
    });

    return new StreamingTextResponse(stream, {}, data);
  } catch (error: any) {
    console.error('[CHAT-HANDLER] POST handler error:', error);
    return NextResponse.json(
      {
        error: error.message || 'An unexpected error occurred in POST handler.',
      },
      { status: 500 }
    );
  }
}
