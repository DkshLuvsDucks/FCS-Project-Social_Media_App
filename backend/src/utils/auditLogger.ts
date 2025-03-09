import prisma from '../config/db';
import crypto from 'crypto';
import { encryptMessage } from './encryption';

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

export const logMessage = async (
  senderId: number,
  receiverId: number,
  content: string
) => {
  const encrypted = encryptMessage(content, senderId, receiverId);
  
  return prisma.message.create({
    data: {
      ...encrypted,
      senderId,
      receiverId
    }
  });
};

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