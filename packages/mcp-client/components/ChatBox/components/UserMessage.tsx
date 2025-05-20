import RefreshIcon from '@mui/icons-material/Refresh';
import { Popover, Stack } from '@mui/material';
import type {
  SxProps as MuiSxProps,
  Theme as MuiTheme,
} from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import React from 'react';
import { useChatBox } from '../ChatBoxContext';
import type { Message, MessageAction } from '../types';
import { type BaseMessageProps } from './BaseMessage';
import MessageActions from './MessageActions';
import MessageAvatar from './MessageAvatar';
import MessageContainer from './MessageContainer';
import MessageContentBubble from './MessageContentBubble';

export interface UserMessageProps {
  id: string;
  message: Message;
  sx?: BaseMessageProps['sx'];
  bubbleSx?: MuiSxProps<MuiTheme>;
  avatar?: React.ElementType;
  avatarProps?: object;
  className?: string;
}

const UserMessage: React.FC<UserMessageProps> = ({
  id,
  message,
  sx: rootSx,
  bubbleSx: incomingBubbleSx,
  avatar: AvatarComponent,
  avatarProps,
  className,
}) => {
  const { onRegenerate } = useChatBox();

  const [anchorEl, setAnchorEl] = React.useState<HTMLDivElement | null>(null);

  const handleContentClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (popoverActions.length > 0) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
  };

  const openPopover = Boolean(anchorEl);
  const popoverId = openPopover ? `${id}-actions-popover` : undefined;

  const avatarNode = (
    <MessageAvatar
      AvatarComponent={AvatarComponent}
      avatarProps={avatarProps}
    />
  );

  const popoverActions: MessageAction[] = [];
  if (onRegenerate && message.id) {
    popoverActions.push({
      type: 'regenerate',
      label: 'Regenerate',
      icon: <RefreshIcon fontSize='small' />,
      handler: (msg) => {
        if (onRegenerate && msg.id) onRegenerate(msg.id);
        handleClosePopover();
      },
    });
  }

  const renderUserMessageContent = (
    <Stack
      data-testid={`${id}-content-area`}
      sx={{
        alignItems: 'flex-end',
        maxWidth: '80%',
        width: '100%',
        position: 'relative',
        cursor: popoverActions.length > 0 ? 'pointer' : 'default',
      }}
      onClick={handleContentClick}
    >
      <MessageContentBubble
        id={`${id}-bubble`}
        sx={{
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          width: 'auto',
          alignSelf: 'flex-end',
          ...incomingBubbleSx,
        }}
      >
        <Typography variant='body2' style={{ whiteSpace: 'pre-wrap' }}>
          {message.content}
        </Typography>
      </MessageContentBubble>
    </Stack>
  );

  return (
    <React.Fragment>
      <MessageContainer
        id={id}
        className={className}
        sx={rootSx}
        avatarSide='right'
        avatar={avatarNode}
        contentArea={renderUserMessageContent}
      />
      {popoverActions.length > 0 && (
        <Popover
          id={popoverId}
          open={openPopover}
          anchorEl={anchorEl}
          onClose={handleClosePopover}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          sx={{
            '& .MuiPopover-paper': {
              bgcolor: 'transparent',
            },
          }}
        >
          <MessageActions actions={popoverActions} message={message} sx={{}} />
        </Popover>
      )}
    </React.Fragment>
  );
};

export default UserMessage;
