import { TextUIPart } from '@ai-sdk/ui-utils';
import type { SxProps, Theme } from '@mui/material/styles';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatBox } from '../ChatBoxContext';
import type { Message, MessageAction } from '../types';
import BaseMessage, { type BaseMessageProps } from './BaseMessage';
import BotTool from './BotTool';
import { markdownComponents } from './MarkdownComponents';

// The local markdownComponents object and its direct MUI imports (Box, Divider, Link, Paper, Typography, List, ListItem) have been removed.
// They are now centralized in MarkdownComponents.tsx

// Helper function to render bot message content with Markdown support
const renderBotMessageContent = (msg: Message): React.ReactNode => {
  let contentToDisplay: React.ReactNode;

  if (msg.parts && msg.parts.length > 0) {
    const textParts = msg.parts.filter(
      (p) => p.type === 'text'
    ) as TextUIPart[];
    if (textParts.length > 0) {
      contentToDisplay = textParts.map((part, index) => (
        <ReactMarkdown
          key={`text-part-${index}`}
          components={markdownComponents}
          remarkPlugins={[remarkGfm]}
        >
          {part.text}
        </ReactMarkdown>
      ));
    } else if (!msg.content) {
      contentToDisplay = null;
    }
  }

  if (contentToDisplay === undefined || contentToDisplay === null) {
    if (msg.content) {
      contentToDisplay = (
        <ReactMarkdown
          components={markdownComponents}
          remarkPlugins={[remarkGfm]}
        >
          {msg.content}
        </ReactMarkdown>
      );
    } else {
      contentToDisplay = null;
    }
  }
  return contentToDisplay;
};

export interface BotMessageProps {
  id: string;
  message: Message;
  messageActions?: MessageAction[];
  sx?: BaseMessageProps['sx'];
  bubbleSx?: SxProps<Theme>;
}

const BotMessage: React.FC<BotMessageProps> = ({
  id,
  message,
  messageActions,
  sx,
  bubbleSx: incomingBubbleSx,
}) => {
  const { slots, slotProps, disableBotAvatar } = useChatBox();

  const BotAvatarToRender = !disableBotAvatar && slots?.botMessageAvatar;
  const finalAvatarProps = slotProps?.botMessageAvatar || {};

  let messageNodes: React.ReactNode = null;

  if (message.parts && message.parts.length > 0) {
    messageNodes = message.parts.map((part, index) => {
      const partIdBase = `${id}-${part.type}-${index}`;
      if (part.type === 'text') {
        return (
          <BaseMessage
            key={`text-part-${index}`}
            id={partIdBase}
            message={message}
            messageActions={messageActions}
            avatar={BotAvatarToRender || undefined}
            avatarProps={finalAvatarProps}
            avatarSide='left'
            sx={sx}
            bubbleSx={{
              bgcolor: (theme) => theme.palette.grey[100],
              ...(incomingBubbleSx || {}),
            }}
            renderContent={() => (
              <ReactMarkdown
                components={markdownComponents}
                remarkPlugins={[remarkGfm]}
              >
                {part.text}
              </ReactMarkdown>
            )}
          />
        );
      } else if (part.type === 'tool-invocation') {
        return (
          <BaseMessage
            key={`tool-part-${index}`}
            id={`${partIdBase}-${part.toolInvocation.toolCallId || 'call'}`}
            message={message}
            messageActions={messageActions}
            avatar={BotAvatarToRender || undefined}
            avatarProps={finalAvatarProps}
            avatarSide='left'
            sx={sx}
            hideBubble
            renderContent={() => (
              <BotTool
                id={`${partIdBase}-bt-${
                  part.toolInvocation.toolCallId || 'call'
                }`}
                toolInvocation={part.toolInvocation}
                sx={slotProps?.botTool?.sx}
              />
            )}
          />
        );
      }
      return null;
    });
  } else if (message.content) {
    messageNodes = (
      <BaseMessage
        id={id}
        message={message}
        messageActions={messageActions}
        avatar={BotAvatarToRender || undefined}
        avatarProps={finalAvatarProps}
        avatarSide='left'
        sx={sx}
        bubbleSx={{
          bgcolor: (theme) => theme.palette.grey[100],
          ...(incomingBubbleSx || {}),
        }}
        renderContent={() => (
          <ReactMarkdown
            components={markdownComponents}
            remarkPlugins={[remarkGfm]}
          >
            {message.content}
          </ReactMarkdown>
        )}
      />
    );
  }

  if (!messageNodes) {
    return null;
  }

  return <>{messageNodes}</>;
};

export default BotMessage;
