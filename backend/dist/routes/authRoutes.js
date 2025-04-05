"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const securityMiddleware_1 = require("../middleware/securityMiddleware");
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const sessionUtils_1 = require("../utils/sessionUtils");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Token verification endpoint
router.get('/verify', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                username: true,
                role: true
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    }
    catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({ error: 'Failed to verify token' });
    }
});
// Get current user's information
router.get('/me', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                username: true,
                role: true,
                userImage: true,
                bio: true,
                mobile: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    }
    catch (error) {
        console.error('Error fetching current user:', error);
        res.status(500).json({ error: 'Failed to fetch user information' });
    }
});
// Public routes
router.post('/register/check', async (req, res) => {
    try {
        const { username, email } = req.body;
        // Check if username exists
        if (username) {
            const existingUsername = await prisma.user.findUnique({
                where: { username }
            });
            if (existingUsername) {
                return res.status(400).json({ field: 'username', error: 'Username is already taken' });
            }
        }
        // Check if email exists
        if (email) {
            const existingEmail = await prisma.user.findUnique({
                where: { email }
            });
            if (existingEmail) {
                return res.status(400).json({ field: 'email', error: 'Email is already registered' });
            }
        }
        // No conflicts found
        res.json({ message: 'Username and email are available' });
    }
    catch (error) {
        console.error('Registration check error:', error);
        res.status(500).json({ error: 'Failed to check registration details' });
    }
});
router.post('/register', async (req, res) => {
    try {
        console.log('Registration request received:', req.body);
        const { username, email, password, mobile } = req.body;
        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }
        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { username },
                    ...(mobile ? [{ mobile }] : []),
                ],
            },
        });
        if (existingUser) {
            if (existingUser.email === email) {
                return res.status(400).json({ error: 'Email already registered' });
            }
            if (existingUser.username === username) {
                return res.status(400).json({ error: 'Username already taken' });
            }
            if (mobile && existingUser.mobile === mobile) {
                return res.status(400).json({ error: 'Mobile number already registered' });
            }
        }
        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcryptjs_1.default.hash(password, saltRounds);
        // Create new user
        const newUser = await prisma.user.create({
            data: {
                username,
                email,
                mobile,
                passwordHash,
                role: 'USER',
            },
            select: {
                id: true,
                username: true,
                email: true,
                mobile: true,
                role: true,
                createdAt: true,
            },
        });
        // Generate session ID
        const sessionId = (0, sessionUtils_1.generateSessionId)();
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ userId: newUser.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        // Create session
        await prisma.session.create({
            data: {
                id: sessionId,
                userId: newUser.id,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                userAgent: req.headers['user-agent'] || 'unknown',
                ipAddress: req.ip || '127.0.0.1',
            }
        });
        // Set cookie with the token
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        console.log('New user registered:', newUser);
        res.status(201).json({
            success: true,
            token,
            user: {
                id: newUser.id,
                email: newUser.email,
                username: newUser.username
            }
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});
router.post('/login', securityMiddleware_1.loginRateLimiter, authController_1.login);
// Protected routes
router.post('/logout', authMiddleware_1.authenticate, authController_1.logout);
router.get('/verify', authMiddleware_1.authenticate, authController_1.verify);
exports.default = router;
