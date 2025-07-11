const axios = require('axios');

const TRADIER_API_TOKEN = 'gfKgLYNxBCRMFgXDiKZBHg1SKeBJ';

const BASE_URL = 'https://api.tradier.com/v1/markets';

const api = axios.create({

     baseURL: 'https://api.tradier.com/v1/markets',
     headers: {
	 Authorization: `Bearer  ${TRADIER_API_TOKEN}`,

	Accept: 'application/json',

   },
});

        async function getExpiration(symbol) {
  try {
    const response = await api.get('/options/expirations', {
      params: { symbol },
    });
    return response.data.expirations.date[0]; // first available expiration date
  } catch (error) {
    console.error('Error fetching expirations:', error.response?.data || error.message);
    return null;
  }
}
 async function getOptionsChains(symbol) {
  try {
    const expiration = await getExpiration(symbol);
    if (!expiration) {
      console.log('No expiration dates found.');
      return null;
    }

    const response = await api.get('/options/chains', {
      params: {
        symbol,
        expiration,
      },
    });

    return response.data.options.option;
  } catch (error) {
    console.error('Error fetching options chains:', error.response?.data || error.message);
    return null;
  }
}


async function getStockPrice(symbol) {
	try {
	const response = await api.get('/quotes',{
      	     params: { symbols: symbol },
          });
	  const quote = response.data.quotes.quote;
	  const data = Array.isArray(quote) ? quote[0] : quote;
          
          console.log('Full quote data:', data);
	  
       return {
  last: data.last,
  bid: data.bid,
  ask: data.ask
};

       } catch (error) {
          console.error('Error getting stock price:' , error.response?.data || error.message);
	  return null;
      }
}
        
function scoreOption(option, stockPrice) {
    const strikeDiff = Math.abs(option.strike - stockPrice);
    const deltaScore = option.greeks?.delta ? 1 - Math.abs(option.greeks.delta - 0.5) : 0;
    const volumeScore = (option.volume || 0) / 1000;
    const oiScore = (option.open_interest || 0) / 1000;
    const proximityScore = strikeDiff > 0 ? 1 / strikeDiff : 2;

    return deltaScore * 3 + volumeScore * 2 + oiScore * 1 + proximityScore * 4;
}

(async () => {
    const symbol = 'OPK';
    const stockPrice = await getStockPrice(symbol);

    if (!stockPrice) {
       console.log('Failed to get stock price. ');
       return;
}

console.log(`Price for ${symbol} - Last: $${stockPrice.last}, Bid: $${stockPrice.bid}, Ask: $${stockPrice.ask}`);
const options = await getOptionsChains(symbol);
if  (!options) {
   console.log('No options returned. ');
   return;
}

const calls = options.filter(opt => opt.option_type === 'call');

const scored = calls.map(opt => ({
    ...opt,
    score: scoreOption(opt, stockPrice.last),
}));

const top = scored.sort((a, b) => b.score - a.score).slice(0, 5);

console.log(`Top Calls for ${symbol} (based on scoring) :`);

top.forEach(opt => {
    console.log(
       `Strike: ${opt.strike}, Exp: ${opt.expiration_date}, Δ: ${opt.greeks?.delta?.toFixed(2)}, Vol: ${opt.volume}, OI: ${opt.open_interest}, Score: ${opt.score.toFixed(2)}`

       );
    });
})();


