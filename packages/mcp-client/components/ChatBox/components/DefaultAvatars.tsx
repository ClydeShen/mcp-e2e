'use client';

import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import Avatar from '@mui/material/Avatar';
import * as React from 'react';

export const DefaultBotAvatar = (
  props: React.ComponentProps<typeof Avatar>
) => (
  <Avatar {...props}>
    <SmartToyOutlinedIcon />
  </Avatar>
);

export const DefaultUserAvatar = (
  props: React.ComponentProps<typeof Avatar>
) => (
  <Avatar {...props}>
    <PersonOutlineOutlinedIcon />
  </Avatar>
);
