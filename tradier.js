const axios = require('axios');

const TRADIER_API_TOKEN = 'YOUR_TRADIER_API_TOKEN'; // ← Replace this with your real token
const BASE_URL = 'https://sandbox.tradier.com/v1/markets';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${TRADIER_API_TOKEN}`,
    Accept: 'application/json',
  },
});

async function getOptionsChains(symbol) {
  try {
    const response = await api.get('/options/chains', {
      params: {
        symbol,
        expiration: '', // Leave this empty or provide a real expiration date like '2025-07-19'
      },
    });

    return response.data.options.option;
  } catch (error) {
    console.error('Error fetching options chains:', error.response?.data || error.message);
    return null;
  }
}

(async () => {
  const symbol = 'AAPL';
  const options = await getOptionsChains(symbol);

  if (options) {
    console.log(`Options data for ${symbol}:`);
    console.log(options.slice(0, 5));
  } else {
    console.log('No options returned.');
  }
})();
