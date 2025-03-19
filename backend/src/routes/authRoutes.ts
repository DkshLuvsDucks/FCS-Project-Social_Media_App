import express from 'express';
import { register, login, logout, verify } from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';
import { loginRateLimiter } from '../middleware/securityMiddleware';
import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { generateSessionId } from '../utils/sessionUtils';

const router = express.Router();
const prisma = new PrismaClient();

// Token verification endpoint
router.get('/verify', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

// Public routes
router.post('/register/check', async (req, res) => {
  try {
    const { username, email } = req.body;

    // Check if username exists
    if (username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username }
      });
      if (existingUsername) {
        return res.status(400).json({ field: 'username', error: 'Username is already taken' });
      }
    }

    // Check if email exists
    if (email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email }
      });
      if (existingEmail) {
        return res.status(400).json({ field: 'email', error: 'Email is already registered' });
      }
    }

    // No conflicts found
    res.json({ message: 'Username and email are available' });
  } catch (error) {
    console.error('Registration check error:', error);
    res.status(500).json({ error: 'Failed to check registration details' });
  }
});

router.post('/register', async (req, res) => {
  try {
    console.log('Registration request received:', req.body);
    const { username, email, password, mobile } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username },
          ...(mobile ? [{ mobile }] : []),
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      if (existingUser.username === username) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      if (mobile && existingUser.mobile === mobile) {
        return res.status(400).json({ error: 'Mobile number already registered' });
      }
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcryptjs.hash(password, saltRounds);

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        mobile,
        passwordHash,
        role: 'USER',
      },
      select: {
        id: true,
        username: true,
        email: true,
        mobile: true,
        role: true,
        createdAt: true,
      },
    });

    // Generate session ID
    const sessionId = generateSessionId();

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    // Create session
    await prisma.session.create({
      data: {
        id: sessionId,
        userId: newUser.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        userAgent: req.headers['user-agent'] || 'unknown',
        ipAddress: req.ip || '127.0.0.1',
      }
    });

    // Set cookie with the token
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    console.log('New user registered:', newUser);
    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', loginRateLimiter, login);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/verify', authenticate, verify);

export default router; 