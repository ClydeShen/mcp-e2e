// Basic WebSocket server placeholder
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 3002 });

wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket server');
  ws.on('message', (message) => {
    console.log('received: %s', message);
    ws.send(`Echo: ${message}`);
  });
  ws.send('Connected to WebSocket server!');
});

console.log('WebSocket server running on port 3002');
