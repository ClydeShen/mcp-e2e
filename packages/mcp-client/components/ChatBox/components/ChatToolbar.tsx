import Box from '@mui/material/Box';
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
  showFileSelector = false, // Default to not showing
  showVoiceInput = false, // Default to not showing
  sx,
}) => {
  return (
    <Box
      id={id} // Apply id
      component='form'
      onSubmit={handleSubmit}
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
          id={`${id}-file-selector`}
          disabled={isProcessing}
        />
      )}
      {showVoiceInput && (
        <ChatToolbarVoiceInput
          id={`${id}-voice-input`}
          disabled={isProcessing}
        />
      )}
      <ChatToolbarInput
        id={`${id}-input`} // Example child id
        value={input}
        onChange={handleInputChange}
        placeholder={inputPlaceholder}
        disabled={isProcessing}
      />
      <ChatToolbarSendButton
        id={`${id}-send-button`}
        disabled={isProcessing || !input.trim()}
      />
      {/* ChatboxToolbarRegenerationButton would likely live outside or be passed in conditionally */}
    </Box>
  );
};

export default ChatToolbar;
