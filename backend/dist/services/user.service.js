"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetFailedLoginAttempts = exports.updateFailedLoginAttempts = exports.createUser = exports.findUserByEmail = exports.findUserByUsername = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient({
    log: [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' }
    ]
});
// Set up Prisma event listeners for security monitoring
prisma.$on('warn', (e) => {
    logger_1.securityLogger.warn(`Prisma Warning: ${e.message}`);
});
prisma.$on('error', (e) => {
    logger_1.securityLogger.error(`Prisma Error: ${e.message}`);
});
/**
 * Find a user by username
 * @param username - The username to search for
 * @returns The user object or null if not found
 */
const findUserByUsername = async (username) => {
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
    }
    catch (error) {
        logger_1.securityLogger.error(`Error finding user by username: ${error}`);
        throw error;
    }
};
exports.findUserByUsername = findUserByUsername;
/**
 * Find a user by email
 * @param email - The email to search for
 * @returns The user object or null if not found
 */
const findUserByEmail = async (email) => {
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
    }
    catch (error) {
        logger_1.securityLogger.error(`Error finding user by email: ${error}`);
        throw error;
    }
};
exports.findUserByEmail = findUserByEmail;
/**
 * Create a new user with secure password hashing
 * @param userData - User data including email, username, and password
 * @returns The created user object
 */
const createUser = async (userData) => {
    try {
        // Hash password with bcrypt
        const passwordHash = await bcryptjs_1.default.hash(userData.password, 12);
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
    }
    catch (error) {
        logger_1.securityLogger.error(`Error creating user: ${error}`);
        throw error;
    }
};
exports.createUser = createUser;
/**
 * Update user's failed login attempts
 * @param userId - The user's ID
 * @param attempts - The number of failed attempts
 * @param lockUntil - Optional date until account is locked
 */
const updateFailedLoginAttempts = async (userId, attempts, lockUntil) => {
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
    }
    catch (error) {
        logger_1.securityLogger.error(`Error updating failed login attempts: ${error}`);
        throw error;
    }
};
exports.updateFailedLoginAttempts = updateFailedLoginAttempts;
/**
 * Reset failed login attempts for a user
 * @param userId - The user's ID
 */
const resetFailedLoginAttempts = async (userId) => {
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
    }
    catch (error) {
        logger_1.securityLogger.error(`Error resetting failed login attempts: ${error}`);
        throw error;
    }
};
exports.resetFailedLoginAttempts = resetFailedLoginAttempts;
