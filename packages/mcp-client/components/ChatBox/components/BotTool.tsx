import { ToolInvocation } from '@ai-sdk/ui-utils';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import React from 'react';

export interface BotToolProps {
  id?: string;
  toolInvocation: ToolInvocation;
  sx?: object; // Allow style overrides for the Accordion
}

const BotTool: React.FC<BotToolProps> = ({ id, toolInvocation, sx }) => {
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

  return (
    <Accordion id={id} sx={{ mb: 1, width: '100%', bgcolor: 'grey.50', ...sx }}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`panel-${toolCallId}-content`}
        id={`panel-${toolCallId}-header`}
      >
        <Typography variant='caption' sx={{ fontWeight: 'bold' }}>
          Tool: {toolName} (Status: {status})
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ bgcolor: 'white' }}>
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
            sx={{
              p: 1,
              maxHeight: 150,
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              bgcolor: 'grey.100',
            }}
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
              sx={{
                p: 1,
                maxHeight: 150,
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                bgcolor:
                  'isError' in toolInvocation && toolInvocation.isError
                    ? 'error.lighter'
                    : 'grey.100',
                color:
                  'isError' in toolInvocation && toolInvocation.isError
                    ? 'error.contrastText'
                    : 'inherit',
              }}
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
