const express = require('express'); // Import Express
const app = express();              // Create an app instance

app.get('/ping', (req, res) => {
  res.send('pong');
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
