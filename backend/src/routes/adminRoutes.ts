import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorizeRole } from '../middleware/authMiddleware';

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication and admin role check to all routes
router.use(authenticate);
router.use(authorizeRole(['ADMIN']));

// Get all users with their verification status
router.get('/users', async (req, res) => {
  try {
    console.log('Fetching all users...');
    
    // First, let's count total users
    const totalUsers = await prisma.user.count();
    console.log(`Total users in database: ${totalUsers}`);
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        mobile: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true,
        userImage: true,
        failedLoginAttempts: true,
        lockedUntil: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Fetched ${users.length} users`);
    console.log('Users:', users.map(u => ({ id: u.id, email: u.email, role: u.role })));

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Verify user (enable 2FA)
router.put('/users/:userId/verify', async (req, res) => {
  const { userId } = req.params;
  
  try {
    console.log(`Verifying user ${userId}...`);
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        twoFactorEnabled: true,
        role: 'USER' // Set to verified user role
      }
    });
    console.log('User verified:', updatedUser);
    res.json(updatedUser);
  } catch (error) {
    console.error('Error verifying user:', error);
    res.status(500).json({ error: 'Failed to verify user' });
  }
});

// Reject/Lock user account
router.put('/users/:userId/reject', async (req, res) => {
  const { userId } = req.params;
  const lockDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  try {
    console.log(`Rejecting user ${userId}...`);
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        lockedUntil: new Date(Date.now() + lockDuration),
        failedLoginAttempts: 5 // Max attempts
      }
    });
    console.log('User rejected:', updatedUser);
    res.json(updatedUser);
  } catch (error) {
    console.error('Error rejecting user:', error);
    res.status(500).json({ error: 'Failed to reject user' });
  }
});

// Search users by username or email
router.get('/users/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    if (query.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters long' });
    }

    console.log('Searching users with query:', query);
    
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query } },
          { email: { contains: query } }
        ]
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        userImage: true
      },
      take: 10 // Limit results to 10 users
    });

    console.log(`Found ${users.length} users matching query`);
    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

export default router; 