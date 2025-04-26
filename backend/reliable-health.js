const http = require('http');

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // Set response headers
  res.setHeader('Content-Type', 'application/json');
  
  // Respond to all routes with the same health check
  res.writeHead(200);
  res.end(JSON.stringify({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Health check server is running'
  }));
});

// Listen on port 3001
const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Health server running on http://0.0.0.0:${PORT}`);
  console.log('Responding to all routes with health status');
});
