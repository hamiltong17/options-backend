const express = require('express');
const axios = require('axios');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
require('dotenv').config();

const app = express();
const server = http.createServer(app); // Use for both express & ws
const wss = new WebSocket.Server({ server, path: "/ws" });

const PORT = process.env.PORT || 3000;
const TRADIER_API_KEY = process.env.TRADIER_API_KEY;

app.use(cors());
app.use(express.json());

// --- EXPRESS ROUTE ---
app.post('/place-option-order', async (req, res) => {
  try {
    const {
      symbol,
      option_symbol,
      quantity = 1,
      side = 'buy_to_open',
      order_type = 'market',
      duration = 'day',
      price = null
    } = req.body;

    const params = new URLSearchParams({
      class: 'option',
      symbol,
      option_symbol,
      side,
      quantity: quantity.toString(),
      type: order_type,
      duration
    });

    if (order_type === 'limit' && price !== null) {
      params.append('price', price.toString());
    }

    const response = await axios.post(
      'https://api.tradier.com/v1/accounts/6YB59224/orders',
      params.toString(),
      {
        headers: {
          Authorization: `Bearer ${TRADIER_API_KEY}`,
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Order Error:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

// --- WEBSOCKET SETUP ---
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  ws.send(JSON.stringify({
    symbol: 'TEST',
    headline: 'This is a test notification',
    price: 1.23,
    volume: 100000
  }));

  ws.on('message', (message) => {
    console.log('Received from client:', message);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// --- START SERVER ---
server.listen(PORT, () => {
  console.log(` Server & WebSocket listening on port ${PORT}`);
});

app.get('/', (req, res) => {
  res.send('Options backend is running');
});





