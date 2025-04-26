"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.verifyToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../config/db"));
const logger_1 = require("../utils/logger");
/**
 * Middleware to verify JWT token and check session validity
 */
const verifyToken = async (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }
        const token = authHeader.split(' ')[1];
        // Verify JWT token
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        if (!decoded || !decoded.sessionId || !decoded.userId) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        // Verify session still exists and is valid
        const session = await db_1.default.session.findUnique({
            where: {
                id: decoded.sessionId,
            },
        });
        if (!session) {
            return res.status(403).json({ error: 'Session expired or invalid' });
        }
        // Check if session is expired
        if (new Date(session.expiresAt) < new Date()) {
            // Delete expired session
            await db_1.default.session.delete({
                where: {
                    id: decoded.sessionId,
                },
            });
            return res.status(403).json({ error: 'Session expired' });
        }
        // Update session last activity
        await db_1.default.session.update({
            where: {
                id: decoded.sessionId,
            },
            data: {
                lastActivity: new Date(),
            },
        });
        // Set req.user with user info from token
        req.user = {
            id: decoded.userId,
            userId: decoded.userId,
            sessionId: decoded.sessionId,
            role: decoded.role
        };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            logger_1.securityLogger.warn(`JWT verification failed: ${error.message}`);
            return res.status(403).json({ error: 'Invalid token' });
        }
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return res.status(403).json({ error: 'Token expired' });
        }
        logger_1.securityLogger.error(`Error in auth middleware: ${error}`);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.verifyToken = verifyToken;
/**
 * Middleware to verify user has required role
 * @param roles - Array of allowed roles
 */
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized - Authentication required' });
        }
        if (!roles.includes(req.user.role)) {
            logger_1.securityLogger.warn(`Unauthorized role access attempt: User ${req.user.userId} with role ${req.user.role} attempted to access resource requiring ${roles.join(', ')}`);
            return res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
        }
        next();
    };
};
exports.requireRole = requireRole;
