import RefreshIcon from '@mui/icons-material/Refresh';
import { Box, IconButton } from '@mui/material';
import type {
  SxProps as MuiSxProps,
  Theme as MuiTheme,
} from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import React, { useState } from 'react';
import type { Message, MessageAction } from '../types';
import { type BaseMessageProps } from './BaseMessage';
import MessageActions from './MessageActions';
import MessageAvatar from './MessageAvatar';
import MessageContainer from './MessageContainer';
import MessageContentBubble from './MessageContentBubble';

// Helper function to render user message content
const renderUserMessageContent = (msg: Message) => (
  <Typography variant='body2' style={{ whiteSpace: 'pre-wrap' }}>
    {msg.content}
  </Typography>
);

// Helper function to filter actions for user messages
const filterUserMessageActions = (actions: MessageAction[], _msg: Message) =>
  actions.filter((action) => action.type !== 'regenerate');

// UserMessageProps can extend or compose BaseMessageProps if needed,
// or simply define its own and map them to BaseMessageProps.
// For now, let's redefine and map for clarity, though direct extension might be cleaner.
export interface UserMessageProps {
  id?: string;
  message: Message;
  messageActions?: MessageAction[];
  sx?: BaseMessageProps['sx']; // sx for the root ListItem, passed to BaseMessage
  bubbleSx?: MuiSxProps<MuiTheme>; // Renamed from contentSx
  avatar?: React.ElementType;
  avatarProps?: object;
  onRegenerate?: (messageId: string) => void;
  className?: string;
}

const UserMessage: React.FC<UserMessageProps> = ({
  id,
  message,
  messageActions,
  sx: rootSx,
  bubbleSx: incomingBubbleSx,
  avatar: AvatarComponent,
  avatarProps,
  onRegenerate,
  className,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  let hoverAccessoryContent = null;
  if (isHovered && onRegenerate && message.id) {
    hoverAccessoryContent = (
      <IconButton
        size='small'
        onClick={() => onRegenerate(message.id!)}
        sx={(theme) => ({
          position: 'absolute',
          top: theme.spacing(-1.25),
          right: theme.spacing(-1.25),
          zIndex: 1,
          bgcolor: 'background.default',
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.shadows[1],
          '&:hover': {
            bgcolor: 'background.paper',
            boxShadow: theme.shadows[2],
          },
        })}
        aria-label='Regenerate response'
      >
        <RefreshIcon fontSize='inherit' />
      </IconButton>
    );
  }

  const defaultUserStylesFunction = (theme: MuiTheme) => ({
    bgcolor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  });

  let finalBubbleSxForBase: MuiSxProps<MuiTheme>;

  if (!incomingBubbleSx) {
    finalBubbleSxForBase = defaultUserStylesFunction;
  } else {
    // Correctly construct the array for SxProps
    const sxElementArray: Array<
      Exclude<
        MuiSxProps<MuiTheme>,
        ReadonlyArray<any> | boolean | null | undefined
      >
    > = [defaultUserStylesFunction];
    if (Array.isArray(incomingBubbleSx)) {
      incomingBubbleSx.forEach((item) => {
        if (item && (typeof item === 'object' || typeof item === 'function')) {
          sxElementArray.push(
            item as Exclude<
              MuiSxProps<MuiTheme>,
              ReadonlyArray<any> | boolean | null | undefined
            >
          );
        }
      });
    } else {
      if (
        incomingBubbleSx &&
        (typeof incomingBubbleSx === 'object' ||
          typeof incomingBubbleSx === 'function')
      ) {
        sxElementArray.push(
          incomingBubbleSx as Exclude<
            MuiSxProps<MuiTheme>,
            ReadonlyArray<any> | boolean | null | undefined
          >
        );
      }
    }
    finalBubbleSxForBase = sxElementArray;
  }

  const processedActions = filterUserMessageActions(
    messageActions || [],
    message
  );

  const alignItemsContent = 'flex-end';

  const avatarNode = (
    <MessageAvatar
      AvatarComponent={AvatarComponent}
      avatarProps={avatarProps}
    />
  );

  const contentAreaNode = (
    <Box
      data-testid={id ? `${id}-content-area` : 'message-content-area'}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: alignItemsContent,
        maxWidth: '80%',
        position: 'relative',
      }}
    >
      {hoverAccessoryContent}
      <MessageContentBubble
        id={id ? `${id}-bubble` : undefined}
        sx={finalBubbleSxForBase}
      >
        {renderUserMessageContent(message)}
      </MessageContentBubble>
      <MessageActions
        actions={processedActions || []}
        message={message}
        justifyContent={alignItemsContent}
      />
    </Box>
  );

  return (
    <MessageContainer
      id={id}
      className={className}
      sx={rootSx}
      avatarSide='right'
      onHoverChange={setIsHovered}
      avatar={avatarNode}
      contentArea={contentAreaNode}
    />
  );
};

export default UserMessage;
