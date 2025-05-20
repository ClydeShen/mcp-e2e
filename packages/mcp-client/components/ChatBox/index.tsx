'use client';

import { useChat } from '@ai-sdk/react';
import { Stack } from '@mui/material';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { Message as VercelAIMessage } from 'ai';
import * as React from 'react';
import type { ChatBoxProps, Message } from './types';

// Import sub-components
import { ChatBoxProvider } from './ChatBoxContext'; // Import the provider
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
  const rootId = props.id || 'chatbox';
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    error,
    stop,
    reload,
    setMessages,
  } = useChat({
    api: api,
    initialMessages,
    initialInput,
    onFinish,
    onError: (e: Error) => {
      console.error(
        '[ChatBox:useChat] ERROR: Chat error | Message: %s, Error: %o',
        e.message,
        e
      );
      if (onError) {
        onError(e);
      }
    },
    maxSteps: props.maxSteps || 5, // Allow multiple steps for tool calls and follow-up responses
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
            '[ChatBox:onToolCall] INFO: Executing filesystem tool | ToolName: %s, ProviderID: %s, Payload: %o',
            toolName,
            providerId,
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
              '[ChatBox:onToolCall] ERROR: API error for filesystem tool | ToolName: %s, Error: %s',
              toolName,
              errorData.error || response.statusText
            );
            throw new Error(
              `Tool execution via API failed for ${toolName}: ${
                errorData.error || response.statusText
              }`
            );
          }

          const responseData = await response.json();
          console.log(
            '[ChatBox:onToolCall] DEBUG: Result from API for filesystem tool | ToolName: %s, Result: %o',
            toolName,
            responseData.result
          );
          return responseData.result; // The AI SDK expects the direct result here
        } catch (e: any) {
          console.error(
            '[ChatBox:onToolCall] ERROR: Failed to execute filesystem tool via API | ToolName: %s, Error: %o',
            toolName,
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
          '[ChatBox:onToolCall] WARN: Simulating tool call for unhandled tool | ToolName: %s, Args: %o',
          toolName,
          args
        );
        const minimalResultString = `Tool ${toolName} called (simulated). Args: ${JSON.stringify(
          args
        )}.`;
        return minimalResultString;
      }
    },
  });

  // Vercel AI SDK useChat status can be 'idle', 'loading', 'streaming'
  const isActive =
    (status as string) === 'loading' || (status as string) === 'streaming';

  const handleStopProcessing = () => {
    stop(); // From useChat, stops the LLM response generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort(); // Abort any ongoing fetch in onToolCall
    }
    console.log(
      '[ChatBox:handleStopProcessing] INFO: Stop processing initiated.'
    );
  };

  const messagesEndRef = React.useRef<null | HTMLDivElement>(null);
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ADDED: Handler for regenerating response to a user message
  const handleRegenerateResponse = (messageId: string) => {
    const messageIndex = messages.findIndex((msg) => msg.id === messageId);
    if (messageIndex === -1) {
      console.error(
        '[ChatBox:handleRegenerateResponse] ERROR: Message to regenerate not found | MessageID: %s',
        messageId
      );
      return;
    }

    const targetMessage = messages[messageIndex];
    if (targetMessage.role !== 'user') {
      console.warn(
        '[ChatBox:handleRegenerateResponse] WARN: Attempted to regenerate response for a non-user message | MessageID: %s',
        messageId
      );
      return;
    }

    // Create a history up to and including the target user message
    const historyToReload = messages.slice(0, messageIndex + 1);

    console.log(
      '[ChatBox:handleRegenerateResponse] INFO: Regenerating response for user message | History: %o',
      historyToReload
    );
    // Set the messages to the history up to the point of the user message,
    // then call reload to get a new assistant response.
    setMessages(historyToReload as VercelAIMessage[]); // Type assertion as Vercel AI SDK Message type
    reload(); // Reload will use the newly set messages
  };

  const handleEditSubmit = (messageId: string, newContent: string) => {
    const messageIndex = messages.findIndex((msg) => msg.id === messageId);
    if (messageIndex === -1) {
      console.error(
        '[ChatBox:handleEditSubmit] ERROR: Message to edit not found | MessageID: %s',
        messageId
      );
      return;
    }

    const updatedMessages = messages.map((msg, index) => {
      if (index === messageIndex) {
        return { ...msg, content: newContent };
      }
      return msg;
    });

    // Create a history up to and including the EDITED user message
    const historyToReload = updatedMessages.slice(0, messageIndex + 1);

    console.log(
      '[ChatBox:handleEditSubmit] INFO: Submitting edited message | History: %o',
      historyToReload
    );
    setMessages(historyToReload as VercelAIMessage[]);
    reload();
  };

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
    statusDisplay: slots.statusDisplay,
  };

  const chatMessageRendererSlotProps = {
    userMessage: slotProps.userMessage,
    botMessage: slotProps.botMessage,
    botTool: slotProps.botTool,
    userMessageAvatar: slotProps.userMessageAvatar,
    botMessageAvatar: slotProps.botMessageAvatar,
    statusDisplayProps: slotProps.statusDisplayProps,
  };

  const lastMessage =
    messages.length > 0 ? messages[messages.length - 1] : undefined;
  // Show processing indicator (spinner) if active and last message isn't a tool result (meaning AI is thinking text)
  const showProcessingIndicator =
    isActive && (!lastMessage || (lastMessage.role as string) !== 'tool');

  const contextValue = {
    rootId,
    slots,
    slotProps,
    disableUserAvatar,
    disableBotAvatar,
    onRegenerate: handleRegenerateResponse,
    onEditSubmit: handleEditSubmit,
  };

  return (
    <ChatBoxProvider value={contextValue}>
      <Stack spacing={1} sx={{ height: '100%', ...sx }} id={`${rootId}-root`}>
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
            {messages.length === 0 && !isActive && !error && (
              <GreetingMessageComponent
                {...(slotProps.greetingMessage || {})}
                id={`${rootId}-greeting`}
              />
            )}
            {messages.map((m: Message, index: number) => (
              <ChatMessageRenderer
                key={m.id || `message-${index}`}
                id={m.id || `${rootId}-message-${index}`}
                message={m}
                messageActions={messageActions}
                customRenderMessage={renderMessage}
              />
            ))}
            <div ref={messagesEndRef} />
          </List>
          {showProcessingIndicator && (
            <BaseMessage
              id={`${rootId}-processing-indicator`}
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
            <ListItem
              id={`${rootId}-error-message`}
              sx={{ justifyContent: 'center', py: 1 }}
            >
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
          isProcessing={isActive}
          onStopProcessing={handleStopProcessing}
          showFileSelector={showFileSelector}
          showVoiceInput={showVoiceInput}
          {...(slotProps.chatToolbar || {})}
        />
        {footer}
      </Stack>
    </ChatBoxProvider>
  );
}
