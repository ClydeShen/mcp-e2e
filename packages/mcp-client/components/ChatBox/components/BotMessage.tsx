import { TextUIPart } from '@ai-sdk/ui-utils';
import Typography from '@mui/material/Typography';
import React from 'react';
import type { Message, MessageAction } from '../types';
import BaseMessage, { type BaseMessageProps } from './BaseMessage';

// Helper function to render bot message content
const renderBotMessageContent = (msg: Message) => {
  let contentToDisplay: React.ReactNode;

  if (msg.parts && msg.parts.length > 0) {
    const textParts = msg.parts.filter(
      (p) => p.type === 'text'
    ) as TextUIPart[];
    if (textParts.length > 0) {
      contentToDisplay = textParts.map((part, index) => (
        <Typography
          key={index}
          variant='body2'
          style={{ whiteSpace: 'pre-wrap' }}
        >
          {part.text}
        </Typography>
      ));
    } else if (!msg.content) {
      contentToDisplay = null; // Only non-text parts and no main content
    }
    // If there were parts but none were text, and there IS msg.content, contentToDisplay remains undefined here.
    // The next block will catch it.
  }

  // If contentToDisplay is still undefined (meaning no text parts were processed or no parts array existed)
  // OR if it became null (meaning parts existed but no text parts AND no msg.content for that path),
  // then try to use msg.content directly.
  if (contentToDisplay === undefined || contentToDisplay === null) {
    if (msg.content) {
      contentToDisplay = (
        <Typography variant='body2' style={{ whiteSpace: 'pre-wrap' }}>
          {msg.content}
        </Typography>
      );
    } else {
      // If still no content (e.g. parts existed but no text parts, and no msg.content either)
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
      bubbleSx={{
        bgcolor: 'grey.100',
        color: 'text.primary',
        ...contentSx,
      }}
      renderContent={renderBotMessageContent} // Use the moved function
    />
  );
};

export default BotMessage;
