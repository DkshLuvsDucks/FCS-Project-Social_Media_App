import express from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import messageRoutes from './messageRoutes';
import groupChatRoutes from './groupChatRoutes';
import groupMessageRoutes from './groupMessageRoutes';
import postRoutes from './postRoutes';
import adminRoutes from './adminRoutes';

const router = express.Router();

// Register all routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/messages', messageRoutes);
router.use('/group-chats', groupChatRoutes);
router.use('/group-messages', groupMessageRoutes);
router.use('/posts', postRoutes);
router.use('/admin', adminRoutes);

export default router; 