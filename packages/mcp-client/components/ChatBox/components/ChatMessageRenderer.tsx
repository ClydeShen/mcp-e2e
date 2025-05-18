'use client';

import { TextUIPart, ToolInvocationUIPart } from '@ai-sdk/ui-utils';
import { Box, IconButton, ListItem, Typography } from '@mui/material'; // For combined text/tool messages
import React from 'react';
import type { Message, MessageAction, MessageRenderProps } from '../types';
import BotMessage from './BotMessage';
import BotTool from './BotTool';
import UserMessage from './UserMessage';

// Import prop types for more specific slotProps typing
import type { BotMessageProps } from './BotMessage';
import type { BotToolProps } from './BotTool';
import type { UserMessageProps } from './UserMessage';

// Import the shared default avatar components
import { DefaultBotAvatar, DefaultUserAvatar } from './DefaultAvatars';

// Define slot types specifically for ChatMessageRenderer
interface MessageRendererSlots {
  userMessage?: React.ElementType;
  botMessage?: React.ElementType;
  botTool?: React.ElementType;
  userMessageAvatar?: React.ElementType;
  botMessageAvatar?: React.ElementType;
}

interface MessageRendererSlotProps {
  userMessage?: Partial<UserMessageProps>;
  botMessage?: Partial<BotMessageProps>;
  botTool?: Partial<BotToolProps>;
  userMessageAvatar?: object;
  botMessageAvatar?: object;
}

interface ChatMessageRendererProps {
  id?: string; // ID for the root element rendered by this component (e.g., ListItem for mixed content)
  message: Message;
  messageActions?: MessageAction[];
  customRenderMessage?: (
    props: MessageRenderProps & { id?: string }
  ) => React.ReactNode;
  slots?: MessageRendererSlots; // Slots passed down from ChatBox
  slotProps?: MessageRendererSlotProps; // SlotProps passed down from ChatBox
  disableUserAvatar?: boolean;
  disableBotAvatar?: boolean;
}

const ChatMessageRenderer: React.FC<ChatMessageRendererProps> = ({
  id,
  message,
  messageActions,
  customRenderMessage,
  slots = {},
  slotProps = {},
  disableUserAvatar = false,
  disableBotAvatar = false,
}) => {
  if (customRenderMessage) {
    return customRenderMessage({ message, id });
  }

  const UserMessageComponent = slots.userMessage || UserMessage;
  const BotMessageComponent = slots.botMessage || BotMessage;
  const BotToolComponent = slots.botTool || BotTool;

  const UserAvatarToRender =
    !disableUserAvatar && (slots.userMessageAvatar || DefaultUserAvatar);
  const BotAvatarToRender =
    !disableBotAvatar && (slots.botMessageAvatar || DefaultBotAvatar);

  if (message.role === 'user') {
    return (
      <UserMessageComponent
        id={id}
        message={message}
        messageActions={messageActions}
        avatar={UserAvatarToRender || undefined}
        avatarProps={slotProps.userMessageAvatar}
        {...(slotProps.userMessage || {})}
      />
    );
  }

  if (message.role === 'assistant') {
    const renderMessageActions = () => {
      // Only render actions if messageActions are provided and the message is not just a tool call placeholder
      if (!messageActions || messageActions.length === 0) return null;
      // Filter out actions that might not be suitable for the entire block if needed, or pass all.
      // Example: regenerate might be for the whole assistant turn.

      return (
        <Box
          sx={{
            mt: 0.5,
            display: 'flex',
            gap: 0.5,
            justifyContent: 'flex-start',
          }}
        >
          {messageActions.map((action) => (
            <IconButton
              key={action.type}
              size='small'
              onClick={() => action.handler(message)} // handler gets the whole message object
              title={action.label}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              {action.icon || (
                <Typography variant='caption'>{action.label}</Typography>
              )}
            </IconButton>
          ))}
        </Box>
      );
    };

    if (message.parts && message.parts.length > 0) {
      const assistantMessageParts = message.parts
        .map((part, index) => {
          if (part.type === 'text') {
            const textPart = part as TextUIPart;
            return (
              <Box
                key={`${message.id}-text-${index}`}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: 'grey.100',
                  color: 'text.primary',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                  mb: 1, // Margin between parts
                  display: 'inline-block',
                  alignSelf: 'flex-start',
                  maxWidth: '80%',
                  ...(slotProps.botMessage?.contentSx || {}),
                }}
              >
                <Typography variant='body2' style={{ whiteSpace: 'pre-wrap' }}>
                  {textPart.text}
                </Typography>
              </Box>
            );
          } else if (part.type === 'tool-invocation') {
            const toolPart = part as ToolInvocationUIPart;
            return (
              <BotToolComponent
                id={
                  id
                    ? `${id}-tool-${
                        toolPart.toolInvocation.toolCallId || index
                      }`
                    : `tool-${toolPart.toolInvocation.toolCallId || index}`
                }
                key={`${message.id}-tool-${
                  toolPart.toolInvocation.toolCallId || index
                }`}
                toolInvocation={toolPart.toolInvocation}
                {...(slotProps.botTool || {})}
                // Apply sx from slotProps.botTool if provided, e.g. slotProps.botTool.sx
                sx={{ mb: 1, ...(slotProps.botTool?.sx || {}) }} // Ensure margin between parts
              />
            );
          }
          return null;
        })
        .filter(Boolean);

      // If, after filtering, there are no renderable parts but the original message had content (e.g. only unsupported parts),
      // fall back to rendering simple BotMessage if message.content exists.
      if (assistantMessageParts.length === 0 && message.content) {
        return (
          <BotMessageComponent
            id={id}
            message={message}
            messageActions={messageActions}
            avatar={BotAvatarToRender || undefined}
            avatarProps={slotProps.botMessageAvatar}
            {...(slotProps.botMessage || {})}
          />
        );
      }

      // Only render the ListItem wrapper if there are parts to display
      if (assistantMessageParts.length > 0) {
        return (
          <ListItem
            id={id}
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              mb: 1.5,
              px: 0.5,
              gap: 1,
              width: '100%',
              ...(slotProps.botMessage?.sx || {}),
            }}
          >
            {BotAvatarToRender && (
              <Box sx={{ flexShrink: 0, mt: 0.5 }}>
                <BotAvatarToRender {...(slotProps.botMessageAvatar || {})} />
              </Box>
            )}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                flexGrow: 1,
              }}
            >
              {assistantMessageParts}
              {renderMessageActions()}
            </Box>
          </ListItem>
        );
      }
      // If parts array was present but yielded no renderable content (e.g. all unknown part types)
      // and no message.content fallback, render nothing for this message.
      return null;
    } else if (message.content) {
      // Assistant message with no parts, just a string content
      return (
        <BotMessageComponent
          id={id}
          message={message}
          messageActions={messageActions}
          avatar={BotAvatarToRender || undefined}
          avatarProps={slotProps.botMessageAvatar}
          {...(slotProps.botMessage || {})}
        />
      );
    }
  }

  return null; // Fallback for unhandled roles or assistant messages with no parts and no content
};

export default ChatMessageRenderer;
