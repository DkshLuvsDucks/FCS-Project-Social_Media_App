import express from 'express';
import { PrismaClient, Follows, User } from '@prisma/client';
import { authenticate } from '../middleware/authMiddleware';
import bcryptjs from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

const router = express.Router();
const prisma = new PrismaClient();

interface FollowWithUser extends Follows {
  follower: {
    id: number;
    username: string;
    userImage: string | null;
  };
  following: {
    id: number;
    username: string;
    userImage: string | null;
  };
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const uploadDir = path.join(__dirname, '../../uploads/profile-pictures');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'));
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

// Apply authentication to all routes
router.use(authenticate);

// Upload profile picture
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/profile-pictures/${req.file.filename}`;
    res.json({ url: fileUrl });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
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

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const { username, bio, userImage, currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Validate current password if trying to change password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change password' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true, userImage: true }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const passwordMatch = await bcryptjs.compare(currentPassword, user.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const newPasswordHash = await bcryptjs.hash(newPassword, 10);
      
      // If changing profile picture and there was an old one, delete it
      if (userImage && userImage !== user.userImage) {
        await deleteProfilePicture(user.userImage);
      }
      
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: newPasswordHash,
          lastPasswordReset: new Date()
        }
      });
    }

    // Update other profile information if provided
    const updateData: any = {};
    if (username) updateData.username = username;
    if (bio !== undefined) updateData.bio = bio;
    if (userImage !== undefined) {
      // If removing profile picture
      if (userImage === null) {
        // Get current user image
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { userImage: true }
        });
        
        // Delete the file if it exists
        if (user?.userImage) {
          await deleteProfilePicture(user.userImage);
        }
        
        updateData.userImage = null;
      } else {
        // If updating profile picture with a new one
        // Get current user image
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { userImage: true }
        });
        
        // Delete the old picture if it exists and is different
        if (user?.userImage && user.userImage !== userImage) {
          await deleteProfilePicture(user.userImage);
        }
        
        updateData.userImage = userImage;
      }
    }

    // Only update user data if there's something to update
    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: updateData
      });
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Follow a user
router.post('/follow/:username', authenticate, async (req, res) => {
  try {
    const { username } = req.params;
    const followerId = req.user?.id;

    if (!followerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user exists
    const userToFollow = await prisma.user.findUnique({
      where: { username }
    });

    if (!userToFollow) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already following
    const existingFollow = await prisma.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: userToFollow.id
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
        followingId: userToFollow.id
      }
    });

    res.status(200).json({ message: 'Successfully followed user' });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// Unfollow a user
router.post('/unfollow/:username', authenticate, async (req, res) => {
  try {
    const { username } = req.params;
    const followerId = req.user?.id;

    if (!followerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user exists
    const userToUnfollow = await prisma.user.findUnique({
      where: { username }
    });

    if (!userToUnfollow) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete follow relationship
    await prisma.follows.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId: userToUnfollow.id
        }
      }
    });

    res.status(200).json({ message: 'Successfully unfollowed user' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

// Get user's followers and following
router.get('/follows', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get followers and following in parallel
    const [followers, following] = await Promise.all([
      prisma.follows.findMany({
        where: { followingId: userId },
        include: {
          follower: {
            select: {
              id: true,
              username: true,
              userImage: true
            }
          }
        }
      }),
      prisma.follows.findMany({
        where: { followerId: userId },
        include: {
          following: {
            select: {
              id: true,
              username: true,
              userImage: true
            }
          }
        }
      })
    ]) as [FollowWithUser[], FollowWithUser[]];

    // Transform the data to match the expected format
    const response = {
      followers: followers.map(f => ({
        id: f.follower.id,
        username: f.follower.username,
        userImage: f.follower.userImage
      })),
      following: following.map(f => ({
        id: f.following.id,
        username: f.following.username,
        userImage: f.following.userImage
      }))
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching follows:', error);
    res.status(500).json({ error: 'Failed to fetch follows' });
  }
});

export default router; 