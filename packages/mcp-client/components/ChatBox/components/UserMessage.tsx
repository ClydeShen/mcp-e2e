import Typography from '@mui/material/Typography';
import React from 'react';
import type { Message, MessageAction } from '../types';
import BaseMessage, { type BaseMessageProps } from './BaseMessage'; // Import BaseMessage and its props type

// Helper function to render user message content
const renderUserMessageContent = (msg: Message) => (
  <Typography variant='body2' style={{ whiteSpace: 'pre-wrap' }}>
    {msg.content}
  </Typography>
);

// Helper function to filter actions for user messages
const filterUserMessageActions = (actions: MessageAction[], _msg: Message) =>
  actions.filter((action) => action.type !== 'regenerate');

// UserMessageProps can extend or compose BaseMessageProps if needed,
// or simply define its own and map them to BaseMessageProps.
// For now, let's redefine and map for clarity, though direct extension might be cleaner.
export interface UserMessageProps {
  id?: string;
  message: Message;
  messageActions?: MessageAction[];
  sx?: BaseMessageProps['sx']; // sx for the root ListItem, passed to BaseMessage
  contentSx?: object; // For the bubble, will be merged into BaseMessage's bubbleSx
  avatar?: React.ElementType;
  avatarProps?: object;
}

const UserMessage: React.FC<UserMessageProps> = ({
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
      avatarSide='right'
      sx={sx} // Pass root ListItem sx directly
      bubbleSx={{
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        ...contentSx, // Spread user-defined contentSx for the bubble
      }}
      renderContent={renderUserMessageContent}
      filterActions={filterUserMessageActions}
    />
  );
};

export default UserMessage;
