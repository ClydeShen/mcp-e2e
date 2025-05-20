'use client';

import React from 'react';
import type { Message, MessageAction, MessageRenderProps } from '../types';
import BotMessage from './BotMessage';
import UserMessage from './UserMessage';

// Import prop types for more specific slotProps typing
import type { BotMessageProps } from './BotMessage';
import type { BotToolProps } from './BotTool';
import type { UserMessageProps } from './UserMessage';

// Import the shared default avatar components
import { DefaultBotAvatar, DefaultUserAvatar } from './DefaultAvatars';

// Theme and SxProps are imported by BotMessage/UserMessage if needed internally or for their own props
// No longer needed directly here if ChatMessageRenderer is purely dispatching
import type { SxProps, Theme } from '@mui/material/styles';

import { useChatBox } from '../ChatBoxContext'; // Import useChatBox

// Helper function to generate unique IDs for sub-components
const generateSubComponentId = (
  parentId?: string,
  prefix?: string,
  uniquePart?: string | number
): string | undefined => {
  if (!parentId && !prefix) return undefined;
  const base = parentId ? `${parentId}-` : '';
  const actualPrefix = prefix ? `${prefix}-` : '';
  return `${base}${actualPrefix}${uniquePart || 'item'}`;
};

// Define slot types specifically for ChatMessageRenderer
export interface MessageRendererSlots {
  // Renamed from internal ChatMessageRendererSlots
  userMessage?: React.ElementType;
  botMessage?: React.ElementType;
  botTool?: React.ElementType;
  userMessageAvatar?: React.ElementType;
  botMessageAvatar?: React.ElementType;
}

export interface MessageRendererSlotProps {
  // Renamed from internal ChatMessageRendererSlotProps
  userMessage?: Partial<UserMessageProps>;
  botMessage?: Partial<
    Omit<BotMessageProps, 'contentSx'> & { bubbleSx?: SxProps<Theme> }
  >;
  botTool?: Partial<BotToolProps>;
  userMessageAvatar?: object;
  botMessageAvatar?: object;
}

interface ChatMessageRendererProps {
  id: string; // ID for the root element of this specific message item
  message: Message;
  messageActions?: MessageAction[]; // Kept as this can be message-specific from ChatBox props
  customRenderMessage?: (
    props: MessageRenderProps & { id?: string }
  ) => React.ReactNode;
  // Props below are now from context:
  // slots?: MessageRendererSlots;
  // slotProps?: MessageRendererSlotProps;
  // disableUserAvatar?: boolean;
  // disableBotAvatar?: boolean;
  // onRegenerate?: (messageId: string) => void;
  // onEditSubmit?: (messageId: string, newContent: string) => void;
}

const ChatMessageRenderer: React.FC<ChatMessageRendererProps> = ({
  id,
  message,
  messageActions, // Still passed as it can be specific from ChatBoxProps.messageActions
  customRenderMessage,
}) => {
  // Get values from context
  const {
    slots,
    slotProps,
    disableUserAvatar,
    disableBotAvatar,
    onRegenerate,
    onEditSubmit,
  } = useChatBox();

  if (customRenderMessage) {
    return customRenderMessage({ message, id });
  }

  const UserMessageComponent = slots?.userMessage || UserMessage;
  const BotMessageComponent = slots?.botMessage || BotMessage;
  // const BotToolComponent = slots?.botTool || BotTool; // BotTool is now internal to BotMessage

  const UserAvatarToRender =
    !disableUserAvatar && (slots?.userMessageAvatar || DefaultUserAvatar);
  const BotAvatarToRender =
    !disableBotAvatar && (slots?.botMessageAvatar || DefaultBotAvatar);

  if (message.role === 'user') {
    return (
      <UserMessageComponent
        id={id}
        message={message}
        // messageActions are typically not for user messages in this pattern, but pass if needed
        avatar={UserAvatarToRender || undefined}
        avatarProps={slotProps?.userMessageAvatar}
        sx={slotProps?.userMessage?.sx}
        bubbleSx={slotProps?.userMessage?.bubbleSx}
        {...(slotProps?.userMessage || {})}
        // onRegenerate and onEditSubmit are now available via useChatBox if UserMessageComponent needs them directly
        // However, UserMessage already uses useChatBox, so no need to pass them here.
      />
    );
  }

  if (message.role === 'assistant') {
    return (
      <BotMessageComponent
        id={id}
        message={message}
        messageActions={messageActions} // Pass message-specific actions if any
        avatar={BotAvatarToRender || undefined}
        avatarProps={slotProps?.botMessageAvatar}
        sx={slotProps?.botMessage?.sx}
        bubbleSx={slotProps?.botMessage?.bubbleSx}
        {...(slotProps?.botMessage || {})}
      />
    );
  }

  return null;
};

export default ChatMessageRenderer;
