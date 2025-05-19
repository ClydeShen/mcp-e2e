import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import React from 'react';
import ChatToolbarFileSelector from './ChatToolbarFileSelector'; // Placeholder
import ChatToolbarInput from './ChatToolbarInput';
import ChatToolbarSendButton from './ChatToolbarSendButton';
import ChatToolbarVoiceInput from './ChatToolbarVoiceInput'; // Placeholder

export interface ChatToolbarProps {
  id?: string; // Added id prop
  input: string;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  inputPlaceholder?: string;
  isProcessing?: boolean;
  onStopProcessing?: () => void; // ADDED
  showFileSelector?: boolean; // To control visibility
  showVoiceInput?: boolean; // To control visibility
  sx?: object;
}

const ChatToolbar: React.FC<ChatToolbarProps> = ({
  id, // Destructure id
  input,
  handleInputChange,
  handleSubmit,
  inputPlaceholder,
  isProcessing,
  onStopProcessing, // Destructured
  showFileSelector = false, // Default to not showing
  showVoiceInput = false, // Default to not showing
  sx,
}) => {
  return (
    <Box
      id={id} // Apply id
      component='form'
      onSubmit={(e) => {
        if (!isProcessing) {
          handleSubmit(e);
        } else {
          e.preventDefault(); // Prevent submit if Stop is visible
        }
      }}
      sx={{
        display: 'flex',
        gap: 1,
        alignItems: 'center',
        p: 1.5, // Default padding for the toolbar
        bgcolor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
        ...sx,
      }}
    >
      {showFileSelector && (
        <ChatToolbarFileSelector
          id={id ? `${id}-file-selector` : undefined}
          disabled={isProcessing}
        />
      )}
      {showVoiceInput && (
        <ChatToolbarVoiceInput
          id={id ? `${id}-voice-input` : undefined}
          disabled={isProcessing}
        />
      )}
      <ChatToolbarInput
        id={id ? `${id}-input` : undefined} // Example child id
        value={input}
        onChange={handleInputChange}
        placeholder={inputPlaceholder}
        disabled={isProcessing}
      />
      {isProcessing ? (
        <IconButton
          id={id ? `${id}-stop-button` : 'chatbox-stop-icon-button'}
          color='error'
          onClick={onStopProcessing}
          aria-label='stop processing'
          size='small'
        >
          <StopCircleOutlinedIcon />
        </IconButton>
      ) : (
        <ChatToolbarSendButton
          id={id ? `${id}-send-button` : undefined}
          disabled={!input.trim()} // Send button is only disabled if input is empty (isProcessing is false here)
        />
      )}
      {/* ChatboxToolbarRegenerationButton would likely live outside or be passed in conditionally */}
    </Box>
  );
};

export default ChatToolbar;
