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
        lockedUntil: true,
        isBanned: true,
        bannedAt: true,
        isSeller: true,
        sellerVerificationDoc: true,
        sellerStatus: true
      } as any,
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

// Lock user account
router.put('/users/:userId/lock', async (req, res) => {
  const { userId } = req.params;
  const lockDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  try {
    console.log(`Locking user ${userId}...`);
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        lockedUntil: new Date(Date.now() + lockDuration),
        failedLoginAttempts: 5, // Max attempts
        isBanned: false, // Ensure user is not banned when locked
        bannedAt: null
      },
      select: {
        id: true,
        email: true,
        username: true,
        lockedUntil: true,
        failedLoginAttempts: true,
        isBanned: true
      }
    });
    console.log('User locked:', updatedUser);
    res.json(updatedUser);
  } catch (error) {
    console.error('Error locking user:', error);
    res.status(500).json({ error: 'Failed to lock user' });
  }
});

// Unlock user account
router.put('/users/:userId/unlock', async (req, res) => {
  const { userId } = req.params;
  
  try {
    console.log(`Unlocking user ${userId}...`);
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        lockedUntil: null,
        failedLoginAttempts: 0
      },
      select: {
        id: true,
        email: true,
        username: true,
        lockedUntil: true,
        failedLoginAttempts: true
      }
    });
    console.log('User unlocked:', updatedUser);
    res.json(updatedUser);
  } catch (error) {
    console.error('Error unlocking user:', error);
    res.status(500).json({ error: 'Failed to unlock user' });
  }
});

// Ban user account
router.put('/users/:userId/ban', async (req, res) => {
  const { userId } = req.params;
  
  try {
    console.log(`Banning user ${userId}...`);
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        isBanned: true,
        bannedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null // Reset lock when banning
      },
      select: {
        id: true,
        email: true,
        username: true,
        isBanned: true,
        bannedAt: true,
        lockedUntil: true
      }
    });
    console.log('User banned:', updatedUser);
    res.json(updatedUser);
  } catch (error) {
    console.error('Error banning user:', error);
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

// Unban user account
router.put('/users/:userId/unban', async (req, res) => {
  const { userId } = req.params;
  
  try {
    console.log(`Unbanning user ${userId}...`);
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        isBanned: false,
        bannedAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null
      },
      select: {
        id: true,
        email: true,
        username: true,
        isBanned: true,
        bannedAt: true,
        lockedUntil: true
      }
    });
    console.log('User unbanned:', updatedUser);
    res.json(updatedUser);
  } catch (error) {
    console.error('Error unbanning user:', error);
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

// Delete user and all related data in the correct order
router.delete('/users/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    console.log(`Deleting user ${userId}...`);
    
    // Delete all messages sent by or received by this user
    await prisma.$transaction(async (tx) => {
      await tx.message.deleteMany({
        where: {
          OR: [
            { senderId: parseInt(userId) },
            { receiverId: parseInt(userId) }
          ]
        }
      });

      // Delete chatrooms involving this user
      await tx.chatRoom.deleteMany({
        where: {
          OR: [
            { user1Id: parseInt(userId) },
            { user2Id: parseInt(userId) }
          ]
        }
      });

      // Delete all follows relationships involving this user
      await tx.follows.deleteMany({
        where: {
          OR: [
            { followerId: parseInt(userId) },
            { followingId: parseInt(userId) }
          ]
        }
      });

      // Delete all posts by this user
      await tx.post.deleteMany({
        where: { authorId: parseInt(userId) }
      });

      // Delete all sessions for this user
      await tx.session.deleteMany({
        where: { userId: parseInt(userId) }
      });

      // Delete all login records for this user
      await tx.login.deleteMany({
        where: { userId: parseInt(userId) }
      });

      // Finally delete the user
      await tx.user.delete({
        where: { id: parseInt(userId) }
      });
    });

    console.log(`User ${userId} deleted successfully`);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
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

// Approve seller verification
router.put('/users/:userId/approve-seller', async (req, res) => {
  const { userId } = req.params;
  
  try {
    console.log(`Approving seller verification for user ${userId}...`);
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        sellerStatus: 'APPROVED'
      } as any,
      select: {
        id: true,
        email: true,
        username: true,
        isSeller: true,
        sellerStatus: true,
        sellerVerificationDoc: true
      } as any
    });
    console.log('Seller verification approved:', updatedUser);
    res.json(updatedUser);
  } catch (error) {
    console.error('Error approving seller verification:', error);
    res.status(500).json({ error: 'Failed to approve seller verification' });
  }
});

// Reject seller verification
router.put('/users/:userId/reject-seller', async (req, res) => {
  const { userId } = req.params;
  
  try {
    console.log(`Rejecting seller verification for user ${userId}...`);
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        sellerStatus: 'REJECTED'
      } as any,
      select: {
        id: true,
        email: true,
        username: true,
        isSeller: true,
        sellerStatus: true,
        sellerVerificationDoc: true
      } as any
    });
    console.log('Seller verification rejected:', updatedUser);
    res.json(updatedUser);
  } catch (error) {
    console.error('Error rejecting seller verification:', error);
    res.status(500).json({ error: 'Failed to reject seller verification' });
  }
});

// Get pending seller verification requests
router.get('/seller-verifications', async (req, res) => {
  try {
    console.log('Fetching pending seller verification requests...');
    const pendingVerifications = await prisma.user.findMany({
      where: {
        isSeller: true,
        sellerStatus: 'PENDING'
      } as any,
      select: {
        id: true,
        email: true,
        username: true,
        userImage: true,
        isSeller: true,
        sellerStatus: true,
        sellerVerificationDoc: true,
        createdAt: true
      } as any,
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`Found ${pendingVerifications.length} pending verification requests`);
    res.json(pendingVerifications);
  } catch (error) {
    console.error('Error fetching seller verification requests:', error);
    res.status(500).json({ error: 'Failed to fetch seller verification requests' });
  }
});

export default router; 