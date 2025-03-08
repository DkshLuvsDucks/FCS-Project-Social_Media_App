import { Request, Response } from 'express';
import prisma from '../config/db';
import { encryptMessage, decryptMessage } from '../utils/crypto';
import crypto from 'crypto';

export const createPost = async (req: Request, res: Response) => {
  try {
    const { content, isEncrypted } = req.body;
    const userId = req.user.id;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    let postData: any = {
      content,
      authorId: userId,
      isEncrypted: !!isEncrypted
    };

    // If post should be encrypted
    if (isEncrypted) {
      const encryptionKey = process.env.ENCRYPTION_KEY || '';
      const encrypted = encryptMessage(content, encryptionKey);
      
      postData = {
        ...postData,
        content: encrypted.content,
        iv: encrypted.iv,
        encryptionType: 'aes-256-gcm'
      };
    }

    // If media is included, hash it
    if (req.body.media) {
      postData.mediaHash = crypto
        .createHash('sha256')
        .update(req.body.media)
        .digest('hex');
    }

    const post = await prisma.post.create({
      data: postData,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            userImage: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Post created successfully',
      post: {
        ...post,
        // If encrypted, don't return the actual content
        content: isEncrypted ? '[Encrypted Content]' : post.content
      }
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Server error while creating post' });
  }
};

export const getPosts = async (req: Request, res: Response) => {
  try {
    const posts = await prisma.post.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            userImage: true
          }
        }
      }
    });

    // Process posts to handle encrypted content
    const processedPosts = posts.map(post => ({
      ...post,
      content: post.isEncrypted ? '[Encrypted Content]' : post.content
    }));

    res.status(200).json(processedPosts);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Server error while fetching posts' });
  }
};

export const getPostById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const postId = parseInt(id);

    if (isNaN(postId)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            userImage: true
          }
        }
      }
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // If post is encrypted and user is the author, decrypt it
    let content = post.content;
    if (post.isEncrypted) {
      if (req.user.id === post.authorId) {
        try {
          const encryptionKey = process.env.ENCRYPTION_KEY || '';
          content = decryptMessage(
            { 
              content: post.content, 
              iv: post.iv || '', 
              tag: '' // In a real app, you'd store and retrieve the tag
            }, 
            encryptionKey
          );
        } catch (error) {
          console.error('Decryption error:', error);
          content = '[Encrypted Content - Unable to Decrypt]';
        }
      } else {
        content = '[Encrypted Content]';
      }
    }

    res.status(200).json({
      ...post,
      content
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'Server error while fetching post' });
  }
}; 