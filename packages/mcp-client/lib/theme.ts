'use client';
import { red } from '@mui/material/colors';
import { createTheme } from '@mui/material/styles';

// A custom monospace font stack
const monospaceFontStack = [
  '"SFMono-Regular"',
  '"Consolas"',
  '"Liberation Mono"',
  '"Menlo"',
  'monospace',
].join(',');

// Create a theme instance.
const theme = createTheme({
  palette: {
    primary: {
      main: '#556cd6',
    },
    secondary: {
      main: '#19857b',
    },
    error: {
      main: red.A400,
    },
    // You can add more custom colors or override defaults here
  },
  shape: {
    borderRadius: 4, // Default is 4px
  },
  typography: {
    // You can define your main fontFamily here if not using MUI defaults
    // fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    body2: {
      fontSize: '0.875rem', // 14px
      // Add other body2 defaults if needed
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (themeParam) => `
        code {
          font-family: ${monospaceFontStack};
          font-size: ${themeParam.typography.body2.fontSize || '0.875rem'};
          background-color: ${themeParam.palette.action.hover};
          padding: ${themeParam.spacing(
            0.25,
            0.5
          )}; /* e.g., 2px 4px if spacing(1) is 8px */
          border-radius: ${themeParam.shape.borderRadius * 0.75}px;
        }
        pre {
          font-family: ${monospaceFontStack};
          font-size: ${themeParam.typography.body2.fontSize || '0.875rem'};
          line-height: ${themeParam.typography.body2.lineHeight || 1.43};
          background-color: ${
            themeParam.palette.mode === 'dark'
              ? themeParam.palette.grey[900]
              : themeParam.palette.grey[100]
          };
          padding: ${themeParam.spacing(1)};
          border-radius: ${themeParam.shape.borderRadius}px;
          overflow: auto;
          white-space: pre;
        }
        /* 
          Specific styling for <code> within <pre> is generally not needed
          if the syntax highlighter handles it or if the <pre> styles suffice.
          Example for transparency if pre has its own background:
          pre > code {
            font-size: inherit; 
            font-family: inherit;
            line-height: inherit;
            background-color: transparent; 
            padding: 0;
          }
        */
      `,
    },
  },
  // You can also customize typography, components, etc.
});

export default theme;
