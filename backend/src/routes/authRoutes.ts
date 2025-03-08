import express from 'express';
import { register, login, logout } from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';
import { loginRateLimiter } from '../middleware/securityMiddleware';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const router = express.Router();
const prisma = new PrismaClient();

// Public routes
router.post('/register', async (req, res) => {
  try {
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
    const passwordHash = await bcrypt.hash(password, saltRounds);

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

    console.log('New user registered:', newUser);
    res.status(201).json(newUser);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

router.post('/login', loginRateLimiter, login);

// Protected routes
router.post('/logout', authenticate, logout);

export default router; 