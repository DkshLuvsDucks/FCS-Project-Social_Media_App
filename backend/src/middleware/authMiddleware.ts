import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';

// Extend Express Request type to include user and session
declare global {
  namespace Express {
    interface Request {
      user?: any;
      session?: any;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sessionId: string };
    const session = await prisma.session.findUnique({
      where: { id: decoded.sessionId },
      include: { user: true }
    });

    if (!session || new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    // Update last activity
    await prisma.session.update({
      where: { id: session.id },
      data: { lastActivity: new Date() }
    });

    req.user = session.user;
    req.session = session;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
};

export const validateSession = async (req: Request, res: Response, next: NextFunction) => {
  if (req.session && new Date(req.session.expiresAt) < new Date()) {
    await prisma.session.delete({ where: { id: req.session.id } });
    return res.status(401).json({ error: 'Session expired' });
  }
  next();
};

export const authorizeRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}; 