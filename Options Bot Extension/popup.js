const BACKEND_URL = 'https://options-backend-5qjv.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
  const symbolInput = document.getElementById('symbolInput');
  const expirationSelect = document.getElementById('expirationSelect');
  const optionTypeSelect = document.getElementById('optionType');
  const strikePriceInput = document.getElementById('strikePrice');
  const quantityInput = document.getElementById('quantity');
  const orderTypeSelect = document.getElementById('orderType');
  const limitPriceInput = document.getElementById('limitPrice');
  const totalCostDiv = document.getElementById('totalCost');
  const resultsDiv = document.getElementById('results');

  document.getElementById('getOptionsBtn').addEventListener('click', async () => {
    const symbol = symbolInput.value.trim().toUpperCase();
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

      // Select the first expiration by default
      expirationSelect.value = expirations[0];

      const options = await getOptionsChain(symbol, expirations[0]);
      displayOptionsChain(options, currentPrice);

      // Update total cost whenever relevant inputs change
      updateTotalCost();

    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to fetch data.');
    }
  });

  // Update total cost live when any input changes
  [expirationSelect, optionTypeSelect, strikePriceInput, quantityInput].forEach(el => {
    el.addEventListener('change', updateTotalCost);
    el.addEventListener('input', updateTotalCost);
  });

  document.getElementById('placeOrderBtn').addEventListener('click', async () => {
    const symbol = symbolInput.value.trim().toUpperCase();
    const optionType = optionTypeSelect.value;
    const strike = parseFloat(strikePriceInput.value);
    const expiration = expirationSelect.value;
    const quantity = parseInt(quantityInput.value);
    const orderType = orderTypeSelect.value;
    const limitPrice = parseFloat(limitPriceInput.value) || null;

    if (!symbol || !strike || !expiration || !quantity) {
      alert('Please fill out all fields.');
      return;
    }

    const selectedOption = await getOptionSymbolDetails(symbol, expiration, strike, optionType);
    if (!selectedOption || selectedOption.ask === undefined || selectedOption.bid === undefined) {
      alert('Failed to retrieve selected option details.');
      return;
    }

    const totalAsk = selectedOption.ask * quantity * 100;
    const totalBid = selectedOption.bid * quantity * 100;

    resultsDiv.innerHTML = `
      <strong>Estimated Total Cost:</strong><br>
      Ask: $${selectedOption.ask.toFixed(2)} x ${quantity} x 100 = $${totalAsk.toFixed(2)}<br>
      Bid: $${selectedOption.bid.toFixed(2)} x ${quantity} x 100 = $${totalBid.toFixed(2)}
    `;

    const optionSymbol = selectedOption.symbol;

    const orderResult = await placeOptionOrder({
      symbol,
      option_symbol: optionSymbol,
      quantity,
      side: 'buy_to_open',
      order_type: orderType,
      duration: 'day',
      price: limitPrice
    });

    resultsDiv.textContent += `\n\nOrder Response:\n` + JSON.stringify(orderResult, null, 2);
  });

  async function updateTotalCost() {
    const symbol = symbolInput.value.trim().toUpperCase();
    const optionType = optionTypeSelect.value;
    const strike = parseFloat(strikePriceInput.value);
    const expiration = expirationSelect.value;
    const quantity = parseInt(quantityInput.value);

    if (!symbol || !strike || !expiration || !quantity || quantity <= 0) {
      totalCostDiv.textContent = '';
      return;
    }

    try {
      const selectedOption = await getOptionSymbolDetails(symbol, expiration, strike, optionType);
      if (!selectedOption || selectedOption.ask === undefined || selectedOption.bid === undefined) {
        totalCostDiv.textContent = 'Option data not available';
        return;
      }

      const totalAsk = selectedOption.ask * quantity * 100;
      const totalBid = selectedOption.bid * quantity * 100;

      totalCostDiv.textContent = `Ask: $${selectedOption.ask.toFixed(2)} x ${quantity} x 100 = $${totalAsk.toFixed(2)} | Bid: $${selectedOption.bid.toFixed(2)} x ${quantity} x 100 = $${totalBid.toFixed(2)}`;
    } catch (err) {
      totalCostDiv.textContent = 'Error calculating cost';
      console.error(err);
    }
  }

  function displayStockData(data) {
    const quote = data?.quotes?.quote;
    if (!quote) {
      alert('No quote data found');
      return;
    }

    resultsDiv.innerHTML = `
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
  }

  function populateExpirationDropdown(dates) {
    expirationSelect.innerHTML = '';
    dates.slice(0, 5).forEach(date => {
      const option = document.createElement('option');
      option.value = date;
      option.textContent = date;
      expirationSelect.appendChild(option);
    });
  }

  function displayOptionsChain(options, currentPrice) {
    const STRIKE_RANGE = 5;
    const container = document.getElementById('optionsResults');

    if (!options || options.length === 0) {
      container.innerHTML = '<p>No options data available.</p>';
      return;
    }

    const calls = options.filter(opt => opt.option_type === 'call' && Math.abs(opt.strike - currentPrice) <= STRIKE_RANGE);
    const puts = options.filter(opt => opt.option_type === 'put' && Math.abs(opt.strike - currentPrice) <= STRIKE_RANGE);

    const buildTable = (opts) => {
      if (opts.length === 0) return '<p>No options in this strike range.</p>';
      return `
        <table>
          <thead>
            <tr>
              <th>Strike</th><th>Bid</th><th>Ask</th><th>Last</th><th>Vol</th><th>OI</th><th>Exp</th>
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

    container.innerHTML = `
      <div>
        <button id="showCallsBtn">Show Calls</button>
        <button id="showPutsBtn">Show Puts</button>
      </div>
      <div id="optionsTableContainer">
        ${buildTable(calls)}
      </div>
    `;

    document.getElementById('showCallsBtn').addEventListener('click', () => {
      document.getElementById('optionsTableContainer').innerHTML = buildTable(calls);
    });

    document.getElementById('showPutsBtn').addEventListener('click', () => {
      document.getElementById('optionsTableContainer').innerHTML = buildTable(puts);
    });
  }

  async function getOptionSymbolDetails(symbol, expiration, strike, optionType) {
    const options = await getOptionsChain(symbol, expiration);
    return options.find(opt => 
      opt.strike === strike && 
      opt.option_type === optionType
    );
  }

  async function placeOptionOrder(orderDetails) {
    try {
      const response = await fetch(`${BACKEND_URL}/placeOrder`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(orderDetails)
      });
      if (!response.ok) throw new Error('Order failed');
      return await response.json();
    } catch (err) {
      console.error('Order error:', err);
      return {error: err.message};
    }
  }

  async function getStockPrice(symbol) {
    const response = await fetch(`https://api.tradier.com/v1/markets/quotes?symbols=${symbol}`, {
      headers: {
        Authorization: 'Bearer gfKgLYNxBCRMFgXDiKZBHg1SKeBJ',
        Accept: 'application/json',
      }
    });
    if (!response.ok) throw new Error('Failed to fetch quote');
    return await response.json();
  }

  async function getExpirations(symbol) {
    const response = await fetch(`https://api.tradier.com/v1/markets/options/expirations?symbol=${symbol}&includeAllRoots=true&strikes=false`, {
      headers: {
        Authorization: 'Bearer gfKgLYNxBCRMFgXDiKZBHg1SKeBJ',
        Accept: 'application/json',
      }
    });
    if (!response.ok) throw new Error('Failed to fetch expirations');
    const data = await response.json();
    return data.expirations?.date || [];
  }

  async function getOptionsChain(symbol, expiration) {
    const response = await fetch(`https://api.tradier.com/v1/markets/options/chains?symbol=${symbol}&expiration=${expiration}`, {
      headers: {
        Authorization: 'Bearer gfKgLYNxBCRMFgXDiKZBHg1SKeBJ',
        Accept: 'application/json',
      }
    });
    if (!response.ok) throw new Error('Failed to fetch option chain');
    const data = await response.json();
    return data.options?.option || [];
  }
});



const socket = new WebSocket("wss://options-backend-5qjv.onrender.com/ws");

socket.onopen = () => {
  console.log("WebSocket connection opened");
};

socket.onmessage = (event) => {
  console.log("Message received from WebSocket:", event.data);
  const alert = JSON.parse(event.data);

  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon.png",
    title: `${alert.symbol} Alert`,
    message: `News: ${alert.headline}\nPrice: $${alert.price} | Vol: ${alert.volume}`,
    priority: 2
  });
};

socket.onerror = (err) => {
  console.error("WebSocket error:", err);
};

socket.onclose = () => {
  console.warn("WebSocket connection closed");
};
