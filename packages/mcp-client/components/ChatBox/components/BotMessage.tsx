import { TextUIPart } from '@ai-sdk/ui-utils';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message, MessageAction } from '../types';
import BaseMessage, { type BaseMessageProps } from './BaseMessage';
import { markdownComponents } from './MarkdownComponents'; // Import shared components

// The local markdownComponents object and its direct MUI imports (Box, Divider, Link, Paper, Typography, List, ListItem) have been removed.
// They are now centralized in MarkdownComponents.tsx

// Helper function to render bot message content with Markdown support
const renderBotMessageContent = (msg: Message) => {
  let contentToDisplay: React.ReactNode;

  if (msg.parts && msg.parts.length > 0) {
    const textParts = msg.parts.filter(
      (p) => p.type === 'text'
    ) as TextUIPart[];
    if (textParts.length > 0) {
      contentToDisplay = textParts.map((part, index) => (
        <ReactMarkdown
          key={index}
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
  id?: string;
  message: Message;
  messageActions?: MessageAction[];
  sx?: BaseMessageProps['sx'];
  contentSx?: object;
  avatar?: React.ElementType;
  avatarProps?: object;
}

const BotMessage: React.FC<BotMessageProps> = ({
  id,
  message,
  messageActions,
  sx,
  contentSx,
  avatar,
  avatarProps,
}) => {
  return (
    <BaseMessage
      id={id}
      message={message}
      messageActions={messageActions}
      avatar={avatar}
      avatarProps={avatarProps}
      avatarSide='left'
      sx={sx}
      bubbleSx={(theme) => ({
        bgcolor: theme.palette.grey[100],
        color: 'text.primary',
        ...contentSx,
      })}
      renderContent={renderBotMessageContent}
    />
  );
};

export default BotMessage;
