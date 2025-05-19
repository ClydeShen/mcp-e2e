import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import React from 'react';
import type { Message, MessageAction } from '../types';
import MessageActions from './MessageActions';
import MessageAvatar from './MessageAvatar';
import MessageContainer from './MessageContainer';
import MessageContentBubble from './MessageContentBubble';

export interface BaseMessageProps {
  id?: string;
  message: Message;
  messageActions?: MessageAction[];
  avatar?: React.ElementType;
  avatarProps?: object;
  avatarSide: 'left' | 'right';
  sx?: SxProps<Theme>;
  bubbleSx?: SxProps<Theme>;
  renderContent: (message: Message) => React.ReactNode;
  filterActions?: (
    actions: MessageAction[],
    message: Message
  ) => MessageAction[];
  onHoverChange?: (hovering: boolean) => void;
  hoverAccessory?: React.ReactNode;
  // Added to allow passing className from higher-order components like UserMessage/BotMessage
  className?: string;
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
  onHoverChange,
  hoverAccessory,
  className,
}) => {
  const processedActions =
    filterActions && messageActions
      ? filterActions(messageActions, message)
      : messageActions;

  const alignItemsContent = avatarSide === 'left' ? 'flex-start' : 'flex-end';

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
      {hoverAccessory}
      <MessageContentBubble id={id ? `${id}-bubble` : undefined} sx={bubbleSx}>
        {renderContent(message)}
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
      sx={sx}
      avatarSide={avatarSide}
      onHoverChange={onHoverChange}
      avatar={avatarNode}
      contentArea={contentAreaNode}
    />
  );
};

export default BaseMessage;
