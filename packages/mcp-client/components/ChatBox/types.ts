'use client';

import type { Message as VercelMessage } from '@ai-sdk/react';
import type { SxProps, Theme } from '@mui/material/styles';
import type React from 'react';

// Import props from sub-components to make slotProps more specific
import type { BotMessageProps } from './components/BotMessage';
import type { BotToolProps } from './components/BotTool';
import type { ChatToolbarProps } from './components/ChatToolbar';
import type { ChatToolbarFileSelectorProps } from './components/ChatToolbarFileSelector';
import type { ChatToolbarInputProps } from './components/ChatToolbarInput';
import type { ChatToolbarSendButtonProps } from './components/ChatToolbarSendButton';
import type { ChatToolbarVoiceInputProps } from './components/ChatToolbarVoiceInput';
import type { GreetingMessageProps } from './components/GreetingMessage';
import type { UserMessageProps } from './components/UserMessage';
// import type { ChatMessageRendererProps } from './components/ChatMessageRenderer'; // If we make it a slot

// Re-export Vercel's Message type for convenience or potential augmentation later
export type Message = VercelMessage;

export interface MessageRenderProps {
  message: Message;
  /**
   * The default rendering logic for this message type.
   * A custom renderMessage function can choose to call this to wrap or augment default styling.
   */
  // defaultRender: () => React.ReactNode; // This could be complex to pass down, alternative: provide styled sub-components
}

export type MessageActionType =
  | 'copy'
  | 'regenerate'
  | 'thumbsUp'
  | 'thumbsDown';

export interface MessageAction {
  type: MessageActionType;
  label: string; // e.g., "Copy", "Regenerate response"
  icon?: React.ReactNode;
  handler: (message: Message) => void;
}

// Slot definitions
export interface ChatBoxSlots {
  greetingMessage?: React.ElementType;
  userMessage?: React.ElementType;
  botMessage?: React.ElementType;
  botTool?: React.ElementType;
  chatToolbar?: React.ElementType;
  chatToolbarInput?: React.ElementType;
  chatToolbarSendButton?: React.ElementType;
  chatToolbarFileSelector?: React.ElementType;
  chatToolbarVoiceInput?: React.ElementType;
  // Potentially add chatMessageRenderer if we want to allow swapping the whole renderer logic
  // chatMessageRenderer?: React.ElementType;
  userMessageAvatar?: React.ElementType;
  botMessageAvatar?: React.ElementType;
  statusDisplay?: React.ElementType;
}

export interface ChatBoxSlotProps {
  greetingMessage?: Partial<GreetingMessageProps>;
  userMessage?: Partial<UserMessageProps>;
  botMessage?: Partial<BotMessageProps>;
  botTool?: Partial<BotToolProps>;
  chatToolbar?: Partial<ChatToolbarProps>;
  chatToolbarInput?: Partial<ChatToolbarInputProps>;
  chatToolbarSendButton?: Partial<ChatToolbarSendButtonProps>;
  chatToolbarFileSelector?: Partial<ChatToolbarFileSelectorProps>;
  chatToolbarVoiceInput?: Partial<ChatToolbarVoiceInputProps>;
  // chatMessageRenderer?: Partial<ChatMessageRendererProps>;
  userMessageAvatar?: object; // Props for the user message avatar component
  botMessageAvatar?: object; // Props for the bot message avatar component
  statusDisplayProps?: Record<string, any>;
}

// Update ChatBoxProps
export interface ChatBoxProps {
  /**
   * Optional ID for the root ChatBox element, used for deriving child component IDs.
   */
  id?: string;

  /**
   * The API endpoint for the chat service.
   * (Required by useChat hook)
   */
  api: string;

  /**
   * MUI SxProps for styling the root Box component of the ChatBox.
   */
  sx?: SxProps<Theme>;

  /**
   * Optional custom renderer for each message.
   * If not provided, a default MUI-based renderer will be used internally.
   * The function receives the message object.
   * Note: If using slots for individual message types (userMessage, botMessage),
   * this top-level renderMessage might be superseded or need careful coordination.
   */
  renderMessage?: (
    props: MessageRenderProps & { id?: string } // Added id here as ChatMessageRenderer passes it
  ) => React.ReactNode;

  /**
   * Optional placeholder text for the chat input field.
   * Defaults to "Type your message...".
   */
  inputPlaceholder?: string;

  /**
   * Optional array of actions that can be performed on a message.
   * These will be rendered as buttons or icons next to messages (typically assistant messages).
   */
  messageActions?: MessageAction[];

  /**
   * Optional header content to be rendered above the message list.
   */
  header?: React.ReactNode;

  /**
   * Optional footer content to be rendered below the message input.
   */
  footer?: React.ReactNode;

  /**
   * Initial messages to populate the chat.
   * (Prop for useChat hook)
   */
  initialMessages?: Message[];

  /**
   * Initial input for the chat.
   * (Prop for useChat hook)
   */
  initialInput?: string;

  /**
   * Callback when a message is submitted.
   * (Prop for useChat hook)
   */
  onFinish?: (message: Message) => void;

  /**
   * Callback when an error occurs.
   * (Prop for useChat hook)
   */
  onError?: (error: Error) => void;

  /**
   * Optional: Custom component for rendering the message input area.
   * If not provided, a default MUI TextField and Button will be used.
   */
  // renderInput?: (props: {
  //   input: string;
  //   handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  //   handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  //   isLoading: boolean;
  // }) => React.ReactNode;

  showFileSelector?: boolean;
  showVoiceInput?: boolean;

  /**
   * Optional object to override default sub-components (slots).
   * Keys are slot names (e.g., 'userMessage', 'chatToolbar') and values are the component types.
   */
  slots?: ChatBoxSlots;

  /**
   * Optional object to pass custom props to slotted components.
   * Keys are slot names and values are prop objects for that slot.
   */
  slotProps?: ChatBoxSlotProps;

  /**
   * If true, the default or slotted user avatar will not be rendered.
   * @default false
   */
  disableUserAvatar?: boolean;

  /**
   * If true, the default or slotted bot avatar will not be rendered.
   * @default false
   */
  disableBotAvatar?: boolean;

  maxSteps?: number;
}
