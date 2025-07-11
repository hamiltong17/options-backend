const TRADIER_API_TOKEN = 'gfKgLYNxBCRMFgXDiKZBHg1SKeBJ';
const BASE_URL = 'https://api.tradier.com/v1/markets';

const api = axios.create({
	baseURL: BASE_URL,
	headers: {
	     Authorization: `Bearer ${TRADIER_API_TOKEN}`,
	     Accept: 'application/json'
	  },
});


document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('getOptionsBtn').addEventListener('click', async () => {
    const symbol = document.getElementById('symbolInput').value.trim().toUpperCase();
    if (!symbol) return alert('Enter a symbol');

    try {
      const quoteData = await getStockPrice(symbol);
      displayStockData(quoteData);

      const currentPrice = quoteData?.quotes?.quote?.last;
      if (!currentPrice) {
        alert('Failed to get current stock price.');
        return;
      }

      const expirations = await getExpirations(symbol);
      if (expirations.length === 0) {
        alert('No expirations found.');
        return;
      }
      populateExpirationDropdown(expirations);

      const nearest = expirations[0];
      const options = await getOptionsChain(symbol, nearest);
      displayOptionsChain(options, currentPrice);

      document.getElementById('expirationSelect').addEventListener('change', async (e) => {
        const selectedExp = e.target.value;
        const newOptions = await getOptionsChain(symbol, selectedExp);
        displayOptionsChain(newOptions, currentPrice);
      });

    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to fetch data.');
    }
  });
});

async function getStockPrice(symbol) {
  const response = await fetch(`https://api.tradier.com/v1/markets/quotes?symbols=${symbol}`, {
    headers: {
      Authorization: `Bearer ${TRADIER_API_TOKEN}`,
      Accept: 'application/json',
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch quote');
  }

  return await response.json();
}

async function getExpirations(symbol) {
  const response = await fetch(
    `https://api.tradier.com/v1/markets/options/expirations?symbol=${symbol}&includeAllRoots=true&strikes=false`,
    {
      headers: {
        Authorization: `Bearer ${TRADIER_API_TOKEN}`,
        Accept: 'application/json',
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch expiration dates');
  }

  const data = await response.json();
  return data.expirations?.date || [];
}

async function getOptionsChain(symbol, expiration) {
  const response = await fetch(
    `https://api.tradier.com/v1/markets/options/chains?symbol=${symbol}&expiration=${expiration}`,
    {
      headers: {
        Authorization: `Bearer ${TRADIER_API_TOKEN}`,
        Accept: 'application/json',
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch option chain');
  }

  const data = await response.json();
  return data.options?.option || [];
}

function populateExpirationDropdown(dates) {
  const select = document.getElementById('expirationSelect');
  select.innerHTML = '';

  dates.slice(0, 5).forEach(date => {
    const option = document.createElement('option');
    option.value = date;
    option.textContent = date;
    select.appendChild(option);
  });
}

function displayStockData(data) {
  const quote = data?.quotes?.quote;
  if (!quote) {
    alert('No quote data found');
    return;
  }

  const html = `
    <div class="stock-card">
      <h4>${quote.symbol} - $${quote.last}</h4>
      <div><strong>Open:</strong> ${quote.open}</div>
      <div><strong>High:</strong> ${quote.high}</div>
      <div><strong>Low:</strong> ${quote.low}</div>
      <div><strong>Bid:</strong> ${quote.bid}</div>
      <div><strong>Ask:</strong> ${quote.ask}</div>
      <div><strong>Volume:</strong> ${quote.volume?.toLocaleString()}</div>
      <div><strong>Avg Vol (10d):</strong> ${quote.average_volume?.toLocaleString()}</div>
      <div><strong>Prev Close:</strong> ${quote.prevclose}</div>
      <div><strong>Change:</strong> ${quote.change} (${quote.change_percent}%)</div>
      <div><strong>52w High:</strong> ${quote.week_52_high}</div>
      <div><strong>52w Low:</strong> ${quote.week_52_low}</div>
      <div><strong>Market Cap:</strong> ${quote.market_cap ? quote.market_cap.toLocaleString() : 'N/A'}</div>
      <div><strong>Div Yield:</strong> ${quote.div_yield != null ? quote.div_yield : 'N/A'}</div>
    </div>
  `;

  document.getElementById('results').innerHTML = html;
}

function displayOptionsChain(options, currentPrice) {
  if (!options || options.length === 0) {
    document.getElementById('optionsResults').innerHTML = '<p>No options data available.</p>';
    return;
  }

  const STRIKE_RANGE = 5;

  const calls = options.filter(opt => 
    opt.option_type === 'call' &&
    Math.abs(opt.strike - currentPrice) <= STRIKE_RANGE
  );

  const puts = options.filter(opt => 
    opt.option_type === 'put' &&
    Math.abs(opt.strike - currentPrice) <= STRIKE_RANGE
  );

  const buildTable = (opts) => {
    if (opts.length === 0) return '<p>No options in this strike range.</p>';

    return `
      <table>
        <thead>
          <tr>
            <th>Strike</th>
            <th>Bid</th>
            <th>Ask</th>
            <th>Last</th>
            <th>Volume</th>
            <th>Open Int</th>
            <th>Expiration</th>
          </tr>
        </thead>
        <tbody>
          ${opts.map(opt => `
            <tr>
              <td>${opt.strike}</td>
              <td>${opt.bid}</td>
              <td>${opt.ask}</td>
              <td>${opt.last}</td>
              <td>${opt.volume}</td>
              <td>${opt.open_interest}</td>
              <td>${opt.expiration_date}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };

  const html = `
    <div>
      <button id="showCallsBtn">Show Calls</button>
      <button id="showPutsBtn">Show Puts</button>
    </div>
    <div id="optionsTableContainer">
      ${buildTable(calls)}
    </div>
  `;

  const container = document.getElementById('optionsResults');
  container.innerHTML = html;

  document.getElementById('showCallsBtn').addEventListener('click', () => {
    container.querySelector('#optionsTableContainer').innerHTML = buildTable(calls);
  });

  document.getElementById('showPutsBtn').addEventListener('click', () => {
    container.querySelector('#optionsTableContainer').innerHTML = buildTable(puts);
  });
}


document.getElementById('placeOrderBtn').addEventListener('click', async () => {
	const symbol = document.getElementById('symbolInput).value.trim().toUpperCase();

	const orderDetails = {
		symbol,
		option_symbol: 'AAPL240719C00150000',
		quantity: 1,
		side: 'buy_to_open',
		order_type: 'market',
		duration: 'day',
};

const result = await placeOptionOrderProxy(orderDetails);

if (result) {
  alert('Order placed successfully');

} else {
   alert('Failed to place order.');

   }
});




