import { Stack } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import type { SxProps, Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import React from 'react';
import type { Message, MessageAction } from '../types';

export interface MessageActionsProps {
  actions: MessageAction[];
  message: Message;
  justifyContent?: 'flex-start' | 'flex-end' | 'center';
  className?: string;
  sx?: SxProps<Theme>;
}

const MessageActions: React.FC<MessageActionsProps> = ({
  actions,
  message,
  justifyContent = 'flex-start',
  className,
  sx,
}) => {
  if (!actions || actions.length === 0) {
    return null;
  }

  return (
    <Stack direction='row' spacing={0.5} sx={sx}>
      {actions.map((action) => (
        <IconButton
          key={action.type}
          size='small'
          onClick={() => action.handler(message)}
          title={action.label}
          sx={{ minWidth: 'auto' }}
        >
          {action.icon || (
            <Typography variant='caption' sx={{ px: 0.5 }}>
              {action.label}
            </Typography>
          )}
        </IconButton>
      ))}
    </Stack>
  );
};

export default MessageActions;
