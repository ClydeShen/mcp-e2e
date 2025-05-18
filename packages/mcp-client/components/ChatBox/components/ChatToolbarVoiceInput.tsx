import MicIcon from '@mui/icons-material/Mic'; // Example Icon
import Button from '@mui/material/Button';
import React from 'react';

export interface ChatToolbarVoiceInputProps {
  id?: string; // Added id prop
  onVoiceInput?: (audioBlob: Blob) => void; // Placeholder
  disabled?: boolean;
  sx?: object;
}

const ChatToolbarVoiceInput: React.FC<ChatToolbarVoiceInputProps> = ({
  id, // Destructure id
  onVoiceInput,
  disabled = false,
  sx,
}) => {
  const handleButtonClick = () => {
    // Placeholder: In a real implementation, this would trigger voice recording
    console.log('Voice input clicked. Implement voice recording logic.');
    // Example: if (onVoiceInput) onVoiceInput(recordedAudioBlob);
  };

  return (
    <Button
      id={id} // Apply id
      variant='outlined'
      startIcon={<MicIcon />}
      disabled={disabled}
      onClick={handleButtonClick}
      sx={sx}
      title='Voice Input' // Accessibility
    >
      {/* Speak */}
    </Button>
  );
};

export default ChatToolbarVoiceInput;
