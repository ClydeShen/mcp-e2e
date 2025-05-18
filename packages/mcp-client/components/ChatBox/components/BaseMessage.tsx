import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import ListItem from '@mui/material/ListItem';
import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';
import React from 'react';
import type { Message, MessageAction } from '../types';

export interface BaseMessageProps {
  id?: string;
  message: Message;
  messageActions?: MessageAction[];
  avatar?: React.ElementType;
  avatarProps?: object;
  avatarSide: 'left' | 'right';
  // sx for the root ListItem
  sx?: SxProps<Theme>;
  // sx for the main content bubble (Box containing the rendered content)
  bubbleSx?: SxProps<Theme>;
  // Function to render the core content of the message
  renderContent: (message: Message) => React.ReactNode;
  // Optional function to filter which actions are displayed
  filterActions?: (
    actions: MessageAction[],
    message: Message
  ) => MessageAction[];
}

const BaseMessage: React.FC<BaseMessageProps> = ({
  id,
  message,
  messageActions,
  avatar: AvatarComponent,
  avatarProps = {},
  avatarSide,
  sx,
  bubbleSx,
  renderContent,
  filterActions,
}) => {
  const processedActions =
    filterActions && messageActions
      ? filterActions(messageActions, message)
      : messageActions;

  const justifyContent = avatarSide === 'left' ? 'flex-start' : 'flex-end';
  const alignItemsContent = avatarSide === 'left' ? 'flex-start' : 'flex-end';

  const avatarMarkup = AvatarComponent && (
    <Box sx={{ flexShrink: 0, mt: 0.5 /* Consistent top margin for avatar */ }}>
      <AvatarComponent {...avatarProps} />
    </Box>
  );

  return (
    <ListItem
      id={id}
      sx={{
        display: 'flex',
        justifyContent,
        alignItems: 'flex-start', // Keep root ListItem items aligned to top
        mb: 1.5,
        px: 0.5,
        gap: 1,
        ...sx,
      }}
    >
      {avatarSide === 'left' && avatarMarkup}
      <Box
        data-testid={id ? `${id}-content-area` : 'message-content-area'} // More generic test id
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: alignItemsContent,
          maxWidth: '80%', // Common constraint
        }}
      >
        <Box
          data-testid={id ? `${id}-bubble` : 'message-bubble'}
          sx={{
            p: 1.5,
            borderRadius: 2,
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            // Default bubble styles can be here, overridden by bubbleSx
            bgcolor: 'background.paper', // A neutral default
            color: 'text.primary',
            ...bubbleSx, // User/Bot specific styles (like bgcolor) will come via this prop
          }}
        >
          {renderContent(message)}
        </Box>
        {processedActions && processedActions.length > 0 && (
          <Box
            sx={{
              mt: 0.5,
              display: 'flex',
              gap: 0.5,
              justifyContent: alignItemsContent,
            }}
          >
            {processedActions.map((action) => (
              <IconButton
                key={action.type}
                size='small'
                onClick={() => action.handler(message)}
                title={action.label}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper', // Default action button style
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
      {avatarSide === 'right' && avatarMarkup}
    </ListItem>
  );
};

export default BaseMessage;
