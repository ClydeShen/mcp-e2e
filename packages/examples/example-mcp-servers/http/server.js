// Basic HTTP server placeholder
const http = require('http');

http.createServer((req, res) => {
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: JSON.parse(body) }));
    });
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('HTTP Server is running. Send a POST request.\n');
  }
}).listen(3003, () => {
  console.log('HTTP server running on port 3003');
});
