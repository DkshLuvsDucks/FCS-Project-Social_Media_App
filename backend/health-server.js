const express = require('express');
const cors = require('cors');
const app = express();
const port = 3001;

app.use(cors({
  origin: '*',
  credentials: true
}));

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`Received: ${req.method} ${req.url}`);
  next();
});

// Add health endpoint at root
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Add health endpoint at /api/health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Generic catch-all endpoint
app.use((req, res) => {
  console.log(`Not found: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Not found', path: req.url });
});

app.listen(port, () => {
  console.log(`Health server running on http://localhost:${port}`);
  console.log(`Available endpoints: /health and /api/health`);
});
