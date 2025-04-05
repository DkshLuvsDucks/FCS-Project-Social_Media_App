import prisma from '../config/db';
import crypto from 'crypto';
import { encryptMessage } from './encryption';
import { Prisma } from '@prisma/client';

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

export const logLogin = async (
  userId: number,
  sessionId: string,
  ipAddress: string,
  userAgent: string,
  deviceFingerprint: string,
  geoLocation?: string,
  successful: boolean = true
) => {
  return prisma.login.create({
    data: {
      userId,
      sessionId,
      ipAddress,
      userAgent,
      deviceFingerprint,
      geoLocation,
      successful,
      loginTime: new Date()
    }
  });
};

export async function logMessage(content: string, senderId: number, receiverId: number) {
  try {
    // Find or create conversation first
    let conversation = await prisma.$queryRaw`
      SELECT * FROM Conversation 
      WHERE (user1Id = ${senderId} AND user2Id = ${receiverId})
      OR (user1Id = ${receiverId} AND user2Id = ${senderId})
      LIMIT 1
    `;
    
    // Extract conversation or create it if it doesn't exist
    if (!Array.isArray(conversation) || conversation.length === 0) {
      // Create new conversation
      conversation = await prisma.$executeRaw`
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
    }
    
    // Ensure conversation is an array and has at least one element
    const conversationData = Array.isArray(conversation) ? conversation[0] : conversation;
    const conversationId = conversationData?.id;
    
    if (!conversationId) {
      throw new Error('Failed to create or find conversation');
    }
    
    const encrypted = await encryptMessage(content, senderId, receiverId);
    
    const messageData = {
      encryptedContent: encrypted.encryptedContent,
      iv: encrypted.iv,
      algorithm: encrypted.algorithm,
      hmac: encrypted.hmac,
      authTag: encrypted.authTag,
      content: content,  // Store both encrypted and plain content
      senderId: senderId,
      receiverId: receiverId,
      conversationId: conversationId,
      read: false
    };

    const message = await prisma.message.create({
      data: messageData
    });

    return message;
  } catch (error) {
    console.error('Error logging message:', error);
    throw error;
  }
}

export const logFailedLoginAttempt = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) return null;

  const failedAttempts = user.failedLoginAttempts + 1;
  
  // Lock account after 5 failed attempts
  const lockedUntil = failedAttempts >= 5 
    ? new Date(Date.now() + 30 * 60 * 1000) // Lock for 30 minutes
    : null;

  return prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: failedAttempts,
      lockedUntil
    }
  });
}; 