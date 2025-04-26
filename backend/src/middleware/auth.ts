import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { securityLogger } from '../utils/logger';

// Extended Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        userId: number;
        sessionId: string;
        username?: string;
        email?: string;
        role: string;
      };
    }
  }
}

/**
 * Middleware to verify JWT token and check session validity
 */
export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
    
    if (!decoded || !decoded.sessionId || !decoded.userId) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    
    // Verify session still exists and is valid
    const session = await prisma.session.findUnique({
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
      await prisma.session.delete({
        where: {
          id: decoded.sessionId,
        },
      });
      return res.status(403).json({ error: 'Session expired' });
    }
    
    // Update session last activity
    await prisma.session.update({
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
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      securityLogger.warn(`JWT verification failed: ${error.message}`);
      return res.status(403).json({ error: 'Invalid token' });
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(403).json({ error: 'Token expired' });
    }
    
    securityLogger.error(`Error in auth middleware: ${error}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware to verify user has required role
 * @param roles - Array of allowed roles
 */
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized - Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      securityLogger.warn(`Unauthorized role access attempt: User ${req.user.userId} with role ${req.user.role} attempted to access resource requiring ${roles.join(', ')}`);
      return res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
    }
    
    next();
  };
}; 