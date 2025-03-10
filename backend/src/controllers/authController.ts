import { Request, Response } from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../config/db';
import { logLogin, logFailedLoginAttempt } from '../utils/auditLogger';

// Generate a unique session ID
const generateSessionId = () => {
  return crypto.randomBytes(64).toString('hex');
};

// Generate device fingerprint from request
const generateDeviceFingerprint = (req: Request) => {
  const data = [
    req.ip,
    req.headers['user-agent'] || '',
    req.headers['accept-language'] || ''
  ].join('|');
  
  return crypto.createHash('sha256').update(data).digest('hex');
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, username, mobile } = req.body;

    // Validate input
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, password, and username are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
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
    const passwordHash = await bcryptjs.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
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
    
    await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        expiresAt,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || ''
      }
    });

    // Generate JWT
    const token = jwt.sign({ sessionId }, process.env.JWT_SECRET || 'fallback_secret', {
      expiresIn: sessionTimeoutSeconds
    });

    // Log successful registration
    await logLogin(
      user.id,
      sessionId,
      req.ip || '',
      req.headers['user-agent'] || '',
      generateDeviceFingerprint(req),
      undefined,
      true
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for email:', email);

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
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
    const isPasswordValid = await bcryptjs.compare(password, user.passwordHash);
    console.log('Password validation result:', isPasswordValid);

    if (!isPasswordValid) {
      // Log failed attempt and potentially lock account
      await logFailedLoginAttempt(user.id);
      
      // Log the failed login
      await logLogin(
        user.id,
        'failed-login',
        req.ip || '',
        req.headers['user-agent'] || '',
        generateDeviceFingerprint(req),
        undefined,
        false
      );
      
      console.log('Invalid password for user:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset failed login attempts
    if (user.failedLoginAttempts > 0) {
      await prisma.user.update({
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
    
    await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        expiresAt,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || ''
      }
    });

    // Generate JWT
    const token = jwt.sign({ sessionId }, process.env.JWT_SECRET || 'fallback_secret', {
      expiresIn: sessionTimeoutSeconds
    });

    // Log successful login
    await logLogin(
      user.id,
      sessionId,
      req.ip || '',
      req.headers['user-agent'] || '',
      generateDeviceFingerprint(req),
      undefined,
      true
    );

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

export const logout = async (req: Request, res: Response) => {
  try {
    if (!req.session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Delete the session
    await prisma.session.delete({
      where: { id: req.session.id }
    });

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error during logout' });
  }
};

export const verify = async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Server error during verification' });
  }
}; 