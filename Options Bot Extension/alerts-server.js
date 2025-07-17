require('dotenv').config();
const express = require('express');
const axios = require('axios');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());


const TICKERS = [
  "DARE", "SONN", "SDST", "SQFT", "PHGE", "MGRM", "OP", "VSEE", "YHC", "WINT", "HUBC", "RANI",
  "CLIK", "VBTX", "ALBT", "CVKD", "SBET", "BMNR", "DVLT", "ACHV", "HYPD", "PMN", "SPPL", "FATN",
  "CTXR", "UPXI", "RBOT", "LNKS", "NBIS", "CLGN", "MTEN", "EPIX", "RBNE", "TZUP", "AXL", "METC",
  "SFIX", "GNS", "PXLW", "MFH", "SDA", "AWRE", "AMST", "CAPT", "CHNR", "OCTO", "ANY", "CALC",
  "ADVB", "CELC", "NB", "ONFO", "PCAP", "RNA", "ANNX", "ABVC", "HYPR", "RXT", "SNDL", "BON",
  "NXTT", "NVVE", "ENGN", "INTJ", "DXST", "ADSK", "PROK", "LUD", "ASIC", "PBI", "LOOP", "CGTX",
  "ENGS", "KVUE", "CGEN", "CEP", "GREE", "GIPR", "ANSS", "MIGI", "IPA", "AEI", "DDC", "IOVA",
  "TCRT", "ZENA", "XTIA", "BTCS", "LESL", "LWLG", "CREV", "BTOC", "DTI", "TELA", "ILAG", "MATH",
  "AMRX", "IVF"
];

const API_KEY = process.env.TRADIER_API_KEY;
const TRADIER_API = 'https://api.tradier.com/v1';

const server = app.listen(port, () => {
	console.log(`Alert server running on port ${port}`);
});

const wss = new Websocket.Server({ server, path: "/ws" });
let clients = [];


wss.on('connection', (ws) => {
  clients.push(ws);
  ws.on('close', () => {
    clients = clients.filter(c => c !== ws);
  });
});

function broadcastAlert(alert) {
  const data = JSON.stringify(alert);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

async function checkQuotesAndNews() {
  const chunks = [];
  for (let i = 0; i < TICKERS.length; i += 50) {
    chunks.push(TICKERS.slice(i, i + 50));
  }

  for (const chunk of chunks) {
    try {
      const quoteRes = await axios.get(`${TRADIER_API}/markets/quotes`, {
        params: { symbols: chunk.join(','), greeks: false },
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          Accept: 'application/json'
        }
      });

      const quotes = quoteRes.data.quotes.quote instanceof Array
        ? quoteRes.data.quotes.quote
        : [quoteRes.data.quotes.quote];

      for (const q of quotes) {
        if (q.last < 5 && q.volume > 100000 && q.change_percentage > 5) {
          const newsRes = await axios.get(`${TRADIER_API}/markets/news`, {
            params: { symbols: q.symbol },
            headers: {
              Authorization: `Bearer ${API_KEY}`,
              Accept: 'application/json'
            }
          });

          const articles = newsRes.data.news?.article || [];
          const latest = articles[0];

          if (latest && Date.now() - new Date(latest.date).getTime() < 5 * 60 * 1000) {
            const alert = {
              symbol: q.symbol,
              price: q.last,
              volume: q.volume,
              changePercent: q.change_percentage,
              headline: latest.headline,
              url: latest.url
            };
            broadcastAlert(alert);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching data from Tradier:", err.message);
    }
  }
}

// Ping every 60 seconds
setInterval(checkQuotesAndNews, 60000);
