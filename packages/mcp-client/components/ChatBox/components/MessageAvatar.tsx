import Box from '@mui/material/Box';
import React from 'react';

export interface MessageAvatarProps {
  AvatarComponent?: React.ElementType; // Optional: an avatar might not always be rendered
  avatarProps?: object;
}

const MessageAvatar: React.FC<MessageAvatarProps> = ({
  AvatarComponent,
  avatarProps = {},
}) => {
  if (!AvatarComponent) {
    return null;
  }

  return (
    <Box sx={{ flexShrink: 0, mt: 0.5 /* Consistent top margin for avatar */ }}>
      <AvatarComponent {...avatarProps} />
    </Box>
  );
};

export default MessageAvatar;
