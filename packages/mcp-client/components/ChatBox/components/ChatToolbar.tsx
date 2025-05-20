import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import React from 'react';
import { useChatBox } from '../ChatBoxContext'; // Import useChatBox
import ChatToolbarFileSelector from './ChatToolbarFileSelector';
import ChatToolbarInput from './ChatToolbarInput';
import ChatToolbarSendButton from './ChatToolbarSendButton';
import ChatToolbarVoiceInput from './ChatToolbarVoiceInput';

export interface ChatToolbarProps {
  // id?: string; // ID will now be derived from context or a default
  input: string;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  inputPlaceholder?: string;
  isProcessing?: boolean;
  onStopProcessing?: () => void;
  showFileSelector?: boolean;
  showVoiceInput?: boolean;
  sx?: object;
  // Allow an explicit id to be passed via slotProps, otherwise use context-derived id
  id?: string;
}

const ChatToolbar: React.FC<ChatToolbarProps> = ({
  // id, // No longer taken directly, will use context or passed id
  input,
  handleInputChange,
  handleSubmit,
  inputPlaceholder,
  isProcessing,
  onStopProcessing,
  showFileSelector = false,
  showVoiceInput = false,
  sx,
  id: idFromSlotProps, // Explicit id from slotProps takes precedence
}) => {
  const { rootId } = useChatBox();
  const toolbarId = idFromSlotProps || `${rootId}-toolbar`;

  return (
    <Box
      id={toolbarId} // Apply derived or passed id
      component='form'
      onSubmit={(e) => {
        if (!isProcessing) {
          handleSubmit(e);
        } else {
          e.preventDefault();
        }
      }}
      sx={(theme) => ({
        display: 'flex',
        gap: theme.spacing(1),
        alignItems: 'center',
        p: theme.spacing(1.5),
        bgcolor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
        ...sx,
      })}
    >
      {showFileSelector && (
        <ChatToolbarFileSelector
          id={`${toolbarId}-file-selector`}
          disabled={isProcessing}
        />
      )}
      {showVoiceInput && (
        <ChatToolbarVoiceInput
          id={`${toolbarId}-voice-input`}
          disabled={isProcessing}
        />
      )}
      <ChatToolbarInput
        id={`${toolbarId}-input`}
        value={input}
        onChange={handleInputChange}
        placeholder={inputPlaceholder}
        disabled={isProcessing}
      />
      {isProcessing ? (
        <IconButton
          id={`${toolbarId}-stop-button`}
          color='error'
          onClick={onStopProcessing}
          aria-label='stop processing'
          size='small'
        >
          <StopCircleOutlinedIcon />
        </IconButton>
      ) : (
        <ChatToolbarSendButton
          id={`${toolbarId}-send-button`}
          disabled={!input.trim()}
        />
      )}
    </Box>
  );
};

export default ChatToolbar;
