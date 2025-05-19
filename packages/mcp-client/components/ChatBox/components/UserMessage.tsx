import RefreshIcon from '@mui/icons-material/Refresh';
import { IconButton } from '@mui/material';
import Typography from '@mui/material/Typography';
import React, { useState } from 'react';
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
  onRegenerate?: (messageId: string) => void;
}

const UserMessage: React.FC<UserMessageProps> = ({
  id,
  message,
  messageActions,
  sx,
  contentSx,
  avatar,
  avatarProps,
  onRegenerate,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  let hoverAccessoryContent = null;
  if (isHovered && onRegenerate) {
    hoverAccessoryContent = (
      <IconButton
        size='small'
        onClick={() => onRegenerate(message.id)}
        sx={(theme) => ({
          position: 'absolute',
          top: theme.spacing(-1.25),
          right: theme.spacing(-1.25),
          zIndex: 1,
          bgcolor: 'background.default',
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.shadows[1],
          '&:hover': {
            bgcolor: 'background.paper',
            boxShadow: theme.shadows[2],
          },
        })}
        aria-label='Regenerate response'
      >
        <RefreshIcon fontSize='inherit' />
      </IconButton>
    );
  }

  return (
    <BaseMessage
      id={id}
      message={message}
      messageActions={messageActions}
      avatar={avatar}
      avatarProps={avatarProps}
      avatarSide='right'
      sx={sx}
      bubbleSx={{
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        ...contentSx,
      }}
      renderContent={renderUserMessageContent}
      filterActions={filterUserMessageActions}
      onHoverChange={setIsHovered}
      hoverAccessory={hoverAccessoryContent}
    />
  );
};

export default UserMessage;
