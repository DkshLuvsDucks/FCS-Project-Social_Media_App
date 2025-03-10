import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';
import https from 'https';
import fs from 'fs';
import path from 'path';

// Import routes
import authRoutes from './routes/authRoutes';
import postRoutes from './routes/postRoutes';
import adminRoutes from './routes/adminRoutes';
import messageRoutes from './routes/messageRoutes';
import userRoutes from './routes/userRoutes';

// Import middleware
import { securityHeaders } from './middleware/securityMiddleware';

// Load environment variables
dotenv.config();

const app = express();

// Configure CORS
app.use(cors({
  origin: 'https://localhost:5173', // Updated to HTTPS
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Remove sensitive headers
app.disable('x-powered-by');

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Security headers
app.use(securityHeaders);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

const PORT = process.env.PORT || 3000;

// SSL configuration
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, '../certificates/private.key')),
  cert: fs.readFileSync(path.join(__dirname, '../certificates/certificate.crt'))
};

// Create HTTPS server
const server = https.createServer(sslOptions, app);

server.listen(PORT, () => {
  console.log(`Server running on https://localhost:${PORT}`);
}); 