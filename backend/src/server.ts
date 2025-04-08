import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import routes from './routes';
import path from 'path';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { instrument } from '@socket.io/admin-ui';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import rateLimiter from 'express-rate-limit';
import { authenticate } from './middleware/authMiddleware';

// Load environment variables
dotenv.config();

// Create Express application
const app = express();
const PORT = process.env.PORT || 3000;

// Set up middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));
app.use(compression());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Create HTTP server
const server = http.createServer(app);

// Set up Socket.io
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "https://admin.socket.io"],
    credentials: true
  },
});

// Connect Socket.io admin UI
instrument(io, {
  auth: false
});

// Rate limiting
const apiLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to all requests
app.use(apiLimiter);

// Socket.io authentication middleware
io.use((socket: Socket, next: (err?: Error) => void) => {
  // Add authentication for socket connections here if needed
  next();
});

// Socket.io connection handler
io.on('connection', (socket: Socket) => {
  console.log('A user connected:', socket.id);
  
  // Handle user joining a room
  socket.on('join-room', (roomId: string) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });
  
  // Handle user leaving a room
  socket.on('leave-room', (roomId: string) => {
    socket.leave(roomId);
    console.log(`User ${socket.id} left room ${roomId}`);
  });
  
  // Handle user disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Routes
app.use('/api', routes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 