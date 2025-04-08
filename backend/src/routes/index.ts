import express from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import messageRoutes from './messageRoutes';
import groupChatRoutes from './groupChatRoutes';
import groupMessageRoutes from './groupMessageRoutes';
import postRoutes from './postRoutes';
import adminRoutes from './adminRoutes';
import marketplaceRoutes from './marketplaceRoutes';
import verificationRoutes from './verificationRoutes';

const router = express.Router();

// Register all routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/messages', messageRoutes);
router.use('/group-chats', groupChatRoutes);
router.use('/group-messages', groupMessageRoutes);
router.use('/posts', postRoutes);
router.use('/admin', adminRoutes);
router.use('/marketplace', marketplaceRoutes);
router.use('/verification', verificationRoutes);

export default router; 