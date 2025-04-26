import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Initialize Prisma Client for query logging
const prisma = new PrismaClient({
  log: [
    { level: 'warn', emit: 'event' },
    { level: 'error', emit: 'event' }
  ]
});

// Log Prisma warnings and errors
prisma.$on('warn', (e) => {
  logger.warn(`Prisma Warning: ${e.message}`);
});

prisma.$on('error', (e) => {
  logger.error(`Prisma Error: ${e.message}`);
});

/**
 * Middleware to detect and block SQL injection attempts
 * Checks both query parameters and request body
 */
export const sqlInjectionFilter = (req: Request, res: Response, next: NextFunction) => {
  // Skip SQL injection check for media messages in direct and group chats
  if (
    (req.path.includes('/messages/direct/') || req.path.includes('/group-messages/')) && 
    req.method === 'POST' && 
    req.body && 
    typeof req.body.content === 'string' && 
    (req.body.content.includes('📷') || req.body.content.includes('📹'))
  ) {
    return next();
  }

  const payload = { ...req.body, ...req.query };
  const SQL_INJECTION_PATTERN = /["'!=;\\-]/;
  
  const hasInvalidChars = Object.values(payload).some(
    (val: any) => typeof val === 'string' && SQL_INJECTION_PATTERN.test(val)
  );

  if (hasInvalidChars) {
    // Log the potential SQL injection attempt
    logger.warn(`Possible SQL injection attempt detected: ${JSON.stringify({
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

/**
 * Middleware to add security headers to responses
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Set security headers
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  next();
}; 