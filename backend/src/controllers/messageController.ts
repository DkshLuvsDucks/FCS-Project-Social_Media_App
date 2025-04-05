import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';

const prisma = new PrismaClient();

// Interface for conversation data structure
interface ConversationRow {
  id: number;
  user1_id: number;
  user2_id: number;
  user1_username: string;
  user2_username: string;
  user1_image: string | null;
  user2_image: string | null;
  messages: string | null;
}

// Get all conversations for the current user
export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Get all conversations where this user is a participant
    const rawConversations = await prisma.$queryRaw`
      SELECT 
        c.id, 
        c.user1Id, 
        c.user2Id,
        u1.username as user1_username,
        u1.userImage as user1_image,
        u2.username as user2_username,
        u2.userImage as user2_image,
        (
          SELECT m.content 
          FROM Message m 
          WHERE m.conversationId = c.id 
          ORDER BY m.createdAt DESC 
          LIMIT 1
        ) as lastMessage,
        (
          SELECT m.createdAt 
          FROM Message m 
          WHERE m.conversationId = c.id 
          ORDER BY m.createdAt DESC 
          LIMIT 1
        ) as lastMessageTime
      FROM Conversation c
      JOIN User u1 ON c.user1Id = u1.id
      JOIN User u2 ON c.user2Id = u2.id
      WHERE c.user1Id = ${userId} OR c.user2Id = ${userId}
    `;
    
    // Format response
    const formattedConversations = (Array.isArray(rawConversations) ? rawConversations : []).map((conv: any) => {
      const otherUserId = conv.user1Id === userId ? conv.user2Id : conv.user1Id;
      const otherUsername = conv.user1Id === userId ? conv.user2_username : conv.user1_username;
      const otherUserImage = conv.user1Id === userId ? conv.user2_image : conv.user1_image;
      
      return {
        id: conv.id,
        otherUser: {
          id: otherUserId,
          username: otherUsername,
          userImage: otherUserImage
        },
        lastMessage: conv.lastMessage,
        lastMessageTime: conv.lastMessageTime ? new Date(conv.lastMessageTime).toISOString() : null,
        unreadCount: 0
      };
    });
    
    console.log('Formatted conversations:', formattedConversations);
    res.json(formattedConversations);
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ error: 'Server error while fetching conversations' });
  }
};

// Get messages between current user and another user
export const getDirectMessages = async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.user!.id;
    const otherUserId = parseInt(req.params.userId);
    
    // Find existing conversation
    let conversation: any = await prisma.$queryRaw`
      SELECT * FROM Conversation
      WHERE (user1Id = ${currentUserId} AND user2Id = ${otherUserId})
      OR (user1Id = ${otherUserId} AND user2Id = ${currentUserId})
      LIMIT 1
    `;
    
    // Ensure conversation is an array and extract the first result
    conversation = Array.isArray(conversation) && conversation.length > 0 
      ? conversation[0] 
      : null;
    
    if (!conversation) {
      // Create new conversation if none exists
      await prisma.$executeRaw`
        INSERT INTO Conversation (user1Id, user2Id, createdAt, updatedAt)
        VALUES (${currentUserId}, ${otherUserId}, NOW(), NOW())
      `;
      
      // Get the newly created conversation
      conversation = await prisma.$queryRaw`
        SELECT * FROM Conversation
        WHERE (user1Id = ${currentUserId} AND user2Id = ${otherUserId})
        OR (user1Id = ${otherUserId} AND user2Id = ${currentUserId})
        ORDER BY id DESC LIMIT 1
      `;
      
      // Ensure conversation is an array and extract the first result
      conversation = Array.isArray(conversation) && conversation.length > 0 
        ? conversation[0] 
        : null;
      
      if (!conversation) {
        return res.status(500).json({ error: 'Failed to create conversation' });
      }
    }
    
    // Get messages
    const messages = await prisma.message.findMany({
      where: {
        // Use type assertion to add the conversationId property
        ...(conversation.id ? { conversationId: conversation.id } as any : {})
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
    console.error('Error getting direct messages:', error);
    res.status(500).json({ error: 'Server error while fetching messages' });
  }
};

// Send a direct message
export const sendDirectMessage = async (req: AuthRequest, res: Response) => {
  try {
    const senderId = req.user!.id;
    const receiverId = parseInt(req.params.userId);
    const { content, replyToId, mediaUrl, mediaType } = req.body;
    
    // Find existing conversation
    let conversation: any = await prisma.$queryRaw`
      SELECT * FROM Conversation
      WHERE (user1Id = ${senderId} AND user2Id = ${receiverId})
      OR (user1Id = ${receiverId} AND user2Id = ${senderId})
      LIMIT 1
    `;
    
    // Ensure conversation is an array and extract the first result
    conversation = Array.isArray(conversation) && conversation.length > 0 
      ? conversation[0] 
      : null;
    
    if (!conversation) {
      // Create new conversation if none exists
      await prisma.$executeRaw`
        INSERT INTO Conversation (user1Id, user2Id, createdAt, updatedAt)
        VALUES (${senderId}, ${receiverId}, NOW(), NOW())
      `;
      
      // Get the newly created conversation
      conversation = await prisma.$queryRaw`
        SELECT * FROM Conversation
        WHERE (user1Id = ${senderId} AND user2Id = ${receiverId})
        OR (user1Id = ${receiverId} AND user2Id = ${senderId})
        ORDER BY id DESC LIMIT 1
      `;
      
      // Ensure conversation is an array and extract the first result
      conversation = Array.isArray(conversation) && conversation.length > 0 
        ? conversation[0] 
        : null;
      
      if (!conversation) {
        return res.status(500).json({ error: 'Failed to create conversation' });
      }
    }
    
    // Create message
    const messageData: any = {
      content,
      senderId,
      receiverId,
      conversationId: conversation.id,
      mediaUrl,
      mediaType
    };
    
    if (replyToId) {
      messageData.replyToId = parseInt(replyToId);
    }
    
    const message = await prisma.message.create({
      data: messageData,
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
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending direct message:', error);
    res.status(500).json({ error: 'Server error while sending message' });
  }
};

// Mark message as read
export const markMessageAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const messageId = parseInt(req.params.messageId);
    
    // Get message
    const message = await prisma.message.findUnique({
      where: {
        id: messageId
      }
    });
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Check if user is the receiver
    if (message.receiverId !== userId) {
      return res.status(403).json({ error: 'Not authorized to mark this message as read' });
    }
    
    // Mark as read
    const updateData: any = {
      read: true
    };
    
    // Add readAt if it exists in the schema
    updateData.readAt = new Date();
    
    const updatedMessage = await prisma.message.update({
      where: {
        id: messageId
      },
      data: updateData
    });
    
    res.json(updatedMessage);
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Server error while marking message as read' });
  }
};

// Delete a message
export const deleteMessage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const messageId = parseInt(req.params.messageId);
    const { deleteType } = req.body; // 'self' or 'everyone'
    
    // Get message
    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Check if user is the sender or receiver
    if (message.senderId !== userId && message.receiverId !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }
    
    // Delete logic
    if (deleteType === 'everyone') {
      // Only sender can delete for everyone
      if (message.senderId !== userId) {
        return res.status(403).json({ error: 'Only the sender can delete for everyone' });
      }
      
      await prisma.message.delete({
        where: { id: messageId }
      });
    } else {
      // Delete for self
      const updateData: any = message.senderId === userId
        ? { deletedForSender: true }
        : { deletedForReceiver: true };
      
      await prisma.message.update({
        where: { id: messageId },
        data: updateData
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Server error while deleting message' });
  }
};

// Edit a message
export const editMessage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const messageId = parseInt(req.params.messageId);
    const { content } = req.body;
    
    // Get message
    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Check if user is the sender
    if (message.senderId !== userId) {
      return res.status(403).json({ error: 'Not authorized to edit this message' });
    }
    
    // Edit message
    const updateData: any = {
      content,
      isEdited: true
    };
    
    // Add editedAt if it exists in the schema
    updateData.editedAt = new Date();
    
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: updateData,
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
    console.error('Error editing message:', error);
    res.status(500).json({ error: 'Server error while editing message' });
  }
};

// Share a post via DM
export const sharePost = async (req: AuthRequest, res: Response) => {
  try {
    const senderId = req.user!.id;
    const { receiverId, postId } = req.body;
    
    if (!receiverId || !postId) {
      return res.status(400).json({ error: 'Missing required fields: receiverId and postId' });
    }
    
    // Find the post to include details
    const post = await prisma.post.findUnique({
      where: { id: Number(postId) },
      select: {
        id: true,
        content: true,
        mediaUrl: true,
        mediaHash: true,
        author: {
          select: {
            username: true
          }
        }
      }
    });
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Create the post share message content
    const messageContent = `Shared a post by @${post.author.username}\n${post.content ? `"${post.content.substring(0, 50)}${post.content.length > 50 ? '...' : ''}"` : ''}`;
    
    // Find existing conversation
    let conversation: any = await prisma.$queryRaw`
      SELECT * FROM Conversation
      WHERE (user1Id = ${senderId} AND user2Id = ${Number(receiverId)})
      OR (user1Id = ${Number(receiverId)} AND user2Id = ${senderId})
      LIMIT 1
    `;
    
    // Ensure conversation is an array and extract the first result
    conversation = Array.isArray(conversation) && conversation.length > 0 
      ? conversation[0] 
      : null;
    
    if (!conversation) {
      // Create new conversation if none exists
      await prisma.$executeRaw`
        INSERT INTO Conversation (user1Id, user2Id, createdAt, updatedAt)
        VALUES (${senderId}, ${Number(receiverId)}, NOW(), NOW())
      `;
      
      // Get the newly created conversation
      conversation = await prisma.$queryRaw`
        SELECT * FROM Conversation
        WHERE (user1Id = ${senderId} AND user2Id = ${Number(receiverId)})
        OR (user1Id = ${Number(receiverId)} AND user2Id = ${senderId})
        ORDER BY id DESC LIMIT 1
      `;
      
      // Ensure conversation is an array and extract the first result
      conversation = Array.isArray(conversation) && conversation.length > 0 
        ? conversation[0] 
        : null;
      
      if (!conversation) {
        return res.status(500).json({ error: 'Failed to create conversation' });
      }
    }
    
    // Create message with shared post data
    const messageData: any = {
      content: messageContent,
      senderId,
      receiverId: Number(receiverId),
      conversationId: conversation.id,
      isSystemMessage: false,
      sharedPostId: Number(postId)
    };
    
    const message = await prisma.message.create({
      data: messageData,
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
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Error sharing post:', error);
    res.status(500).json({ error: 'Server error while sharing post' });
  }
};

// Share a post to a group chat
export const sharePostGroup = async (req: AuthRequest, res: Response) => {
  try {
    console.log('Starting sharePostGroup with body:', req.body);
    const senderId = req.user!.id;
    const { groupId, postId } = req.body;
    
    if (!groupId || !postId) {
      console.log('Missing required fields: groupId and postId');
      return res.status(400).json({ error: 'Missing required fields: groupId and postId' });
    }
    
    console.log(`Trying to find post with ID: ${postId}`);
    // Find the post to include details
    const post = await prisma.post.findUnique({
      where: { id: Number(postId) },
      select: {
        id: true,
        content: true,
        mediaUrl: true,
        mediaHash: true,
        author: {
          select: {
            username: true
          }
        }
      }
    });
    
    if (!post) {
      console.log(`Post with ID ${postId} not found`);
      return res.status(404).json({ error: 'Post not found' });
    }
    
    console.log(`Post found, checking membership in group ${groupId}`);
    // Check if user is a member of the group
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: senderId,
          groupId: Number(groupId)
        }
      }
    });

    if (!membership) {
      console.log(`User ${senderId} is not a member of group ${groupId}`);
      return res.status(403).json({ error: 'You are not a member of this group' });
    }
    
    console.log(`Membership confirmed, checking if group ${groupId} exists`);
    // Check if the group exists
    const group = await prisma.groupChat.findUnique({
      where: { id: Number(groupId) }
    });
    
    if (!group) {
      console.log(`Group ${groupId} not found`);
      return res.status(404).json({ error: 'Group chat not found' });
    }
    
    console.log('Creating message content');
    // Create the post share message content
    const messageContent = `Shared a post by @${post.author.username}\n${post.content ? `"${post.content.substring(0, 50)}${post.content.length > 50 ? '...' : ''}"` : ''}`;
    
    console.log('Preparing message data');
    // Create message with shared post data
    const messageData: any = {
      content: messageContent,
      senderId,
      groupId: Number(groupId),
      isSystem: false,
      sharedPostId: Number(postId)
    };
    
    console.log('Creating message in the database');
    // Create message and update group's updatedAt
    try {
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
            }
          }
        }),
        prisma.groupChat.update({
          where: { id: Number(groupId) },
          data: { updatedAt: new Date() }
        })
      ]);
      
      console.log('Message created successfully:', message.id);
      res.status(201).json(message);
    } catch (transactionError) {
      console.error('Transaction error:', transactionError);
      throw transactionError;
    }
  } catch (error) {
    console.error('Error sharing post to group:', error);
    res.status(500).json({ error: 'Server error while sharing post to group' });
  }
}; 