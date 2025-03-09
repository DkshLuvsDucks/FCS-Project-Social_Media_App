import express from 'express';
import { authenticate } from '../middleware/authMiddleware';
import prisma from '../config/db';
import { encryptMessage, decryptMessage } from '../utils/encryption';

const router = express.Router();

interface RawConversation {
  otherUserId: number;
  otherUsername: string;
  lastMessageEncrypted: string | null;
  lastMessageIv: string | null;
  lastMessageAlgorithm: string | null;
  lastMessageHmac: string | null;
  lastMessageTime: Date | null;
  unreadCount: number;
}

interface DecryptedConversation extends Omit<RawConversation, 'lastMessageEncrypted' | 'lastMessageIv' | 'lastMessageAlgorithm' | 'lastMessageHmac'> {
  lastMessage: string;
}

interface EncryptedMessage {
  id: number;
  encryptedContent: string;
  iv: string;
  algorithm: string;
  hmac: string;
  senderId: number;
  receiverId: number;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
  sender: {
    id: number;
    username: string;
  };
}

interface DecryptedMessage extends Omit<EncryptedMessage, 'encryptedContent' | 'iv' | 'algorithm' | 'hmac'> {
  content: string;
}

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
          SELECT createdAt 
          FROM Message 
          WHERE (senderId = ${userId} AND receiverId = u.id) 
             OR (senderId = u.id AND receiverId = ${userId})
          ORDER BY createdAt DESC 
          LIMIT 1
        ) as lastMessageTime,
        (
          SELECT COUNT(*) 
          FROM Message 
          WHERE receiverId = ${userId} 
            AND senderId = u.id 
            AND read = false
        ) as unreadCount
      FROM Message m
      JOIN User u ON (
        CASE 
          WHEN m.senderId = ${userId} THEN m.receiverId = u.id
          ELSE m.senderId = u.id
        END
      )
      WHERE m.senderId = ${userId} OR m.receiverId = ${userId}
      ORDER BY lastMessageTime DESC
    `;

    // Decrypt last messages
    const conversationsWithDecryptedMessages: DecryptedConversation[] = conversations.map((conv) => {
      if (conv.lastMessageEncrypted) {
        try {
          const decrypted = decryptMessage(
            {
              encryptedContent: conv.lastMessageEncrypted,
              iv: conv.lastMessageIv!,
              algorithm: conv.lastMessageAlgorithm!,
              hmac: conv.lastMessageHmac!
            },
            userId,
            conv.otherUserId
          );
          return {
            otherUserId: conv.otherUserId,
            otherUsername: conv.otherUsername,
            lastMessage: decrypted,
            lastMessageTime: conv.lastMessageTime,
            unreadCount: conv.unreadCount
          };
        } catch (error) {
          console.error('Failed to decrypt message:', error);
          return {
            otherUserId: conv.otherUserId,
            otherUsername: conv.otherUsername,
            lastMessage: '[Encrypted Message]',
            lastMessageTime: conv.lastMessageTime,
            unreadCount: conv.unreadCount
          };
        }
      }
      return {
        otherUserId: conv.otherUserId,
        otherUsername: conv.otherUsername,
        lastMessage: '',
        lastMessageTime: conv.lastMessageTime,
        unreadCount: conv.unreadCount
      };
    });

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

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { AND: [{ senderId: currentUserId }, { receiverId: otherUserId }] },
          { AND: [{ senderId: otherUserId }, { receiverId: currentUserId }] },
        ],
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    }) as EncryptedMessage[];

    // Decrypt messages
    const decryptedMessages: DecryptedMessage[] = messages.map(msg => {
      try {
        const decrypted = decryptMessage(
          {
            encryptedContent: msg.encryptedContent,
            iv: msg.iv,
            algorithm: msg.algorithm,
            hmac: msg.hmac
          },
          msg.senderId,
          msg.receiverId
        );
        return {
          ...msg,
          content: decrypted
        };
      } catch (error) {
        console.error('Failed to decrypt message:', error);
        return {
          ...msg,
          content: '[Encrypted Message]'
        };
      }
    });

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: currentUserId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    res.json(decryptedMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message
router.post('/send', authenticate, async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user.id;

    if (!receiverId || !content) {
      return res.status(400).json({ error: 'Receiver ID and content are required' });
    }

    // Check if receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: parseInt(receiverId) },
    });

    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found' });
    }

    // Encrypt the message
    const encrypted = encryptMessage(content, senderId, parseInt(receiverId));

    const message = await prisma.message.create({
      data: {
        encryptedContent: encrypted.encryptedContent,
        iv: encrypted.iv,
        algorithm: encrypted.algorithm,
        hmac: encrypted.hmac,
        senderId,
        receiverId: parseInt(receiverId),
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    // Return decrypted message in response
    const responseMessage = {
      ...message,
      content
    };

    res.status(201).json(responseMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router; 