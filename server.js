const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const TRADIER_API_KEY = process.env.TRADIER_API_KEY;

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

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
