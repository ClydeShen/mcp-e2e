// Basic SSE server placeholder
const http = require('http');

http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  setInterval(() => {
    res.write(`data: ${JSON.stringify({ time: new Date().toLocaleTimeString() })}\n\n`);
  }, 2000);
}).listen(3001, () => {
  console.log('SSE server running on port 3001');
});
