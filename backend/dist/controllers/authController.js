"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verify = exports.logout = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const db_1 = __importDefault(require("../config/db"));
const auditLogger_1 = require("../utils/auditLogger");
// Generate a unique session ID
const generateSessionId = () => {
    return crypto_1.default.randomBytes(64).toString('hex');
};
// Generate device fingerprint from request
const generateDeviceFingerprint = (req) => {
    const data = [
        req.ip,
        req.headers['user-agent'] || '',
        req.headers['accept-language'] || ''
    ].join('|');
    return crypto_1.default.createHash('sha256').update(data).digest('hex');
};
const register = async (req, res) => {
    try {
        const { email, password, username, mobile } = req.body;
        // Validate input
        if (!email || !password || !username) {
            return res.status(400).json({ error: 'Email, password, and username are required' });
        }
        // Check if user already exists
        const existingUser = await db_1.default.user.findFirst({
            where: {
                OR: [
                    { email },
                    { username },
                    ...(mobile ? [{ mobile }] : [])
                ]
            }
        });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        // Hash password
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        // Create user
        const user = await db_1.default.user.create({
            data: {
                email,
                username,
                mobile,
                passwordHash,
            }
        });
        // Create session
        const sessionId = generateSessionId();
        const sessionTimeoutSeconds = parseInt(process.env.SESSION_TIMEOUT || '3600');
        const expiresAt = new Date(Date.now() + sessionTimeoutSeconds * 1000);
        await db_1.default.session.create({
            data: {
                id: sessionId,
                userId: user.id,
                expiresAt,
                ipAddress: req.ip || '',
                userAgent: req.headers['user-agent'] || ''
            }
        });
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({
            sessionId,
            userId: user.id,
            role: user.role
        }, process.env.JWT_SECRET || 'fallback_secret', {
            expiresIn: sessionTimeoutSeconds
        });
        // Log successful registration
        await (0, auditLogger_1.logLogin)(user.id, sessionId, req.ip || '', req.headers['user-agent'] || '', generateDeviceFingerprint(req), undefined, true);
        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username
            }
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt for email:', email);
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        // Find user
        const user = await db_1.default.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                username: true,
                passwordHash: true,
                role: true,
                failedLoginAttempts: true,
                lockedUntil: true,
                isBanned: true,
                bannedAt: true
            }
        });
        if (!user) {
            console.log('User not found:', email);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Check if account is banned
        if (user.isBanned) {
            console.log('Banned account attempted login:', email);
            return res.status(403).json({
                error: 'This account has been banned. Please contact support for assistance.'
            });
        }
        // Check if account is locked
        if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
            console.log('Account locked:', email);
            return res.status(403).json({
                error: 'Account is temporarily locked due to too many failed login attempts',
                lockedUntil: user.lockedUntil
            });
        }
        // Verify password
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.passwordHash);
        console.log('Password validation result:', isPasswordValid);
        if (!isPasswordValid) {
            // Log failed attempt and potentially lock account
            await (0, auditLogger_1.logFailedLoginAttempt)(user.id);
            // Log the failed login
            await (0, auditLogger_1.logLogin)(user.id, 'failed-login', req.ip || '', req.headers['user-agent'] || '', generateDeviceFingerprint(req), undefined, false);
            console.log('Invalid password for user:', email);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Reset failed login attempts
        if (user.failedLoginAttempts > 0) {
            await db_1.default.user.update({
                where: { id: user.id },
                data: {
                    failedLoginAttempts: 0,
                    lockedUntil: null
                }
            });
        }
        // Create session
        const sessionId = generateSessionId();
        const sessionTimeoutSeconds = parseInt(process.env.SESSION_TIMEOUT || '3600');
        const expiresAt = new Date(Date.now() + sessionTimeoutSeconds * 1000);
        await db_1.default.session.create({
            data: {
                id: sessionId,
                userId: user.id,
                expiresAt,
                ipAddress: req.ip || '',
                userAgent: req.headers['user-agent'] || ''
            }
        });
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({
            sessionId,
            userId: user.id,
            role: user.role
        }, process.env.JWT_SECRET || 'fallback_secret', {
            expiresIn: sessionTimeoutSeconds
        });
        // Log successful login
        await (0, auditLogger_1.logLogin)(user.id, sessionId, req.ip || '', req.headers['user-agent'] || '', generateDeviceFingerprint(req), undefined, true);
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
const logout = async (req, res) => {
    try {
        if (!req.session) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        // Delete the session
        await db_1.default.session.delete({
            where: { id: req.session.id }
        });
        res.status(200).json({ message: 'Logged out successfully' });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Server error during logout' });
    }
};
exports.logout = logout;
const verify = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        // Return user data including role
        res.json({
            user: {
                id: req.user.id,
                email: req.user.email,
                username: req.user.username,
                role: req.user.role
            }
        });
    }
    catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({ error: 'Server error during verification' });
    }
};
exports.verify = verify;
