'use client';

import { useChat } from '@ai-sdk/react';
import { Stack } from '@mui/material';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import * as React from 'react';
import type { ChatBoxProps, Message } from './types';

// Import sub-components
import BaseMessage from './components/BaseMessage'; // Import BaseMessage
import ChatMessageRenderer from './components/ChatMessageRenderer'; // Import the new orchestrator
import ChatToolbar from './components/ChatToolbar';
import { DefaultBotAvatar } from './components/DefaultAvatars'; // Import shared DefaultBotAvatar
import GreetingMessage from './components/GreetingMessage';

export default function ChatBox(props: ChatBoxProps) {
  const {
    api,
    sx,
    renderMessage, // This prop will be passed to ChatMessageRenderer
    inputPlaceholder = 'Type your message...',
    messageActions, // This prop will be passed to ChatMessageRenderer
    header,
    footer,
    initialMessages,
    initialInput,
    onFinish,
    onError,
    showFileSelector,
    showVoiceInput,
    slots = {}, // Default to empty object
    slotProps = {}, // Default to empty object
    disableUserAvatar = false, // New prop with default
    disableBotAvatar = false, // New prop with default
  } = props;

  const { messages, input, handleInputChange, handleSubmit, status, error } =
    useChat({
      api: api,
      initialMessages,
      initialInput,
      onFinish,
      onError: (e: Error) => {
        console.error('Chat error:', e);
        if (onError) {
          onError(e);
        }
      },
      maxSteps: 5, // Allow multiple steps for tool calls and follow-up responses
      async onToolCall({ toolCall }) {
        const { toolName, args } = toolCall;

        if (toolName.startsWith('filesystem_')) {
          const providerId = 'filesystem';
          // Extract the actual command name, e.g., 'directory_tree' from 'filesystem_directory_tree'
          const commandName = toolName.substring(providerId.length + 1);

          // Construct the payload expected by the filesystem STDIO server
          const stdioServerPayload = {
            command: commandName,
            args: args, // The arguments from the LLM for that specific command
          };

          try {
            console.log(
              `[ChatBox] Executing tool: ${toolName} for provider: ${providerId} with payload:`,
              stdioServerPayload
            );
            const response = await fetch('/api/execute-tool', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                providerId: providerId,
                toolArgs: stdioServerPayload, // This will be stringified again by execute-tool route for inputData
              }),
            });

            if (!response.ok) {
              const errorData = await response
                .json()
                .catch(() => ({ error: response.statusText }));
              console.error(
                `[ChatBox] Error from /api/execute-tool for ${toolName}: ${
                  errorData.error || response.statusText
                }`
              );
              throw new Error(
                `Tool execution via API failed for ${toolName}: ${
                  errorData.error || response.statusText
                }`
              );
            }

            const responseData = await response.json();
            console.log(
              `[ChatBox] Result from /api/execute-tool for ${toolName}:`,
              responseData.result
            );
            return responseData.result; // The AI SDK expects the direct result here
          } catch (e: any) {
            console.error(
              `[ChatBox] Failed to execute tool ${toolName} via /api/execute-tool:`,
              e
            );
            // Let the error propagate to useChat's onError or throw it
            // To make it visible in UI, ensure it's an Error object or string
            throw new Error(
              `Execution failed for ${toolName}: ${e.message || e.toString()}`
            );
          }
        } else {
          // Fallback for other tools (e.g., aws-documentation) or if a tool isn't handled above
          console.warn(
            `[ChatBox] Simulating tool call for unhandled tool: ${toolName}`
          );
          const minimalResultString = `Tool ${toolName} called (simulated). Args: ${JSON.stringify(
            args
          )}.`;
          return minimalResultString;
        }
      },
    });

  const isProcessing = status === 'submitted' || status === 'streaming';

  const messagesEndRef = React.useRef<null | HTMLDivElement>(null);
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Determine which components to use based on slots, falling back to defaults
  const GreetingMessageComponent = slots.greetingMessage || GreetingMessage;
  const ChatToolbarComponent = slots.chatToolbar || ChatToolbar;

  // Determine the Bot Avatar to render for the "AI is thinking..." message
  const BotAvatarComponentToRender =
    !disableBotAvatar && (slots.botMessageAvatar || DefaultBotAvatar);

  // Prepare props for ChatMessageRenderer, including slots for individual message types
  const chatMessageRendererSlots = {
    userMessage: slots.userMessage,
    botMessage: slots.botMessage,
    botTool: slots.botTool,
    userMessageAvatar: slots.userMessageAvatar,
    botMessageAvatar: slots.botMessageAvatar,
  };

  const chatMessageRendererSlotProps = {
    userMessage: slotProps.userMessage,
    botMessage: slotProps.botMessage,
    botTool: slotProps.botTool,
    userMessageAvatar: slotProps.userMessageAvatar,
    botMessageAvatar: slotProps.botMessageAvatar,
  };

  return (
    <Stack spacing={1} sx={{ height: '100%', ...sx }}>
      {header}
      <Paper
        elevation={0}
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          p: 2,
          mb: 0,
          borderColor: 'divider',
          borderRadius: 0,
          bgcolor: 'background.default',
        }}
      >
        <List sx={{ py: 0 }}>
          {messages.length === 0 && !isProcessing && !error && (
            <GreetingMessageComponent {...(slotProps.greetingMessage || {})} />
          )}
          {messages.map((m: Message, index: number) => (
            <ChatMessageRenderer
              key={m.id || `message-${index}`} // Ensure key is always present
              id={m.id || `message-item-${index}`} // Pass down an id for the renderer to use/propagate
              message={m}
              messageActions={messageActions}
              customRenderMessage={renderMessage} // Pass the custom renderer prop
              // Pass down the relevant slots and slotProps for individual message components
              slots={chatMessageRendererSlots}
              slotProps={chatMessageRendererSlotProps}
              disableUserAvatar={disableUserAvatar} // Pass down
              disableBotAvatar={disableBotAvatar} // Pass down
            />
          ))}
          <div ref={messagesEndRef} />
        </List>
        {isProcessing && (
          <BaseMessage
            id='chatbox-processing-indicator'
            message={{
              id: 'processing-indicator',
              role: 'assistant',
              content: '' /* Dummy content, not rendered directly */,
            }}
            avatar={BotAvatarComponentToRender || undefined}
            avatarProps={slotProps.botMessageAvatar || {}}
            avatarSide='left'
            renderContent={() => <CircularProgress size={20} />}
            bubbleSx={{
              p: 1.5, // Padding inside the bubble
              borderRadius: 2,
              bgcolor: 'grey.100',
              color: 'text.primary',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '40px',
              minWidth: '40px',
            }}
            // sx for ListItem can be added here if specific overrides are needed
          />
        )}
        {error && (
          <ListItem sx={{ justifyContent: 'center', py: 1 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 1,
                bgcolor: 'error.light',
                color: 'error.contrastText',
              }}
            >
              <Typography variant='body2'>
                Error: {error.message || 'Could not connect to the AI'}
              </Typography>
            </Box>
          </ListItem>
        )}
      </Paper>
      <ChatToolbarComponent
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        inputPlaceholder={inputPlaceholder}
        isProcessing={isProcessing}
        showFileSelector={showFileSelector}
        showVoiceInput={showVoiceInput}
        // Spread slotProps for the toolbar, allowing overrides of default/passed props
        {...(slotProps.chatToolbar || {})}
        // Ensure id from slotProps can override, or generate one if ChatToolbar is the root for an id
        id={
          slotProps.chatToolbar?.id || props.id
            ? `${props.id}-toolbar`
            : undefined
        }
      />
      {footer}
    </Stack>
  );
}
