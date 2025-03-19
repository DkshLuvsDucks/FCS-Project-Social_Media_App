import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
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
    const decoded = jwt.verify(finalToken, process.env.JWT_SECRET!) as JwtPayload;
    
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
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
}; 