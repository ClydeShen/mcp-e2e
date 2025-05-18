import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import React from 'react';

export interface GreetingMessageProps {
  id?: string;
  text?: string;
  sx?: object; // Allow style overrides
}

const GreetingMessage: React.FC<GreetingMessageProps> = ({
  id,
  text = 'Send a message to start the conversation!',
  sx,
}) => {
  return (
    <ListItem id={id} sx={sx}>
      <ListItemText
        primary={text}
        sx={{ textAlign: 'center', color: 'text.secondary' }}
      />
    </ListItem>
  );
};

export default GreetingMessage;
