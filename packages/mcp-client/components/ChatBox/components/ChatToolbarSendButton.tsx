import SendIcon from '@mui/icons-material/Send';
import Button from '@mui/material/Button';
import React from 'react';

export interface ChatToolbarSendButtonProps {
  id?: string;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void; // Optional if type='submit' is used primarily
  sx?: object;
  children?: React.ReactNode;
}

const ChatToolbarSendButton: React.FC<ChatToolbarSendButtonProps> = ({
  id,
  disabled = false,
  onClick,
  sx,
  children = 'Send',
}) => {
  return (
    <Button
      id={id}
      type='submit' // Assuming it's used within a form
      variant='contained'
      endIcon={<SendIcon />}
      disabled={disabled}
      onClick={onClick} // onSubmit on form will handle if type="submit"
      sx={sx}
    >
      {children}
    </Button>
  );
};

export default ChatToolbarSendButton;
