// HTTP version of the server
const express = require('express');
const { createServer } = require('http');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Redirect require statements to use the original modules
const originalRequire = require;
require = function(modulePath) {
  if (modulePath === 'https') {
    return { createServer: () => {} }; // Mock HTTPS
  }
  return originalRequire(modulePath);
};

// Import your original server code
const originalServer = require('./dist/index');

// Use your existing routes and middleware from the original server
// This assumes your original server exports app or sets up routes properly

// Set up basic CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

// Create HTTP server
const server = createServer(app);

// Start server
server.listen(port, () => {
  console.log(`HTTP Server running on http://localhost:${port}`);
});
