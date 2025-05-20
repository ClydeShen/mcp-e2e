import React, { createContext, useContext } from 'react';
import type { ChatBoxSlotProps, ChatBoxSlots } from './types'; // Adjust path if necessary

// Define the shape of the context value
export interface ChatBoxContextType {
  rootId: string;
  slots?: ChatBoxSlots;
  slotProps?: ChatBoxSlotProps;
  disableUserAvatar?: boolean;
  disableBotAvatar?: boolean;
  onRegenerate?: (messageId: string) => void;
  onEditSubmit?: (messageId: string, newContent: string) => void;
  // Add any other values that need to be accessed by descendant components
}

// Create the context with a default undefined value
const ChatBoxContext = createContext<ChatBoxContextType | undefined>(undefined);

// Create the provider component
interface ChatBoxProviderProps {
  children: React.ReactNode;
  value: ChatBoxContextType;
}

export const ChatBoxProvider: React.FC<ChatBoxProviderProps> = ({
  children,
  value,
}) => {
  return (
    <ChatBoxContext.Provider value={value}>{children}</ChatBoxContext.Provider>
  );
};

// Create the custom hook to use the context
export const useChatBox = (): ChatBoxContextType => {
  const context = useContext(ChatBoxContext);
  if (context === undefined) {
    throw new Error('useChatBox must be used within a ChatBoxProvider');
  }
  return context;
};
