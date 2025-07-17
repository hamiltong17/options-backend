const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);

// Here is where you create the WebSocket server on your existing HTTP server
const wss = new WebSocket.Server({ server, path: "/ws" });

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('Client connected');

  // Example: Send a test message immediately
  ws.send(JSON.stringify({
    symbol: 'TEST',
    headline: 'Test notification from server',
    price: 123.45,
    volume: 1000
  }));

  // Handle incoming messages from client if needed
  ws.on('message', (message) => {
    console.log('Received from client:', message);
  });
});

// Express HTTP routes (optional)
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Start the server — this both handles HTTP and WebSocket on the same port
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
