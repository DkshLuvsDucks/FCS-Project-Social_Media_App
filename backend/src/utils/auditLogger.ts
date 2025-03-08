import prisma from '../config/db';
import crypto from 'crypto';

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
  chatRoomId: number,
  senderId: number,
  encryptedContent: string,
  iv: string,
  algorithm: string = 'aes-256-gcm'
) => {
  const hmac = crypto.createHmac('sha256', process.env.JWT_SECRET!)
    .update(encryptedContent)
    .digest('hex');

  return prisma.message.create({
    data: {
      chatRoomId,
      senderId,
      encryptedContent,
      iv,
      algorithm,
      hmac,
      timestamp: new Date()
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