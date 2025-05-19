'use client';

import ChatBox from '@/components/ChatBox'; // Adjust path if @/ alias is different
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

export default function ChatPage() {
  return (
    <Container
      maxWidth='lg'
      sx={{ display: 'flex', flexDirection: 'column', height: '100vh', py: 2 }}
    >
      <Box sx={{ mb: 2, textAlign: 'center' }}>
        <Typography variant='h4' component='h1'>
          MCP Client Chat
        </Typography>
      </Box>
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <ChatBox
          api='/api/chat-handler' // Points to your Bedrock chat handler
          inputPlaceholder='Type your message to the AI...'
          // You can add other ChatBoxProps here if needed, like initialMessages, header, footer etc.
        />
      </Box>
    </Container>
  );
}
