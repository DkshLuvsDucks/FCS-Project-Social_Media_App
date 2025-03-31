import express from 'express';
import { authenticate } from '../middleware/authMiddleware';
import prisma from '../config/db';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const router = express.Router();

// Configure multer for media uploads in group messages (reuse the same directory as regular messages)
const mediaUploadDir = path.join(__dirname, '../../uploads/media');
if (!fs.existsSync(mediaUploadDir)) {
  fs.mkdirSync(mediaUploadDir, { recursive: true });
}

const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, mediaUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const mediaUpload = multer({
  storage: mediaStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WEBP, MP4, WEBM and MOV are allowed.'));
    }
  }
});

// Function to delete media file from storage
const deleteMediaFile = async (mediaUrl: string | null): Promise<void> => {
  if (!mediaUrl) return;
  
  try {
    // Extract the file name from the URL
    const fileName = mediaUrl.split('/').pop();
    if (!fileName) return;
    
    const filePath = path.join(__dirname, '../../uploads/media', fileName);
    
    // Check if file exists before attempting to delete
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      console.log(`Deleted media file: ${filePath}`);
    }
  } catch (error) {
    console.error('Error deleting media file:', error);
  }
};

// Get messages for a specific group
router.get('/:groupId', authenticate, async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const userId = req.user.id;
    
    // Check if user is a member of the group
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    // Get messages with their sender info and reply info
    const messages = await prisma.groupMessage.findMany({
      where: {
        groupId
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            userImage: true
          }
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                userImage: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Update the last read message for the current user
    if (messages.length > 0) {
      const latestMessageId = messages[messages.length - 1].id;
      
      await prisma.groupMember.update({
        where: {
          userId_groupId: {
            userId,
            groupId
          }
        },
        data: {
          lastReadMessageId: latestMessageId
        }
      });
    }

    res.json(messages);
  } catch (error) {
    console.error('Error fetching group messages:', error);
    res.status(500).json({ error: 'Failed to fetch group messages' });
  }
});

// Send a message to a group
router.post('/:groupId/send', authenticate, async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const userId = req.user.id;
    const { content, replyToId, mediaUrl, mediaType } = req.body;

    // Validate input
    if (!content && !mediaUrl) {
      return res.status(400).json({ error: 'Message content or media is required' });
    }

    // Check if user is a member of the group
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    // Check if replyToId is valid if provided
    if (replyToId) {
      const replyMessage = await prisma.groupMessage.findFirst({
        where: {
          id: parseInt(replyToId),
          groupId
        }
      });

      if (!replyMessage) {
        return res.status(400).json({ error: 'The message you are replying to does not exist in this group' });
      }
    }

    // Create the message
    const messageData: any = {
      content: content || null,
      senderId: userId,
      groupId,
      replyToId: replyToId ? parseInt(replyToId) : null
    };

    // Add media information if it exists
    if (mediaUrl) {
      messageData.mediaUrl = mediaUrl;
      messageData.mediaType = mediaType || 'image';
    }

    // Create message and update group's updatedAt
    const [message, _] = await prisma.$transaction([
      prisma.groupMessage.create({
        data: messageData,
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              userImage: true
            }
          },
          replyTo: replyToId ? {
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                  userImage: true
                }
              }
            }
          } : undefined
        }
      }),
      prisma.groupChat.update({
        where: { id: groupId },
        data: { updatedAt: new Date() }
      })
    ]);

    // Update sender's last read message ID
    await prisma.groupMember.update({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      },
      data: {
        lastReadMessageId: message.id
      }
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending group message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Upload media for a group message
router.post('/upload-media', authenticate, mediaUpload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
    const mediaUrl = `/uploads/media/${req.file.filename}`;

    res.json({ 
      url: mediaUrl, 
      type: mediaType,
      filename: req.file.filename,
      originalName: req.file.originalname
    });
  } catch (error) {
    console.error('Error uploading media:', error);
    
    // Delete the uploaded file on error
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Failed to upload media file' });
  }
});

// Edit a group message
router.put('/:messageId', authenticate, async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    const userId = req.user.id;
    const { content } = req.body;

    // Find the message
    const message = await prisma.groupMessage.findUnique({
      where: { id: messageId },
      include: {
        group: {
          select: {
            id: true
          }
        }
      }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if the user is the sender
    if (message.senderId !== userId) {
      return res.status(403).json({ error: 'You can only edit your own messages' });
    }

    // Check if message is within 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (message.createdAt < fifteenMinutesAgo) {
      return res.status(403).json({ error: 'Messages can only be edited within 15 minutes of sending' });
    }

    // Update the message
    const updatedMessage = await prisma.groupMessage.update({
      where: { id: messageId },
      data: {
        content,
        isEdited: true,
        updatedAt: new Date()
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            userImage: true
          }
        }
      }
    });

    res.json(updatedMessage);
  } catch (error) {
    console.error('Error editing group message:', error);
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

// Delete a group message
router.delete('/:messageId', authenticate, async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    const userId = req.user.id;

    // Find the message
    const message = await prisma.groupMessage.findUnique({
      where: { id: messageId },
      include: {
        group: {
          select: {
            id: true
          }
        }
      }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if the user is the sender or an admin of the group
    const isAdmin = await prisma.groupMember.findFirst({
      where: {
        userId,
        groupId: message.groupId,
        isAdmin: true
      }
    });

    if (message.senderId !== userId && !isAdmin) {
      return res.status(403).json({ error: 'You can only delete your own messages or need admin rights' });
    }

    // Delete any media files associated with the message
    if (message.mediaUrl) {
      await deleteMediaFile(message.mediaUrl);
    }

    // Delete the message
    await prisma.groupMessage.delete({
      where: { id: messageId }
    });

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting group message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Mark messages as read
router.post('/:groupId/read', authenticate, async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const userId = req.user.id;
    const { messageId } = req.body;  // The latest message ID the user has read

    if (!messageId) {
      return res.status(400).json({ error: 'Message ID is required' });
    }

    // Check if user is a member of the group
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    // Update the lastReadMessageId for this user
    await prisma.groupMember.update({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      },
      data: {
        lastReadMessageId: parseInt(messageId)
      }
    });

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Get message read status
router.get('/:messageId/read-status', authenticate, async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    const userId = req.user.id;

    // Find the message
    const message = await prisma.groupMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        groupId: true,
        createdAt: true
      }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user is a member of the group
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId: message.groupId
        }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    // Get all members who have read this message
    const readByMembers = await prisma.groupMember.findMany({
      where: {
        groupId: message.groupId,
        lastReadMessageId: {
          not: null
        }
      },
      include: {
        lastReadMessage: true,
        user: {
          select: {
            id: true,
            username: true,
            userImage: true
          }
        }
      }
    });

    // Format the response
    const readStatus = readByMembers.map(member => {
      const hasRead = member.lastReadMessage && 
                     ((member.lastReadMessageId !== null && member.lastReadMessageId >= messageId) || 
                      member.lastReadMessage.createdAt >= message.createdAt);
      
      return {
        userId: member.user.id,
        username: member.user.username,
        userImage: member.user.userImage,
        hasRead,
        readAt: hasRead ? member.lastReadMessage?.createdAt : null
      };
    });

    res.json(readStatus);
  } catch (error) {
    console.error('Error fetching message read status:', error);
    res.status(500).json({ error: 'Failed to fetch message read status' });
  }
});

export default router; 