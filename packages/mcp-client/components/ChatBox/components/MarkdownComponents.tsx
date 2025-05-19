import React from 'react';
import type { Components, ExtraProps } from 'react-markdown';
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter';
// Choose a style for syntax highlighting, e.g., prism, darcula, atomDark, etc.
// You might need to install the corresponding style: `npm install react-syntax-highlighter/dist/esm/styles/prism`
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism'; // Example style

import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import MuiList from '@mui/material/List';
import MuiListItem from '@mui/material/ListItem';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { type TableCellProps } from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

// Note: 'node' is part of the props passed by react-markdown, but we are not using it explicitly in many
// simple component overrides if not needed for complex logic. Its type is complex (related to HAST).
// ExtraProps is a helper type from react-markdown for props on intrinsic elements.

// For GFM task list items, react-markdown might pass `data-sourcepos` or similar, and for `li` it passes `ordered`, `index`.
interface ListItemProps extends ExtraProps {
  ordered?: boolean;
  index?: number;
  children?: React.ReactNode;
  // `node` prop is available but we try to avoid using it directly if possible for simplicity
}

export const markdownComponents: Components = {
  p: (props) => <Typography variant='body2' {...props} />,
  h1: (props) => <Typography variant='h1' {...props} />,
  h2: (props) => <Typography variant='h2' {...props} />,
  h3: (props) => <Typography variant='h3' {...props} />,
  h4: (props) => <Typography variant='h4' {...props} />,
  h5: (props) => <Typography variant='h5' {...props} />,
  h6: (props) => <Typography variant='h6' {...props} />,
  a: (props) => <Link {...props} />,
  ul: (props) => (
    <MuiList
      dense
      sx={(theme) => ({
        pl: theme.spacing(2),
        listStyleType: 'disc',
        typography: 'body2',
      })}
      component='ul'
      {...props}
    />
  ),
  ol: (props) => (
    <MuiList
      dense
      sx={(theme) => ({
        pl: theme.spacing(2),
        listStyleType: 'decimal',
        typography: 'body2',
      })}
      component='ol'
      {...props}
    />
  ),
  li: ({ children, ordered, index, ...props }: ListItemProps) => {
    let isTaskItem = false;
    let isChecked = false;
    let contentToRender = children;

    if (Array.isArray(children) && children.length > 0) {
      const firstChild = children[0] as React.ReactElement<any>;
      if (
        firstChild &&
        firstChild.props &&
        firstChild.type === 'input' &&
        firstChild.props.type === 'checkbox' &&
        'disabled' in firstChild.props
      ) {
        isTaskItem = true;
        isChecked = !!firstChild.props.checked;
        contentToRender = children.slice(1);
      }
    }

    if (isTaskItem) {
      return (
        <MuiListItem
          dense
          sx={(theme) => ({
            display: 'list-item',
            py: theme.spacing(0.25),
            listStyleType: 'none',
            alignItems: 'flex-start',
            typography: 'body2',
          })}
          {...props}
        >
          <Checkbox
            size='small'
            checked={isChecked}
            disabled
            sx={(theme) => ({
              p: 0,
              pr: theme.spacing(0.5),
              mt: theme.spacing(0.25),
            })}
          />
          {contentToRender}
        </MuiListItem>
      );
    }
    return (
      <MuiListItem
        dense
        sx={(theme) => ({
          display: 'list-item',
          py: theme.spacing(0.25),
          typography: 'body2',
        })}
        {...props}
      >
        {children}
      </MuiListItem>
    );
  },
  code: ({
    node,
    inline,
    className,
    children,
    ...props
  }: ExtraProps & {
    node?: any;
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
  }) => {
    const match = /language-(\w+)/.exec(className || '');
    const language = match?.[1];

    if (inline || !language) {
      return (
        <Typography
          component='code'
          variant='body2'
          sx={(theme) => ({
            bgcolor: theme.palette.action.hover,
            px: theme.spacing(0.5),
            py: theme.spacing(0.25),
          })}
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </Typography>
      );
    }

    return (
      <SyntaxHighlighter
        style={materialDark}
        language={language}
        PreTag={(preProps) => (
          <Paper
            variant='outlined'
            component='pre'
            {...preProps}
            sx={(theme) => ({
              my: theme.spacing(1),
              overflow: 'auto',
              fontSize: theme.typography.body2.fontSize,
              lineHeight: theme.typography.body2.lineHeight,
              whiteSpace: 'pre',
              ...(typeof preProps.sx === 'function'
                ? preProps.sx(theme)
                : preProps.sx),
            })}
          />
        )}
        CodeTag={(codeProps) => (
          <Box
            component='code'
            {...codeProps}
            sx={(theme) => ({
              display: 'block',
              p: theme.spacing(0.5),
              fontFamily: 'inherit',
              fontSize: 'inherit',
              lineHeight: 'inherit',
              ...(typeof codeProps.sx === 'function'
                ? codeProps.sx(theme)
                : codeProps.sx),
            })}
          />
        )}
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    );
  },
  blockquote: ({ node, ...props }: ExtraProps & { node?: any }) => (
    <Paper
      component='blockquote'
      sx={(theme) => ({
        borderLeft: `${theme.spacing(0.5)} solid ${theme.palette.divider}`,
        pl: theme.spacing(2),
        py: theme.spacing(1),
        my: theme.spacing(1),
        bgcolor: theme.palette.action.hover,
      })}
      {...props}
    />
  ),
  hr: (props: ExtraProps) => (
    <Divider sx={(theme) => ({ my: theme.spacing(2) })} {...props} />
  ),
  strong: (props: ExtraProps) => (
    <Typography component='strong' sx={{ fontWeight: 'bold' }} {...props} />
  ),
  em: (props: ExtraProps) => (
    <Typography component='em' sx={{ fontStyle: 'italic' }} {...props} />
  ),

  table: (props: ExtraProps) => (
    <TableContainer
      component={Paper}
      variant='outlined'
      sx={(theme) => ({ my: theme.spacing(2) })}
    >
      <Table size='small' {...props} />
    </TableContainer>
  ),
  thead: (props: ExtraProps) => (
    <TableHead
      sx={(theme) => ({ bgcolor: theme.palette.action.focus })}
      {...props}
    />
  ),
  tbody: ({ node, ...props }: ExtraProps & { node?: any }) => (
    <TableBody {...props} />
  ),
  tr: ({ node, ...props }: ExtraProps & { node?: any }) => (
    <TableRow {...props} />
  ),
  th: ({
    node,
    align: htmlAlign,
    ...props
  }: ExtraProps & { node?: any; align?: string }) => {
    const muiCompatibleAlign =
      htmlAlign === 'char' || typeof htmlAlign !== 'string'
        ? undefined
        : (htmlAlign as TableCellProps['align']);
    return (
      <TableCell
        variant='head'
        align={muiCompatibleAlign}
        sx={{ fontWeight: 'bold', typography: 'body2' }}
        {...props}
      />
    );
  },
  td: ({
    node,
    align: htmlAlign,
    ...props
  }: ExtraProps & { node?: any; align?: string }) => {
    const muiCompatibleAlign =
      htmlAlign === 'char' || typeof htmlAlign !== 'string'
        ? undefined
        : (htmlAlign as TableCellProps['align']);
    return (
      <TableCell
        variant='body'
        align={muiCompatibleAlign}
        sx={{ typography: 'body2' }}
        {...props}
      />
    );
  },
  input: ({
    node,
    type,
    disabled,
    checked,
    ...props
  }: ExtraProps & {
    node?: any;
    type?: string;
    disabled?: boolean;
    checked?: boolean;
  }) => {
    if (type === 'checkbox' && disabled) {
      return null;
    }
    return (
      <input type={type} disabled={disabled} checked={checked} {...props} />
    );
  },
};
