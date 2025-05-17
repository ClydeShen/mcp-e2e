'use client';

import SendIcon from '@mui/icons-material/Send';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import * as React from 'react';

// import { useChat } from 'ai/react'; // Old import
import { useChat } from '@ai-sdk/react'; // New import
import { Stack } from '@mui/material';
import type { ChatBoxProps, Message, MessageAction } from './types'; // Import new types

const DefaultMessageRenderer: React.FC<{
  message: Message;
  messageActions?: MessageAction[];
}> = ({ message, messageActions }) => {
  const isUser = message.role === 'user';
  const relevantActions = messageActions?.filter((action) =>
    isUser ? action.type !== 'regenerate' : true
  );

  return (
    <ListItem
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 1.5,
        px: 0.5,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isUser ? 'flex-end' : 'flex-start',
          maxWidth: '80%',
        }}
      >
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: isUser ? 'primary.main' : 'grey.100',
            color: isUser ? 'primary.contrastText' : 'text.primary',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
          }}
        >
          <Typography variant='body2' style={{ whiteSpace: 'pre-wrap' }}>
            {message.content}
          </Typography>
        </Box>
        {relevantActions && relevantActions.length > 0 && (
          <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5 }}>
            {relevantActions.map((action) => (
              <IconButton
                key={action.type}
                size='small'
                onClick={() => action.handler(message)}
                title={action.label}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                {action.icon || (
                  <Typography variant='caption'>{action.label}</Typography>
                )}
              </IconButton>
            ))}
          </Box>
        )}
      </Box>
    </ListItem>
  );
};

export default function ChatBox(props: ChatBoxProps) {
  const {
    api,
    sx,
    renderMessage,
    inputPlaceholder = 'Type your message...',
    messageActions,
    header,
    footer,
    initialMessages,
    initialInput,
    onFinish,
    onError,
  } = props;

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    error,
    append,
  } = useChat({
    api: api,
    initialMessages,
    initialInput,
    onFinish,
    onError: (e: Error) => {
      console.error('Chat error:', e);
      if (onError) {
        onError(e);
      }
    },
  });

  const isProcessing = status === 'submitted' || status === 'streaming';

  const messagesEndRef = React.useRef<null | HTMLDivElement>(null);
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Example: Define a copy action if onMessageCopy was passed in an older version
  // For now, messageActions prop is more generic
  // const concreteMessageActions = React.useMemo(() => {
  //   const actions: MessageAction[] = [];
  //   if (props.onMessageCopy) { // Example of adapting an old prop
  //     actions.push({
  //       type: 'copy',
  //       label: 'Copy',
  //       icon: <ContentCopyIcon fontSize="inherit" />,
  //       handler: (msg) => props.onMessageCopy!(msg.content),
  //     });
  //   }
  //   return actions.concat(messageActions || []);
  // }, [props.onMessageCopy, messageActions]);

  return (
    <Stack spacing={1} sx={{ height: '100%', ...sx }}>
      {header}
      <Paper
        variant='outlined'
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          p: 2,
          mb: 0,
          borderColor: 'divider',
          borderRadius: 0,
          bgcolor: 'background.default',
        }}
      >
        <List sx={{ py: 0 }}>
          {messages.length === 0 && !isProcessing && !error && (
            <ListItem>
              <ListItemText
                primary='Send a message to start the conversation!'
                sx={{ textAlign: 'center', color: 'text.secondary' }}
              />
            </ListItem>
          )}
          {messages.map((m: Message) =>
            renderMessage ? (
              renderMessage({ message: m })
            ) : (
              <DefaultMessageRenderer
                key={m.id}
                message={m}
                messageActions={messageActions}
              />
            )
          )}
          <div ref={messagesEndRef} />
        </List>
        {isProcessing && (
          <ListItem sx={{ justifyContent: 'center', py: 1 }}>
            <CircularProgress size={20} />
            <ListItemText
              primary='AI is thinking...'
              sx={{ ml: 1, color: 'text.secondary' }}
            />
          </ListItem>
        )}
        {error && (
          <ListItem sx={{ justifyContent: 'center', py: 1 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 1,
                bgcolor: 'error.light',
                color: 'error.contrastText',
              }}
            >
              <Typography variant='body2'>
                Error: {error.message || 'Could not connect to the AI'}
              </Typography>
            </Box>
          </ListItem>
        )}
      </Paper>
      <Box
        component='form'
        onSubmit={handleSubmit}
        sx={{
          display: 'flex',
          gap: 1,
          alignItems: 'center',
          bgcolor: 'background.paper',
        }}
      >
        <TextField
          fullWidth
          variant='outlined'
          placeholder={inputPlaceholder}
          value={input}
          onChange={handleInputChange}
          disabled={isProcessing}
          size='small'
          autoComplete='off'
        />
        <Button
          type='submit'
          variant='contained'
          endIcon={<SendIcon />}
          disabled={isProcessing || !input.trim()}
        >
          Send
        </Button>
      </Box>
      {footer}
    </Stack>
  );
}
