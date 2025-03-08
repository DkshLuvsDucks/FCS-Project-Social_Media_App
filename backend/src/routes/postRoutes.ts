import express from 'express';
import { createPost, getPosts, getPostById } from '../controllers/postController';
import { authenticate } from '../middleware/authMiddleware';
import { apiRateLimiter } from '../middleware/securityMiddleware';

const router = express.Router();

// Apply rate limiting to all post routes
router.use(apiRateLimiter);

// Public routes
router.get('/', getPosts);
router.get('/:id', getPostById);

// Protected routes
router.post('/', authenticate, createPost);

export default router; 