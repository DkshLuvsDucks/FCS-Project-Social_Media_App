import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/authMiddleware';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
// Import functions from userController
import { getSavedPosts, getUserFollows } from '../controllers/userController';
// Import auth functions from authController
import { register, login } from '../controllers/authController';

const prisma = new PrismaClient();
const router = express.Router();

// Configure image upload for profile pictures
const profileImagesDir = path.join(__dirname, '../../uploads/profiles');
if (!fs.existsSync(profileImagesDir)) {
  fs.mkdirSync(profileImagesDir, { recursive: true });
}

const profileStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, profileImagesDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const profileUpload = multer({
  storage: profileStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WEBP are allowed.'));
    }
  }
});

// Function to delete profile picture from storage
const deleteProfilePicture = async (fileUrl: string | null): Promise<void> => {
  if (!fileUrl) return;
  
  try {
    // Extract the file name from the URL
    const fileName = fileUrl.split('/').pop();
    if (!fileName) return;
    
    const filePath = path.join(__dirname, '../../uploads/profile-pictures', fileName);
    
    // Check if file exists before attempting to delete
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      console.log(`Deleted profile picture: ${filePath}`);
    }
  } catch (error) {
    console.error('Error deleting profile picture:', error);
  }
};

// Apply middleware
router.use(authenticate);

// Saved posts route
router.get('/saved-posts', getSavedPosts);

// Get follows data (following and followers)
router.get('/follows', getUserFollows);

// Upload profile picture
router.post('/upload', profileUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user.id;
    const imageUrl = `/uploads/profiles/${req.file.filename}`;

    // Update user profile with new image
    await prisma.user.update({
      where: { id: userId },
      data: { userImage: imageUrl }
    });

    res.json({ 
      success: true, 
      imageUrl 
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ error: 'Server error while uploading profile picture' });
  }
});

// Get user profile
router.get('/profile/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user?.id;

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        bio: true,
        userImage: true,
        createdAt: true,
        posts: {
          orderBy: { createdAt: 'desc' }
        },
        followers: true,
        following: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if the current user is following this profile
    let isFollowing = false;
    if (currentUserId) {
      const followRecord = await prisma.follows.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: user.id
          }
        }
      });
      isFollowing = !!followRecord;
    }

    const userProfile = {
      ...user,
      followersCount: user.followers.length,
      followingCount: user.following.length,
      isFollowing
    };

    res.json(userProfile);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Search users by username or email
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    console.log('Searching users with query:', query);
    
    const searchTerm = query.toLowerCase();
    
    // First, get all matching users
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { role: 'USER' },
          {
            OR: [
              { username: { contains: searchTerm } },
              { email: { contains: searchTerm } }
            ]
          }
        ]
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        userImage: true
      },
      take: 10
    });

    // Sort results by relevance:
    // 1. Username starts with search term
    // 2. Email starts with search term
    // 3. Username contains search term
    // 4. Email contains search term
    const sortedUsers = users.sort((a, b) => {
      const aUsername = a.username.toLowerCase();
      const bUsername = b.username.toLowerCase();
      const aEmail = a.email.toLowerCase();
      const bEmail = b.email.toLowerCase();

      // Check if usernames start with search term
      const aStartsWithUsername = aUsername.startsWith(searchTerm);
      const bStartsWithUsername = bUsername.startsWith(searchTerm);
      if (aStartsWithUsername && !bStartsWithUsername) return -1;
      if (!aStartsWithUsername && bStartsWithUsername) return 1;

      // If both or neither username starts with search term, check email
      const aStartsWithEmail = aEmail.startsWith(searchTerm);
      const bStartsWithEmail = bEmail.startsWith(searchTerm);
      if (aStartsWithEmail && !bStartsWithEmail) return -1;
      if (!aStartsWithEmail && bStartsWithEmail) return 1;

      // If still tied, sort alphabetically by username
      return aUsername.localeCompare(bUsername);
    });

    console.log(`Found ${sortedUsers.length} users matching query:`, sortedUsers);
    res.json(sortedUsers);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Get suggested users
router.get('/suggestions', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find users that the current user follows
    const following = await prisma.follows.findMany({
      where: {
        followerId: userId
      },
      select: {
        followingId: true
      }
    });

    const followingIds = following.map(f => f.followingId);
    
    if (followingIds.length === 0) {
      // If user doesn't follow anyone, return random users
      const randomUsers = await prisma.user.findMany({
        where: {
          id: { not: userId }, // Exclude current user
          role: 'USER'
        },
        select: {
          id: true,
          username: true,
          email: true,
          userImage: true,
          role: true
        },
        take: 5,
        orderBy: {
          createdAt: 'desc'
        }
      });
      return res.json(randomUsers);
    }
    
    // Find users that the current user's followings follow, but the current user doesn't follow
    const suggestedUsers = await prisma.follows.findMany({
      where: {
        followerId: { in: followingIds },
        followingId: { 
          not: userId, // Exclude current user
          notIn: followingIds
        }
      },
      select: {
        following: {
          select: {
            id: true,
            username: true,
            email: true,
            userImage: true,
            role: true
          }
        }
      },
      distinct: ['followingId']
    });
    
    // Extract and filter users with USER role
    const users = suggestedUsers
      .map(su => su.following)
      .filter(user => user.role === 'USER' && user.id !== userId); // Additional check to filter out current user
    
    // If not enough suggestions, add some random users not followed
    if (users.length < 5) {
      const randomUsers = await prisma.user.findMany({
        where: {
          id: { 
            not: userId, // Exclude current user
            notIn: [...followingIds, ...users.map(u => u.id)]
          },
          role: 'USER'
        },
        select: {
          id: true,
          username: true,
          email: true,
          userImage: true,
          role: true
        },
        take: 5 - users.length
      });
      
      users.push(...randomUsers);
    }
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching suggested users:', error);
    res.status(500).json({ error: 'Failed to fetch suggested users' });
  }
});

// Get user follows data
router.get('/follow/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;
    
    // Check if the user is following the target user
    const followRecord = await prisma.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: parseInt(userId)
        }
      }
    });
    
    res.json({
      isFollowing: !!followRecord
    });
  } catch (error) {
    console.error('Error getting follow data:', error);
    res.status(500).json({ error: 'Failed to get follow data' });
  }
});

// Follow a user
router.post('/follow/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.user.id;
    
    // Check if already following
    const existingFollow = await prisma.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: parseInt(userId)
        }
      }
    });
    
    if (existingFollow) {
      return res.status(400).json({ error: 'Already following this user' });
    }
    
    // Create follow relationship
    await prisma.follows.create({
      data: {
        followerId,
        followingId: parseInt(userId)
      }
    });
    
    res.status(200).json({ message: 'Successfully followed user' });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// Unfollow a user
router.delete('/follow/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.user.id;
    
    // Delete follow relationship
    await prisma.follows.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId: parseInt(userId)
        }
      }
    });
    
    res.status(200).json({ message: 'Successfully unfollowed user' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

// Get user profile followers
router.get('/profile/:username/followers', async (req, res) => {
  try {
    const { username } = req.params;
    
    // Find the user first
    const user = await prisma.user.findUnique({
      where: { username }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get followers for this user
    const followers = await prisma.follows.findMany({
      where: {
        followingId: user.id
      },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            userImage: true,
            role: true
          }
        }
      }
    });
    
    const followersList = followers.map(follow => follow.follower);
    
    res.json(followersList);
  } catch (error) {
    console.error('Error fetching followers:', error);
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

// Get user profile following
router.get('/profile/:username/following', async (req, res) => {
  try {
    const { username } = req.params;
    
    // Find the user first
    const user = await prisma.user.findUnique({
      where: { username }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get users that this user follows
    const following = await prisma.follows.findMany({
      where: {
        followerId: user.id
      },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            userImage: true,
            role: true
          }
        }
      }
    });
    
    const followingList = following.map(follow => follow.following);
    
    res.json(followingList);
  } catch (error) {
    console.error('Error fetching following:', error);
    res.status(500).json({ error: 'Failed to fetch following' });
  }
});

// Get user by username
router.get('/username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        userImage: true,
        bio: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error finding user by username:', error);
    res.status(500).json({ error: 'Failed to find user' });
  }
});

export default router; 