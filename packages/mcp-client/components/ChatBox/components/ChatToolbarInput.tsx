import TextField from '@mui/material/TextField';
import React from 'react';

export interface ChatToolbarInputProps {
  id?: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  sx?: object;
}

const ChatToolbarInput: React.FC<ChatToolbarInputProps> = ({
  id,
  value,
  onChange,
  placeholder = 'Type your message...',
  disabled = false,
  sx,
}) => {
  return (
    <TextField
      id={id}
      fullWidth
      variant='outlined'
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      size='small'
      autoComplete='off'
      sx={sx}
    />
  );
};

export default ChatToolbarInput;
