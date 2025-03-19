"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logFailedLoginAttempt = exports.logLogin = void 0;
exports.logMessage = logMessage;
const db_1 = __importDefault(require("../config/db"));
const encryption_1 = require("./encryption");
const client_1 = require("@prisma/client");
const prismaClient = new client_1.PrismaClient();
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
            read: false
        };
        const message = await prismaClient.message.create({
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
