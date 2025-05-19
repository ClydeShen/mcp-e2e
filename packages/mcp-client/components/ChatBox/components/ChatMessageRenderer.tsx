'use client';

import { TextUIPart, ToolInvocationUIPart } from '@ai-sdk/ui-utils';
import { Box } from '@mui/material'; // For combined text/tool messages
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message, MessageAction, MessageRenderProps } from '../types';
import BotMessage from './BotMessage';
import BotTool from './BotTool';
import { markdownComponents } from './MarkdownComponents'; // ADDED: Import shared components
import MessageActions from './MessageActions'; // Import MessageActions
import MessageAvatar from './MessageAvatar'; // Import for avatar
import MessageContainer from './MessageContainer'; // Import for structure
import MessageContentBubble from './MessageContentBubble'; // Import the new component
import UserMessage from './UserMessage';

// Import prop types for more specific slotProps typing
import type { BotMessageProps } from './BotMessage';
import type { BotToolProps } from './BotTool';
import type { UserMessageProps } from './UserMessage';

// Import the shared default avatar components
import { DefaultBotAvatar, DefaultUserAvatar } from './DefaultAvatars';

import type { SxProps, Theme } from '@mui/material/styles'; // Ensure Theme and SxProps are imported

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
interface MessageRendererSlots {
  userMessage?: React.ElementType;
  botMessage?: React.ElementType;
  botTool?: React.ElementType;
  userMessageAvatar?: React.ElementType;
  botMessageAvatar?: React.ElementType;
}

interface MessageRendererSlotProps {
  userMessage?: Partial<UserMessageProps>;
  botMessage?: Partial<
    Omit<BotMessageProps, 'contentSx'> & { bubbleSx?: SxProps<Theme> }
  >;
  botTool?: Partial<BotToolProps>;
  userMessageAvatar?: object;
  botMessageAvatar?: object;
}

interface ChatMessageRendererProps {
  id?: string; // ID for the root element rendered by this component (e.g., ListItem for mixed content)
  message: Message;
  messageActions?: MessageAction[];
  customRenderMessage?: (
    props: MessageRenderProps & { id?: string }
  ) => React.ReactNode;
  slots?: MessageRendererSlots; // Slots passed down from ChatBox
  slotProps?: MessageRendererSlotProps; // SlotProps passed down from ChatBox
  disableUserAvatar?: boolean;
  disableBotAvatar?: boolean;
  onRegenerate?: (messageId: string) => void;
}

const ChatMessageRenderer: React.FC<ChatMessageRendererProps> = ({
  id,
  message,
  messageActions,
  customRenderMessage,
  slots = {},
  slotProps = {},
  disableUserAvatar = false,
  disableBotAvatar = false,
  onRegenerate,
}) => {
  if (customRenderMessage) {
    return customRenderMessage({ message, id });
  }

  const UserMessageComponent = slots.userMessage || UserMessage;
  const BotMessageComponent = slots.botMessage || BotMessage;
  const BotToolComponent = slots.botTool || BotTool;

  const UserAvatarToRender =
    !disableUserAvatar && (slots.userMessageAvatar || DefaultUserAvatar);
  const BotAvatarToRender =
    !disableBotAvatar && (slots.botMessageAvatar || DefaultBotAvatar);

  if (message.role === 'user') {
    return (
      <UserMessageComponent
        id={id}
        message={message}
        messageActions={messageActions}
        avatar={UserAvatarToRender || undefined}
        avatarProps={slotProps.userMessageAvatar}
        sx={slotProps.userMessage?.sx}
        bubbleSx={slotProps.userMessage?.bubbleSx}
        {...(slotProps.userMessage || {})}
        onRegenerate={onRegenerate}
      />
    );
  }

  if (message.role === 'assistant') {
    if (message.parts && message.parts.length > 0) {
      const assistantMessageParts = message.parts
        .map((part, index) => {
          if (part.type === 'text') {
            const textPart = part as TextUIPart;

            const baseTextBubbleStylesFn = (theme: Theme) => ({
              bgcolor: theme.palette.grey[100],
              color: theme.palette.text.primary,
              mb: 1,
              alignSelf: 'flex-start',
              maxWidth: '100%',
            });

            let finalBubbleSx: SxProps<Theme>;
            const slotBubbleSx = slotProps.botMessage?.bubbleSx;

            if (!slotBubbleSx) {
              finalBubbleSx = baseTextBubbleStylesFn;
            } else {
              const stylesArray: Array<
                Exclude<
                  SxProps<Theme>,
                  ReadonlyArray<any> | boolean | null | undefined
                >
              > = [baseTextBubbleStylesFn];
              if (Array.isArray(slotBubbleSx)) {
                slotBubbleSx.forEach((item) => {
                  if (
                    item &&
                    (typeof item === 'object' || typeof item === 'function')
                  ) {
                    stylesArray.push(
                      item as Exclude<
                        SxProps<Theme>,
                        ReadonlyArray<any> | boolean | null | undefined
                      >
                    );
                  }
                });
              } else {
                // slotBubbleSx is an object or function
                if (
                  slotBubbleSx &&
                  (typeof slotBubbleSx === 'object' ||
                    typeof slotBubbleSx === 'function')
                ) {
                  stylesArray.push(
                    slotBubbleSx as Exclude<
                      SxProps<Theme>,
                      ReadonlyArray<any> | boolean | null | undefined
                    >
                  );
                }
              }
              finalBubbleSx = stylesArray;
            }

            return (
              <MessageContentBubble
                key={`${message.id}-text-${index}`}
                id={generateSubComponentId(id, 'text-bubble', index)}
                sx={finalBubbleSx}
              >
                <ReactMarkdown
                  components={markdownComponents}
                  remarkPlugins={[remarkGfm]}
                >
                  {textPart.text}
                </ReactMarkdown>
              </MessageContentBubble>
            );
          } else if (part.type === 'tool-invocation') {
            const toolPart = part as ToolInvocationUIPart;
            // For tool invocation, we directly apply a simpler style or could use a similar merge if needed.
            const toolBubbleSx = (theme: Theme) => ({
              bgcolor: theme.palette.grey[50], // Slightly different bg for tools
              color: theme.palette.text.primary,
              mb: 1,
              alignSelf: 'flex-start',
              maxWidth: '100%',
              p: 1,
            });
            return (
              <MessageContentBubble
                key={`${message.id}-tool-${index}`}
                id={generateSubComponentId(id, 'tool-bubble', index)}
                sx={toolBubbleSx}
              >
                <BotToolComponent
                  id={generateSubComponentId(
                    id,
                    'tool',
                    toolPart.toolInvocation.toolCallId || index
                  )}
                  toolInvocation={toolPart.toolInvocation}
                  {...(slotProps.botTool || {})}
                />
              </MessageContentBubble>
            );
          }
          return null;
        })
        .filter(Boolean);

      // If, after filtering, there are no renderable parts but the original message had content (e.g. only unsupported parts),
      // fall back to rendering simple BotMessage if message.content exists.
      if (assistantMessageParts.length === 0 && message.content) {
        return (
          <BotMessageComponent
            id={id}
            message={message}
            messageActions={messageActions}
            avatar={BotAvatarToRender || undefined}
            avatarProps={slotProps.botMessageAvatar}
            sx={slotProps.botMessage?.sx}
            bubbleSx={slotProps.botMessage?.bubbleSx}
            {...(slotProps.botMessage || {})}
          />
        );
      }

      // Only render the ListItem wrapper if there are parts to display
      if (assistantMessageParts.length > 0) {
        const avatarNode = BotAvatarToRender && (
          <MessageAvatar
            AvatarComponent={BotAvatarToRender}
            avatarProps={slotProps.botMessageAvatar || {}}
          />
        );

        const contentAreaForParts = (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              flexGrow: 1,
              width: '100%', // Ensure it takes available width
            }}
          >
            {assistantMessageParts}
            <MessageActions
              actions={messageActions || []}
              message={message}
              justifyContent='flex-start'
            />
          </Box>
        );

        return (
          <MessageContainer
            id={id}
            sx={{
              width: '100%', // Ensure the container takes full width
              ...(slotProps.botMessage?.sx || {}),
            }}
            avatarSide='left' // Bot messages are typically left-aligned
            avatar={avatarNode}
            contentArea={contentAreaForParts}
            // onHoverChange and hoverAccessory could be added if needed for the whole block
          />
        );
      }
      // If parts array was present but yielded no renderable content (e.g. all unknown part types)
      // and no message.content fallback, render nothing for this message.
      return null;
    } else if (message.content) {
      // Assistant message with no parts, just a string content
      return (
        <BotMessageComponent
          id={id}
          message={message}
          messageActions={messageActions}
          avatar={BotAvatarToRender || undefined}
          avatarProps={slotProps.botMessageAvatar}
          sx={slotProps.botMessage?.sx}
          bubbleSx={slotProps.botMessage?.bubbleSx}
          {...(slotProps.botMessage || {})}
        />
      );
    }
  }

  return null; // Fallback for unhandled roles or assistant messages with no parts and no content
};

export default ChatMessageRenderer;
