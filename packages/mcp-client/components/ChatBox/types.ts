'use client';

import type { Message as VercelMessage } from '@ai-sdk/react';
import type { SxProps, Theme } from '@mui/material/styles';
import type React from 'react';

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

export interface ChatBoxProps {
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
   */
  renderMessage?: (props: MessageRenderProps) => React.ReactNode;

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
}
