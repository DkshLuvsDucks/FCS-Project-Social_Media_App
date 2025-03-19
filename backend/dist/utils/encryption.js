"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptMessage = exports.encryptMessage = void 0;
const crypto_1 = __importDefault(require("crypto"));
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
// Derive a key from the master key and user-specific data
const deriveKey = (masterKey, userId, receiverId) => {
    const info = `${userId}-${receiverId}`;
    return crypto_1.default.pbkdf2Sync(masterKey, info, 10000, KEY_LENGTH, 'sha256');
};
const encryptMessage = (content, userId, receiverId, masterKey = process.env.MESSAGE_ENCRYPTION_KEY || 'fallback_key') => {
    const key = deriveKey(masterKey, userId, receiverId);
    const iv = crypto_1.default.randomBytes(IV_LENGTH);
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(content, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();
    const hmac = crypto_1.default.createHmac('sha256', masterKey)
        .update(encrypted + authTag.toString('base64'))
        .digest('hex');
    return {
        encryptedContent: encrypted,
        iv: iv.toString('base64'),
        algorithm: ALGORITHM,
        hmac,
        authTag: authTag.toString('base64')
    };
};
exports.encryptMessage = encryptMessage;
const decryptMessage = (encryptedData, userId, receiverId, masterKey = process.env.MESSAGE_ENCRYPTION_KEY || 'fallback_key') => {
    try {
        const key = deriveKey(masterKey, userId, receiverId);
        const iv = Buffer.from(encryptedData.iv, 'base64');
        // Handle messages with and without auth tag
        let encryptedContent = encryptedData.encryptedContent;
        let authTag;
        if (encryptedData.authTag) {
            // For messages with auth tag
            authTag = Buffer.from(encryptedData.authTag, 'base64');
        }
        else {
            // For legacy messages without auth tag
            // Try to extract auth tag from the end of encrypted content
            try {
                const encryptedContentParts = encryptedData.encryptedContent.split('.');
                if (encryptedContentParts.length === 2) {
                    [encryptedContent, encryptedData.authTag] = encryptedContentParts;
                    authTag = Buffer.from(encryptedData.authTag, 'base64');
                }
            }
            catch (error) {
                console.error('Failed to extract auth tag:', error);
                throw new Error('Invalid message format');
            }
        }
        if (!authTag) {
            throw new Error('No authentication tag found');
        }
        // Verify HMAC
        const calculatedHmac = crypto_1.default.createHmac('sha256', masterKey)
            .update(encryptedContent + authTag.toString('base64'))
            .digest('hex');
        if (calculatedHmac !== encryptedData.hmac) {
            console.error('HMAC mismatch:', {
                calculated: calculatedHmac,
                received: encryptedData.hmac,
                content: encryptedContent
            });
            throw new Error('Message integrity check failed');
        }
        const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedContent, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt message');
    }
};
exports.decryptMessage = decryptMessage;
