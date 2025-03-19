"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.authorizeRole = exports.validateSession = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = __importDefault(require("../config/db"));
const sessionUtils_1 = require("../utils/sessionUtils");
// Add this function or import it from a utility file
const isValidPassword = async (password, hash) => {
    return await bcryptjs_1.default.compare(password, hash);
};
const authenticate = async (req, res, next) => {
    var _a;
    const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
    if (!token) {
        console.log('No token provided');
        return res.status(401).json({ error: 'Authentication required' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        console.log('Decoded token:', decoded);
        const session = await db_1.default.session.findUnique({
            where: { id: decoded.sessionId },
            include: { user: true }
        });
        if (!session) {
            console.log('Session not found for sessionId:', decoded.sessionId);
            return res.status(401).json({ error: 'Session expired or invalid' });
        }
        if (new Date(session.expiresAt) < new Date()) {
            console.log('Session expired for sessionId:', decoded.sessionId);
            return res.status(401).json({ error: 'Session expired or invalid' });
        }
        // Update last activity
        await db_1.default.session.update({
            where: { id: session.id },
            data: { lastActivity: new Date() }
        });
        req.user = session.user;
        req.session = session;
        next();
    }
    catch (error) {
        console.error('Error verifying token:', error);
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
const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await db_1.default.user.findUnique({ where: { email } });
        if (!user || !(await isValidPassword(password, user.passwordHash))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const sessionId = (0, sessionUtils_1.generateSessionId)();
        const sessionTimeoutSeconds = parseInt(process.env.SESSION_TIMEOUT || '3600');
        const expiresAt = new Date(Date.now() + sessionTimeoutSeconds * 1000);
        // Create session with all required fields
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
        const token = jsonwebtoken_1.default.sign({ sessionId }, process.env.JWT_SECRET, {
            expiresIn: sessionTimeoutSeconds
        });
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
