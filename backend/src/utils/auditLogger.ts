import prisma from '../config/db';
import crypto from 'crypto';
import { encryptMessage } from './encryption';
import { Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

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

const prismaClient = new PrismaClient();

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
      read: false
    };

    const message = await prismaClient.message.create({
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