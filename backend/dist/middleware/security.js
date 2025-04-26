"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityHeaders = exports.sqlInjectionFilter = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
// Initialize Prisma Client for query logging
const prisma = new client_1.PrismaClient({
    log: [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' }
    ]
});
// Log Prisma warnings and errors
prisma.$on('warn', (e) => {
    logger_1.logger.warn(`Prisma Warning: ${e.message}`);
});
prisma.$on('error', (e) => {
    logger_1.logger.error(`Prisma Error: ${e.message}`);
});
/**
 * Middleware to detect and block SQL injection attempts
 * Checks both query parameters and request body
 */
const sqlInjectionFilter = (req, res, next) => {
    // Skip SQL injection check for media messages in direct and group chats
    if ((req.path.includes('/messages/direct/') || req.path.includes('/group-messages/')) &&
        req.method === 'POST' &&
        req.body &&
        typeof req.body.content === 'string' &&
        (req.body.content.includes('📷') || req.body.content.includes('📹'))) {
        return next();
    }
    const payload = Object.assign(Object.assign({}, req.body), req.query);
    const SQL_INJECTION_PATTERN = /["'!=;\\-]/;
    const hasInvalidChars = Object.values(payload).some((val) => typeof val === 'string' && SQL_INJECTION_PATTERN.test(val));
    if (hasInvalidChars) {
        // Log the potential SQL injection attempt
        logger_1.logger.warn(`Possible SQL injection attempt detected: ${JSON.stringify({
            ip: req.ip,
            path: req.path,
            method: req.method,
            body: req.body,
            query: req.query,
            userAgent: req.headers['user-agent']
        })}`);
        return res.status(403).json({ error: 'Invalid characters detected' });
    }
    next();
};
exports.sqlInjectionFilter = sqlInjectionFilter;
/**
 * Middleware to add security headers to responses
 */
const securityHeaders = (req, res, next) => {
    // Set security headers
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
};
exports.securityHeaders = securityHeaders;
