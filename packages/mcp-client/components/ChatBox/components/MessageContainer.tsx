import ListItem from '@mui/material/ListItem';
import type { SxProps, Theme } from '@mui/material/styles';
import React from 'react';

export interface MessageContainerProps {
  id: string;
  className?: string;
  sx?: SxProps<Theme>;
  avatarSide: 'left' | 'right';
  onHoverChange?: (isHovered: boolean) => void;
  avatar?: React.ReactNode;
  contentArea: React.ReactNode;
  // Note: hoverAccessory is handled by the content area, not directly by MessageContainer
}

const MessageContainer: React.FC<MessageContainerProps> = ({
  id,
  sx,
  avatarSide,
  onHoverChange,
  avatar,
  contentArea,
  className,
}) => {
  const justifyContent = avatarSide === 'left' ? 'flex-start' : 'flex-end';

  return (
    <ListItem
      id={id}
      className={className}
      sx={{
        display: 'flex',
        justifyContent,
        alignItems: 'flex-start', // Keep root ListItem items aligned to top
        mb: 1.5,
        px: 0.5,
        gap: 1,
        ...sx,
      }}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
    >
      {avatarSide === 'left' && avatar}
      {contentArea}
      {avatarSide === 'right' && avatar}
    </ListItem>
  );
};

export default MessageContainer;
