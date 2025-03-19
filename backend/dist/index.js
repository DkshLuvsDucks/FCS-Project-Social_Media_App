"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_rate_limit_1 = require("express-rate-limit");
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Import routes
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const postRoutes_1 = __importDefault(require("./routes/postRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const messageRoutes_1 = __importDefault(require("./routes/messageRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
// Import middleware
const securityMiddleware_1 = require("./middleware/securityMiddleware");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
// Configure CORS
app.use((0, cors_1.default)({
    origin: 'https://localhost:5173', // Updated to HTTPS
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json());
// Remove sensitive headers
app.disable('x-powered-by');
// Rate limiting configuration
const loginLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many login attempts. Please wait before trying again.',
    standardHeaders: true,
    legacyHeaders: false,
});
const apiLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for GET requests to reduce unnecessary restrictions
        return req.method === 'GET';
    }
});
const profileLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute for profile related endpoints
    message: 'Too many profile requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for GET requests to profile endpoints
        return req.method === 'GET';
    }
});
// Apply rate limiters to specific routes
app.use('/api/auth/login', loginLimiter);
app.use('/api/users/upload', profileLimiter); // Only limit profile updates/uploads
app.use('/api/users/search', apiLimiter);
// Apply a more lenient general limiter to all other routes
const generalLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 60 * 1000, // 1 minute
    max: 300, // 300 requests per minute
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for GET requests
        return req.method === 'GET';
    }
});
app.use(generalLimiter);
// Security headers
app.use(securityMiddleware_1.securityHeaders);
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});
// Serve static files from uploads directory
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Add caching headers middleware
const cacheMiddleware = (duration) => (req, res, next) => {
    res.setHeader('Cache-Control', `public, max-age=${duration}`);
    next();
};
// Use it on static routes
app.use('/static', cacheMiddleware(86400), express_1.default.static('public'));
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/posts', postRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/messages', messageRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
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
    key: fs_1.default.readFileSync(path_1.default.join(__dirname, '../certificates/private.key')),
    cert: fs_1.default.readFileSync(path_1.default.join(__dirname, '../certificates/certificate.crt'))
};
// Create HTTPS server
const server = https_1.default.createServer(sslOptions, app);
server.listen(PORT, () => {
    console.log(`Server running on https://localhost:${PORT}`);
});
