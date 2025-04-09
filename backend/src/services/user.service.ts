import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import { securityLogger } from '../utils/logger';

const prisma = new PrismaClient({
  log: [
    { level: 'warn', emit: 'event' },
    { level: 'error', emit: 'event' }
  ]
});

// Set up Prisma event listeners for security monitoring
prisma.$on('warn', (e) => {
  securityLogger.warn(`Prisma Warning: ${e.message}`);
});

prisma.$on('error', (e) => {
  securityLogger.error(`Prisma Error: ${e.message}`);
});

/**
 * Find a user by username
 * @param username - The username to search for
 * @returns The user object or null if not found
 */
export const findUserByUsername = async (username: string) => {
  try {
    // Prisma automatically parameterizes this query for safety
    return await prisma.user.findFirst({
      where: {
        username: username
      },
      select: {
        id: true,
        email: true,
        username: true,
        passwordHash: true,
        role: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        isBanned: true,
        bannedAt: true
      }
    });
  } catch (error) {
    securityLogger.error(`Error finding user by username: ${error}`);
    throw error;
  }
};

/**
 * Find a user by email
 * @param email - The email to search for
 * @returns The user object or null if not found
 */
export const findUserByEmail = async (email: string) => {
  try {
    // Prisma automatically parameterizes this query for safety
    return await prisma.user.findUnique({
      where: {
        email: email
      },
      select: {
        id: true,
        email: true,
        username: true,
        passwordHash: true,
        role: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        isBanned: true,
        bannedAt: true
      }
    });
  } catch (error) {
    securityLogger.error(`Error finding user by email: ${error}`);
    throw error;
  }
};

/**
 * Create a new user with secure password hashing
 * @param userData - User data including email, username, and password
 * @returns The created user object
 */
export const createUser = async (userData: { 
  email: string, 
  username: string, 
  password: string,
  mobile?: string 
}) => {
  try {
    // Hash password with bcrypt
    const passwordHash = await bcryptjs.hash(userData.password, 12);
    
    // Create user with Prisma (automatically parameterized)
    return await prisma.user.create({
      data: {
        email: userData.email,
        username: userData.username,
        passwordHash,
        mobile: userData.mobile,
        emailVerified: true,
        phoneVerified: userData.mobile ? true : false
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true
      }
    });
  } catch (error) {
    securityLogger.error(`Error creating user: ${error}`);
    throw error;
  }
};

/**
 * Update user's failed login attempts
 * @param userId - The user's ID
 * @param attempts - The number of failed attempts
 * @param lockUntil - Optional date until account is locked
 */
export const updateFailedLoginAttempts = async (
  userId: number, 
  attempts: number,
  lockUntil?: Date
) => {
  try {
    // Update login attempts and potentially lock account
    return await prisma.user.update({
      where: {
        id: userId
      },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil: lockUntil
      }
    });
  } catch (error) {
    securityLogger.error(`Error updating failed login attempts: ${error}`);
    throw error;
  }
};

/**
 * Reset failed login attempts for a user
 * @param userId - The user's ID
 */
export const resetFailedLoginAttempts = async (userId: number) => {
  try {
    return await prisma.user.update({
      where: {
        id: userId
      },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null
      }
    });
  } catch (error) {
    securityLogger.error(`Error resetting failed login attempts: ${error}`);
    throw error;
  }
}; 