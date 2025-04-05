import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';

const prisma = new PrismaClient();

// Get saved posts for a user
export const getSavedPosts = async (req: AuthRequest, res: Response) => {
  try {
    // Ensure user is authenticated
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userId = req.user.id;
    
    // Get all saved posts for the user
    const savedPosts = await prisma.savedPost.findMany({
      where: {
        userId
      },
      include: {
        post: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            mediaUrl: true,
            mediaHash: true,
            mediaType: true,
            authorId: true,
            author: {
              select: {
                username: true,
                userImage: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Extract the post data from the saved posts
    const posts = savedPosts.map((saved: any) => saved.post);
    
    res.json(posts);
  } catch (error) {
    console.error('Error fetching saved posts:', error);
    res.status(500).json({ error: 'Server error while fetching saved posts' });
  }
};

// Get user follows data (following and followers)
export const getUserFollows = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    
    // Get users that the current user follows
    const following = await prisma.follows.findMany({
      where: {
        followerId: userId
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
    
    // Get users that follow the current user
    const followers = await prisma.follows.findMany({
      where: {
        followingId: userId
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
    
    res.json({
      following: following.map(f => f.following),
      followers: followers.map(f => f.follower)
    });
  } catch (error) {
    console.error('Error fetching user follows:', error);
    res.status(500).json({ error: 'Failed to fetch user follows data' });
  }
}; 