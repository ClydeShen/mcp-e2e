import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import React from 'react';
import type { Message, MessageAction } from '../types';

export interface MessageActionsProps {
  actions: MessageAction[];
  message: Message;
  justifyContent?: 'flex-start' | 'flex-end' | 'center';
  className?: string;
}

const MessageActions: React.FC<MessageActionsProps> = ({
  actions,
  message,
  justifyContent = 'flex-start',
  className,
}) => {
  if (!actions || actions.length === 0) {
    return null;
  }

  return (
    <Box
      className={className}
      sx={{
        mt: 0.5,
        display: 'flex',
        gap: 0.5,
        justifyContent: justifyContent,
      }}
    >
      {actions.map((action) => (
        <IconButton
          key={action.type}
          size='small'
          onClick={() => action.handler(message)}
          title={action.label}
        >
          {action.icon || (
            <Typography variant='caption'>{action.label}</Typography>
          )}
        </IconButton>
      ))}
    </Box>
  );
};

export default MessageActions;
