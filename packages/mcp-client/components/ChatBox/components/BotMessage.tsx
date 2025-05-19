import { TextUIPart } from '@ai-sdk/ui-utils';
import type { SxProps, Theme } from '@mui/material/styles';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message, MessageAction } from '../types';
import BaseMessage, { type BaseMessageProps } from './BaseMessage';
import { markdownComponents } from './MarkdownComponents'; // Import shared components

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
  bubbleSx?: SxProps<Theme>;
  avatar?: React.ElementType;
  avatarProps?: object;
}

const BotMessage: React.FC<BotMessageProps> = ({
  id,
  message,
  messageActions,
  sx,
  bubbleSx: incomingBubbleSx,
  avatar,
  avatarProps,
}) => {
  const defaultBotStylesFunction = (theme: Theme) => ({
    bgcolor: theme.palette.grey[100],
    color: theme.palette.text.primary,
  });

  let finalBubbleSxForBase: SxProps<Theme>;

  if (!incomingBubbleSx) {
    finalBubbleSxForBase = defaultBotStylesFunction;
  } else {
    const sxElementArray: Array<
      Exclude<SxProps<Theme>, ReadonlyArray<any> | boolean | null | undefined>
    > = [defaultBotStylesFunction];

    if (Array.isArray(incomingBubbleSx)) {
      incomingBubbleSx.forEach((item) => {
        if (item && (typeof item === 'object' || typeof item === 'function')) {
          sxElementArray.push(
            item as Exclude<
              SxProps<Theme>,
              ReadonlyArray<any> | boolean | null | undefined
            >
          );
        }
      });
    } else {
      if (
        incomingBubbleSx &&
        (typeof incomingBubbleSx === 'object' ||
          typeof incomingBubbleSx === 'function')
      ) {
        sxElementArray.push(
          incomingBubbleSx as Exclude<
            SxProps<Theme>,
            ReadonlyArray<any> | boolean | null | undefined
          >
        );
      }
    }
    finalBubbleSxForBase = sxElementArray;
  }

  return (
    <BaseMessage
      id={id}
      message={message}
      messageActions={messageActions}
      avatar={avatar}
      avatarProps={avatarProps}
      avatarSide='left'
      sx={sx}
      bubbleSx={finalBubbleSxForBase}
      renderContent={renderBotMessageContent}
    />
  );
};

export default BotMessage;
