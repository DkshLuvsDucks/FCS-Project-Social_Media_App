"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.authorizeRole = exports.validateSession = exports.authenticate = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = __importDefault(require("../config/db"));
const sessionUtils_1 = require("../utils/sessionUtils"); // Make sure this returns a valid string, e.g. using uuidv4
// Utility function for password validation
const isValidPassword = async (password, hash) => {
    return await bcryptjs_1.default.compare(password, hash);
};
// --------------------------
// Registration Endpoint
// --------------------------
const register = async (req, res) => {
    const { username, email, password } = req.body;
    try {
        // Hash the password before storing
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        // Create the new user
        const user = await db_1.default.user.create({
            data: {
                username,
                email,
                passwordHash,
                role: 'USER'
            }
        });
        console.log('New user registered:', user);
        // ****************** MODIFIED SECTION START ******************
        // Generate a sessionId and verify it is valid.
        const sessionId = (0, sessionUtils_1.generateSessionId)();
        if (!sessionId) {
            throw new Error('Session ID generation failed');
        }
        const sessionTimeoutSeconds = parseInt(process.env.SESSION_TIMEOUT || '3600');
        const expiresAt = new Date(Date.now() + sessionTimeoutSeconds * 1000);
        // Create a session for the new user
        const session = await db_1.default.session.create({
            data: {
                id: sessionId,
                userId: user.id,
                expiresAt,
                userAgent: req.headers['user-agent'] || 'unknown',
                ipAddress: req.ip || '127.0.0.1',
                lastActivity: new Date()
            }
        });
        // Sign the JWT token with both sessionId and userId
        const token = jsonwebtoken_1.default.sign({ sessionId: sessionId, userId: user.id }, process.env.JWT_SECRET, { expiresIn: sessionTimeoutSeconds });
        // ****************** MODIFIED SECTION END ******************
        res.status(201).json({
            message: 'Registration successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
};
exports.register = register;
// --------------------------
// Authentication Middleware
// --------------------------
const authenticate = async (req, res, next) => {
    var _a;
    const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const session = await db_1.default.session.findFirst({
            where: {
                id: decoded.sessionId,
                userId: decoded.userId,
                expiresAt: {
                    gt: new Date()
                }
            },
            include: { user: true }
        });
        if (!session) {
            return res.status(401).json({ error: 'Session expired or invalid' });
        }
        // Check for admin role for admin routes
        if (req.path.startsWith('/api/admin') && session.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        req.user = session.user;
        req.session = session;
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Invalid authentication token' });
    }
};
exports.authenticate = authenticate;
const validateSession = async (req, res, next) => {
    if (req.session && new Date(req.session.expiresAt) < new Date()) {
        await db_1.default.session.delete({ where: { id: req.session.id } });
        return res.status(401).json({ error: 'Session expired' });
    }
    next();
};
exports.validateSession = validateSession;
const authorizeRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
};
exports.authorizeRole = authorizeRole;
// --------------------------
// Login Endpoint
// --------------------------
const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await db_1.default.user.findUnique({ where: { email } });
        if (!user || !(await isValidPassword(password, user.passwordHash))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // ****************** MODIFIED SECTION START ******************
        // Generate a valid sessionId.
        const sessionId = (0, sessionUtils_1.generateSessionId)();
        if (!sessionId) {
            throw new Error('Session ID generation failed');
        }
        const sessionTimeoutSeconds = parseInt(process.env.SESSION_TIMEOUT || '3600');
        const expiresAt = new Date(Date.now() + sessionTimeoutSeconds * 1000);
        // Create a session for the user
        const session = await db_1.default.session.create({
            data: {
                id: sessionId,
                userId: user.id,
                expiresAt,
                userAgent: req.headers['user-agent'] || 'unknown',
                ipAddress: req.ip || '127.0.0.1',
                lastActivity: new Date()
            }
        });
        // Sign the token with both sessionId and userId
        const token = jsonwebtoken_1.default.sign({ sessionId: sessionId, userId: user.id }, process.env.JWT_SECRET, { expiresIn: sessionTimeoutSeconds });
        // ****************** MODIFIED SECTION END ******************
        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
};
exports.login = login;
