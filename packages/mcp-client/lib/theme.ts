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
  typography: {
    // You can define your main fontFamily here if not using MUI defaults
    // fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    body2: {
      fontSize: '0.875rem', // Standard for body2 (14px)
      // Add other body2 defaults if needed
    },
    // Define a monospace property for easy reference, though MuiCssBaseline will use the string directly
    // monospace: monospaceFontStack, // REMOVED to prevent TypeScript error without type augmentation
    // Optionally, define a custom variant for code if you prefer to use <Typography variant="code">
    // code: {
    //   fontFamily: monospaceFontStack,
    //   fontSize: '0.875rem',
    //   backgroundColor: 'rgba(0, 0, 0, 0.05)', // Example light background
    //   padding: '0.2em 0.4em',
    //   borderRadius: '3px',
    // },
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
          )}; /* 2px 4px if spacing(1) is 8px */
          border-radius: ${themeParam.shape.borderRadius * 0.5}px;
        }
        pre {
          font-family: ${monospaceFontStack};
          font-size: ${themeParam.typography.body2.fontSize || '0.875rem'};
          line-height: ${themeParam.typography.body2.lineHeight || 1.43};
          background-color: ${
            themeParam.palette.mode === 'dark'
              ? themeParam.palette.grey[900]
              : themeParam.palette.grey[100]
          }; /* Example: different bg for light/dark */
          padding: ${themeParam.spacing(1)};
          border-radius: ${themeParam.shape.borderRadius}px;
          overflow: auto;
          white-space: pre;
        }
        /* Specific styling for code within pre, if SyntaxHighlighter doesn't cover it fully */
        /* Usually SyntaxHighlighter themes handle this well. */
        /* pre > code {
          font-size: inherit; 
          font-family: inherit;
          line-height: inherit;
          background-color: transparent; 
          padding: 0;
        } */
      `,
    },
  },
  // You can also customize typography, components, etc.
});

export default theme;
