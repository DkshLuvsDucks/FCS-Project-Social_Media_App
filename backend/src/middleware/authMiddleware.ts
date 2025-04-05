import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import prisma from '../config/db';
import { generateSessionId } from '../utils/sessionUtils'; // Make sure this returns a valid string, e.g. using uuidv4

// JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_for_development';

// Extend Express Request type to include user and session
declare global {
  namespace Express {
    interface Request {
      user?: any;
      session?: any;
    }
  }
}

// Define the structure for authenticated requests
export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
}

// Utility function for password validation
const isValidPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcryptjs.compare(password, hash);
};

// --------------------------
// Registration Endpoint
// --------------------------
export const register = async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  try {
    // Hash the password before storing
    const passwordHash = await bcryptjs.hash(password, 10);

    // Create the new user
    const user = await prisma.user.create({
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
    const sessionId = generateSessionId();
    if (!sessionId) {
      throw new Error('Session ID generation failed');
    }

    const sessionTimeoutSeconds = parseInt(process.env.SESSION_TIMEOUT || '3600');
    const expiresAt = new Date(Date.now() + sessionTimeoutSeconds * 1000);

    // Create a session for the new user
    const session = await prisma.session.create({
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
    const token = jwt.sign(
      { sessionId: sessionId, userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: sessionTimeoutSeconds }
    );
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
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

// --------------------------
// Authentication Middleware
// --------------------------
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { 
      userId: number;
      sessionId: string;
      role: string;
    };

    const session = await prisma.session.findFirst({
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

// --------------------------
// Login Endpoint
// --------------------------
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await isValidPassword(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // ****************** MODIFIED SECTION START ******************
    // Generate a valid sessionId.
    const sessionId = generateSessionId();
    if (!sessionId) {
      throw new Error('Session ID generation failed');
    }

    const sessionTimeoutSeconds = parseInt(process.env.SESSION_TIMEOUT || '3600');
    const expiresAt = new Date(Date.now() + sessionTimeoutSeconds * 1000);

    // Create a session for the user
    const session = await prisma.session.create({
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
    const token = jwt.sign(
      { sessionId: sessionId, userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: sessionTimeoutSeconds }
    );
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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};
