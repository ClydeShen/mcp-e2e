import { ToolInvocation } from '@ai-sdk/ui-utils';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { alpha, SxProps, Theme } from '@mui/material/styles';
import React from 'react';

export interface BotToolProps {
  id: string;
  toolInvocation: ToolInvocation;
  sx?: SxProps<Theme>;
  statusDisplay?: React.ElementType; // Slot for custom status display
  statusDisplayProps?: object; // Props for the custom status display
}

// Helper to determine Chip color based on status
const getStatusChipColor = (
  status: string
):
  | 'default'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'info'
  | 'success'
  | 'warning' => {
  switch (status) {
    case 'Called':
    case 'Streaming...':
      return 'info';
    case 'Complete':
      return 'success';
    case 'Error':
      return 'error';
    case 'Pending...':
      return 'warning';
    default:
      return 'default';
  }
};

interface DefaultStatusDisplayProps {
  toolName: string;
  status: string;
}

const DefaultStatusDisplay: React.FC<DefaultStatusDisplayProps> = ({
  toolName,
  status,
}) => (
  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
    <Typography
      variant='caption'
      sx={{ fontWeight: 'bold', mr: 1, flexShrink: 0 }}
    >
      Tool: {toolName}
    </Typography>
    <Chip
      label={status}
      color={getStatusChipColor(status)}
      size='small'
      variant='outlined'
      sx={{ mr: 'auto' }} // Pushes icon to the right if summary is flex
    />
  </Box>
);

const BotTool: React.FC<BotToolProps> = ({
  id,
  toolInvocation,
  sx,
  statusDisplay,
  statusDisplayProps,
}) => {
  if (!toolInvocation) return null;

  const toolName = toolInvocation.toolName;
  const toolCallId = toolInvocation.toolCallId;
  let args = '{}';
  let formattedResult = 'Pending...';
  let status = 'Unknown';

  if (
    toolInvocation.state === 'call' ||
    toolInvocation.state === 'partial-call'
  ) {
    args = toolInvocation.args
      ? JSON.stringify(toolInvocation.args, null, 2)
      : '{}';
    status = toolInvocation.state === 'call' ? 'Called' : 'Streaming...';
  } else if (toolInvocation.state === 'result') {
    args = toolInvocation.args
      ? JSON.stringify(toolInvocation.args, null, 2)
      : '{}';
    formattedResult = toolInvocation.result
      ? JSON.stringify(toolInvocation.result, null, 2)
      : 'No result data';
    status = 'Complete';
    if ('isError' in toolInvocation && toolInvocation.isError) {
      status = 'Error';
    }
  }

  const StatusDisplayComponent = statusDisplay || DefaultStatusDisplay;

  return (
    <Accordion
      id={id}
      sx={(theme) => ({
        mb: 1,
        width: '100%',
        bgcolor: theme.palette.grey[100],
        ...sx,
      })}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`panel-${toolCallId}-content`}
        id={`panel-${toolCallId}-header`}
      >
        <StatusDisplayComponent
          toolName={toolName}
          status={status}
          {...(statusDisplayProps || {})}
        />
      </AccordionSummary>
      <AccordionDetails
        sx={(theme) => ({ bgcolor: theme.palette.background.paper })}
      >
        <Box>
          <Typography
            variant='caption'
            display='block'
            gutterBottom
            sx={{ fontWeight: 'medium' }}
          >
            Arguments:
          </Typography>
          <Paper
            variant='outlined'
            sx={(theme) => ({
              p: theme.spacing(1),
              maxHeight: 150,
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              bgcolor: theme.palette.grey[100],
            })}
          >
            <Typography component='pre' variant='caption'>
              {args}
            </Typography>
          </Paper>
        </Box>
        {toolInvocation.state === 'result' && (
          <Box sx={{ mt: 1 }}>
            <Typography
              variant='caption'
              display='block'
              gutterBottom
              sx={{ fontWeight: 'medium' }}
            >
              Result:
            </Typography>
            <Paper
              variant='outlined'
              sx={(theme) => ({
                p: theme.spacing(1),
                maxHeight: 150,
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                bgcolor:
                  'isError' in toolInvocation && toolInvocation.isError
                    ? alpha(theme.palette.error.main, 0.1)
                    : theme.palette.grey[100],
                color:
                  'isError' in toolInvocation && toolInvocation.isError
                    ? theme.palette.error.dark
                    : 'inherit',
              })}
            >
              <Typography
                component='pre'
                variant='caption'
                sx={{ whiteSpace: 'pre-wrap' }}
              >
                {formattedResult}
              </Typography>
            </Paper>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default BotTool;
