import { Paper } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import React from 'react';

export interface MessageContentBubbleProps {
  id?: string;
  sx?: SxProps<Theme>;
  children: React.ReactNode;
  className?: string;
}

const MessageContentBubble: React.FC<MessageContentBubbleProps> = ({
  id,
  sx,
  children,
  className,
}) => {
  return (
    <Paper
      elevation={1}
      data-testid={id || 'message-bubble'}
      className={className}
      sx={{
        p: 1.5,
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
};

export default MessageContentBubble;
