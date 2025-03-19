"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const authMiddleware = async (req, res, next) => {
    try {
        // Check for token in Authorization header
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        // Also check for token in cookies as fallback
        const cookieToken = req.cookies.token;
        if (!token && !cookieToken) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const finalToken = token || cookieToken;
        // Verify token
        const decoded = jsonwebtoken_1.default.verify(finalToken, process.env.JWT_SECRET);
        if (typeof decoded !== 'string' && 'userId' in decoded) {
            // Add user to request
            req.user = decoded;
            // Check if session exists and is valid
            const session = await prisma.session.findFirst({
                where: {
                    userId: decoded.userId,
                    expiresAt: {
                        gt: new Date()
                    }
                }
            });
            if (!session) {
                return res.status(401).json({ error: 'Invalid or expired session' });
            }
            next();
        }
        else {
            res.status(401).json({ error: 'Invalid token' });
        }
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
};
exports.authMiddleware = authMiddleware;
