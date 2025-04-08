"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logFailedLoginAttempt = exports.logLogin = void 0;
exports.logMessage = logMessage;
const db_1 = __importDefault(require("../config/db"));
const encryption_1 = require("./encryption");
const logLogin = async (userId, sessionId, ipAddress, userAgent, deviceFingerprint, geoLocation, successful = true) => {
    return db_1.default.login.create({
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
exports.logLogin = logLogin;
async function logMessage(content, senderId, receiverId) {
    try {
        // Find or create conversation first
        let conversation = await db_1.default.$queryRaw `
      SELECT * FROM Conversation 
      WHERE (user1Id = ${senderId} AND user2Id = ${receiverId})
      OR (user1Id = ${receiverId} AND user2Id = ${senderId})
      LIMIT 1
    `;
        // Extract conversation or create it if it doesn't exist
        if (!Array.isArray(conversation) || conversation.length === 0) {
            // Create new conversation
            conversation = await db_1.default.$executeRaw `
        INSERT INTO Conversation (user1Id, user2Id, createdAt, updatedAt)
        VALUES (${senderId}, ${receiverId}, NOW(), NOW())
      `;
            // Get the newly created conversation
            conversation = await db_1.default.$queryRaw `
        SELECT * FROM Conversation 
        WHERE (user1Id = ${senderId} AND user2Id = ${receiverId})
        OR (user1Id = ${receiverId} AND user2Id = ${senderId})
        ORDER BY id DESC LIMIT 1
      `;
        }
        // Ensure conversation is an array and has at least one element
        const conversationData = Array.isArray(conversation) ? conversation[0] : conversation;
        const conversationId = conversationData === null || conversationData === void 0 ? void 0 : conversationData.id;
        if (!conversationId) {
            throw new Error('Failed to create or find conversation');
        }
        const encrypted = await (0, encryption_1.encryptMessage)(content, senderId, receiverId);
        const messageData = {
            encryptedContent: encrypted.encryptedContent,
            iv: encrypted.iv,
            algorithm: encrypted.algorithm,
            hmac: encrypted.hmac,
            authTag: encrypted.authTag,
            content: content, // Store both encrypted and plain content
            senderId: senderId,
            receiverId: receiverId,
            conversationId: conversationId,
            read: false
        };
        const message = await db_1.default.message.create({
            data: messageData
        });
        return message;
    }
    catch (error) {
        console.error('Error logging message:', error);
        throw error;
    }
}
const logFailedLoginAttempt = async (userId) => {
    const user = await db_1.default.user.findUnique({
        where: { id: userId }
    });
    if (!user)
        return null;
    const failedAttempts = user.failedLoginAttempts + 1;
    // Lock account after 5 failed attempts
    const lockedUntil = failedAttempts >= 5
        ? new Date(Date.now() + 30 * 60 * 1000) // Lock for 30 minutes
        : null;
    return db_1.default.user.update({
        where: { id: userId },
        data: {
            failedLoginAttempts: failedAttempts,
            lockedUntil
        }
    });
};
exports.logFailedLoginAttempt = logFailedLoginAttempt;
