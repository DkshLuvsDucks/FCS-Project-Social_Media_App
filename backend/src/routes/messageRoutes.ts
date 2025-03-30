import express from 'express';
import { authenticate } from '../middleware/authMiddleware';
import prisma from '../config/db';
import { encryptMessage, decryptMessage } from '../utils/encryption';
import { Message, Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { encryptMedia, saveEncryptedMedia } from '../utils/mediaEncryption';

const router = express.Router();
const prismaClient = new PrismaClient();

interface RawConversation {
  otherUserId: number;
  otherUsername: string;
  otherUserImage: string | null;
  lastMessageEncrypted: string | null;
  lastMessageIv: string | null;
  lastMessageAlgorithm: string | null;
  lastMessageHmac: string | null;
  lastMessageAuthTag: string | null;
  lastMessageTime: Date | null;
  unreadCount: number;
}

interface DecryptedConversation extends Omit<RawConversation, 'lastMessageEncrypted' | 'lastMessageIv' | 'lastMessageAlgorithm' | 'lastMessageHmac' | 'lastMessageAuthTag'> {
  lastMessage: string;
}

interface EncryptedMessage {
  id: number;
  encryptedContent: string;
  iv: string;
  algorithm: string;
  hmac: string;
  authTag: string;
  senderId: number;
  receiverId: number;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
  sender: {
    id: number;
    username: string;
    userImage: string | null;
  };
}

interface DecryptedMessage extends Omit<EncryptedMessage, 'encryptedContent' | 'iv' | 'algorithm' | 'hmac' | 'authTag'> {
  content: string;
}

// Add custom types for message operations
type CustomMessageWhereInput = Prisma.MessageWhereInput & {
  deletedForSender?: boolean;
  deletedForReceiver?: boolean;
};

type CustomMessageUpdateInput = Prisma.MessageUpdateInput & {
  deletedForSender?: boolean;
  deletedForReceiver?: boolean;
  isEdited?: boolean;
  content?: string;
};

// Custom types for message operations
type MessageCreateData = {
  content: string;
  senderId: number;
  receiverId: number;
  read?: boolean;
  isEdited?: boolean;
  deletedForSender?: boolean;
  deletedForReceiver?: boolean;
};

// Configure multer for media uploads in messages
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

// Get all conversations for the current user
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all messages where the user is either sender or receiver
    const conversations = await prisma.$queryRaw<RawConversation[]>`
      SELECT 
        DISTINCT 
        CASE 
          WHEN m.senderId = ${userId} THEN m.receiverId
          ELSE m.senderId 
        END as otherUserId,
        u.username as otherUsername,
        u.userImage as otherUserImage,
        (
          SELECT encryptedContent 
          FROM Message 
          WHERE (senderId = ${userId} AND receiverId = u.id) 
             OR (senderId = u.id AND receiverId = ${userId})
          ORDER BY createdAt DESC 
          LIMIT 1
        ) as lastMessageEncrypted,
        (
          SELECT iv 
          FROM Message 
          WHERE (senderId = ${userId} AND receiverId = u.id) 
             OR (senderId = u.id AND receiverId = ${userId})
          ORDER BY createdAt DESC 
          LIMIT 1
        ) as lastMessageIv,
        (
          SELECT algorithm 
          FROM Message 
          WHERE (senderId = ${userId} AND receiverId = u.id) 
             OR (senderId = u.id AND receiverId = ${userId})
          ORDER BY createdAt DESC 
          LIMIT 1
        ) as lastMessageAlgorithm,
        (
          SELECT hmac 
          FROM Message 
          WHERE (senderId = ${userId} AND receiverId = u.id) 
             OR (senderId = u.id AND receiverId = ${userId})
          ORDER BY createdAt DESC 
          LIMIT 1
        ) as lastMessageHmac,
        (
          SELECT authTag
          FROM Message 
          WHERE (senderId = ${userId} AND receiverId = u.id) 
             OR (senderId = u.id AND receiverId = ${userId})
          ORDER BY createdAt DESC 
          LIMIT 1
        ) as lastMessageAuthTag,
        (
          SELECT createdAt 
          FROM Message 
          WHERE (senderId = ${userId} AND receiverId = u.id) 
             OR (senderId = u.id AND receiverId = ${userId})
          ORDER BY createdAt DESC 
          LIMIT 1
        ) as lastMessageTime,
        (
          SELECT CAST(COUNT(*) AS SIGNED) 
          FROM Message 
          WHERE receiverId = ${userId} 
            AND senderId = u.id 
            AND \`read\` = false
        ) as unreadCount
      FROM Message m
      JOIN User u ON u.id = (
        CASE 
          WHEN m.senderId = ${userId} THEN m.receiverId
          ELSE m.senderId
        END
      )
      WHERE m.senderId = ${userId} OR m.receiverId = ${userId}
      ORDER BY lastMessageTime DESC
    `;

    // Convert BigInts to numbers in the response
    const conversationsWithNumbers = conversations.map(conv => ({
      ...conv,
      otherUserId: Number(conv.otherUserId),
      unreadCount: Number(conv.unreadCount)
    }));

    // Decrypt last messages
    const conversationsWithDecryptedMessages: DecryptedConversation[] = await Promise.all(
      conversationsWithNumbers.map(async (conv) => {
        if (conv.lastMessageEncrypted) {
          try {
            // Get the sender and receiver IDs from the last message query
            const senderQuery = await prisma.message.findFirst({
              where: {
                OR: [
                  { AND: [{ senderId: userId }, { receiverId: conv.otherUserId }] },
                  { AND: [{ senderId: conv.otherUserId }, { receiverId: userId }] }
                ]
              },
              orderBy: { createdAt: 'desc' },
              select: { senderId: true, receiverId: true }
            });

            if (!senderQuery) {
              console.log('No message found for conversation:', conv);
              return {
                otherUserId: conv.otherUserId,
                otherUsername: conv.otherUsername,
                otherUserImage: conv.otherUserImage,
                lastMessage: '',
                lastMessageTime: conv.lastMessageTime,
                unreadCount: conv.unreadCount
              };
            }

            const decrypted = decryptMessage(
              {
                encryptedContent: `${conv.lastMessageEncrypted}.${conv.lastMessageAuthTag}`,
                iv: conv.lastMessageIv!,
                algorithm: conv.lastMessageAlgorithm!,
                hmac: conv.lastMessageHmac!
              },
              Number(senderQuery.senderId),
              Number(senderQuery.receiverId)
            );
            return {
              otherUserId: conv.otherUserId,
              otherUsername: conv.otherUsername,
              otherUserImage: conv.otherUserImage,
              lastMessage: decrypted,
              lastMessageTime: conv.lastMessageTime,
              unreadCount: conv.unreadCount
            };
          } catch (error) {
            console.error('Failed to decrypt message:', error);
            return {
              otherUserId: conv.otherUserId,
              otherUsername: conv.otherUsername,
              otherUserImage: conv.otherUserImage,
              lastMessage: '[Encrypted Message]',
              lastMessageTime: conv.lastMessageTime,
              unreadCount: conv.unreadCount
            };
          }
        }
        return {
          otherUserId: conv.otherUserId,
          otherUsername: conv.otherUsername,
          otherUserImage: conv.otherUserImage,
          lastMessage: '',
          lastMessageTime: conv.lastMessageTime,
          unreadCount: conv.unreadCount
        };
      })
    );

    res.json(conversationsWithDecryptedMessages);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get messages between current user and another user
router.get('/conversation/:userId', authenticate, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = parseInt(req.params.userId);
    const includeReplies = req.query.includeReplies === 'true';

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          {
            senderId: currentUserId,
            receiverId: otherUserId,
            deletedForSender: false
          } as CustomMessageWhereInput,
          {
            senderId: otherUserId,
            receiverId: currentUserId,
            deletedForReceiver: false
          } as CustomMessageWhereInput
        ]
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

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message
router.post('/send', authenticate, async (req, res) => {
  try {
    const { receiverId, content, replyToId, mediaUrl, mediaType } = req.body;
    const senderId = req.user.id;

    if (!receiverId || (!content && !mediaUrl)) {
      return res.status(400).json({ 
        error: 'Receiver ID and either content or media are required' 
      });
    }

    // Check if receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: parseInt(receiverId) },
    });

    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found' });
    }

    // Encrypt the message content if it exists
    let encrypted = null;
    if (content) {
      encrypted = encryptMessage(content, senderId, parseInt(receiverId));
    }

    // Create the message with both encrypted and unencrypted content
    const messageData: any = {
      senderId,
      receiverId: parseInt(receiverId),
      read: false,
      isEdited: false,
      deletedForSender: false,
      deletedForReceiver: false,
      replyToId: replyToId ? parseInt(replyToId) : null,
    };

    // Add content if it exists
    if (content) {
      messageData.content = content;
      if (encrypted) {
        messageData.encryptedContent = encrypted.encryptedContent;
        messageData.iv = encrypted.iv;
        messageData.algorithm = encrypted.algorithm;
        messageData.hmac = encrypted.hmac;
        messageData.authTag = encrypted.authTag;
      }
    }

    // Add media information if it exists
    if (mediaUrl) {
      messageData.mediaUrl = mediaUrl;
      messageData.mediaType = mediaType || 'image'; // Default to image if type not specified
      messageData.mediaEncrypted = false; // Set to true if implementing media encryption
    }

    const message = await prisma.message.create({
      data: messageData,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            userImage: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: {
              select: {
                id: true,
                username: true,
                userImage: true,
              },
            },
          },
        },
      },
    });

    // Return the created message
    return res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Create a new conversation
router.post('/conversations', authenticate, async (req, res) => {
  try {
    const { userId: otherUserId } = req.body;
    const currentUserId = req.user.id;

    if (!otherUserId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if other user exists
    const otherUser = await prisma.user.findUnique({
      where: { id: parseInt(otherUserId) },
      select: {
        id: true,
        username: true,
        userImage: true
      }
    });

    if (!otherUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if conversation already exists
    const existingMessages = await prisma.message.findFirst({
      where: {
        OR: [
          { AND: [{ senderId: currentUserId }, { receiverId: otherUser.id }] },
          { AND: [{ senderId: otherUser.id }, { receiverId: currentUserId }] }
        ]
      }
    });

    // Return success even if conversation exists
    res.status(200).json({
      otherUserId: otherUser.id,
      otherUsername: otherUser.username,
      otherUserImage: otherUser.userImage,
      lastMessage: '',
      lastMessageTime: new Date(),
      unreadCount: 0
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Edit a message
router.put('/:id', authenticate, async (req, res) => {
  try {
    const messageId = parseInt(req.params.id);
    const { content } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find the message
    const message: any = await prisma.message.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only sender can edit the message
    if (message.senderId !== userId) {
      return res.status(403).json({ error: 'Not authorized to edit this message' });
    }

    // Check if message is within 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (message.createdAt < fifteenMinutesAgo) {
      return res.status(403).json({ error: 'Message can only be edited within 15 minutes of sending' });
    }

    // Update the message
    const updateData: CustomMessageUpdateInput = {
      content,
      isEdited: true
    };

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: updateData as Prisma.MessageUpdateInput
    });

    res.json(updatedMessage);
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a message
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const messageId = parseInt(req.params.id);
    const userId = req.user?.id;
    const deleteFor = req.query.deleteFor as string;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find the message
    const message: any = await prisma.message.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user is sender or receiver
    const isSender = message.senderId === userId;
    const isReceiver = message.receiverId === userId;

    if (!isSender && !isReceiver) {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }

    // Handle delete for all (only sender can do this)
    if (deleteFor === 'all') {
      if (!isSender) {
        return res.status(403).json({ error: 'Only sender can delete for all' });
      }

      const updateData: CustomMessageUpdateInput = {
        deletedForSender: true,
        deletedForReceiver: true
      };

      await prisma.message.update({
        where: { id: messageId },
        data: updateData as Prisma.MessageUpdateInput
      });
      
      // Delete media file if this message has media and it's deleted for everyone
      if (message.mediaUrl) {
        await deleteMediaFile(message.mediaUrl);
      }
    } else {
      // Delete for individual user
      const updateData: CustomMessageUpdateInput = isSender 
        ? { deletedForSender: true }
        : { deletedForReceiver: true };

      await prisma.message.update({
        where: { id: messageId },
        data: updateData as Prisma.MessageUpdateInput
      });
      
      // Check if the message is now deleted for both users, then delete media
      if (
        (isSender && message.deletedForReceiver) || 
        (isReceiver && message.deletedForSender)
      ) {
        if (message.mediaUrl) {
          await deleteMediaFile(message.mediaUrl);
        }
      }
    }

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get message info
router.get('/:messageId/info', authenticate, async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    const userId = req.user.id;

    // Get message with read status
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
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

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({
      id: message.id,
      sent: message.createdAt,
      delivered: message.createdAt, // For now, assuming instant delivery
      read: message.read,
      readAt: message.updatedAt,
      sender: message.sender
    });
  } catch (error) {
    console.error('Error fetching message info:', error);
    res.status(500).json({ error: 'Failed to fetch message info' });
  }
});

// Mark messages as read
router.post('/read', authenticate, async (req, res) => {
  try {
    const { messageIds } = req.body;
    const userId = req.user.id;

    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({ error: 'Message IDs array is required' });
    }

    // Only mark messages as read if the current user is the receiver
    const updatedMessages = await prisma.message.updateMany({
      where: {
        id: { in: messageIds },
        receiverId: userId,
        read: false
      },
      data: {
        read: true
      }
    });

    res.json({ updatedCount: updatedMessages.count });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Get unread messages count
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const unreadCount = await prisma.message.count({
      where: {
        receiverId: userId,
        read: false,
        deletedForReceiver: false
      }
    });

    res.json({ count: unreadCount });
  } catch (error) {
    console.error('Error fetching unread messages count:', error);
    res.status(500).json({ error: 'Failed to fetch unread messages count' });
  }
});

// Upload media for messages
router.post('/upload-media', authenticate, mediaUpload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
    const mediaUrl = `/uploads/media/${req.file.filename}`;

    // Optional: implement media encryption
    // If encryption is required, you would encrypt the file here

    res.json({ 
      url: mediaUrl, 
      type: mediaType,
      filename: req.file.filename,
      originalName: req.file.originalname
    });
  } catch (error) {
    console.error('Error uploading media:', error);
    res.status(500).json({ error: 'Failed to upload media file' });
  }
});

export default router; 