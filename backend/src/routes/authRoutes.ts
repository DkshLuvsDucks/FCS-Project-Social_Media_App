import express from 'express';
import { register, login, logout } from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';
import { loginRateLimiter } from '../middleware/securityMiddleware';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', loginRateLimiter, login);

// Protected routes
router.post('/logout', authenticate, logout);

export default router; 