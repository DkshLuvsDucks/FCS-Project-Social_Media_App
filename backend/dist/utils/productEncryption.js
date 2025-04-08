"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptTransactionData = exports.encryptTransactionData = exports.decryptProductSensitiveInfo = exports.encryptProductSensitiveInfo = exports.decryptProductData = exports.encryptProductData = void 0;
const crypto_1 = __importDefault(require("crypto"));
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
/**
 * Encrypts sensitive product information like transaction details
 * @param content Data to encrypt
 * @param productId Product ID to use as part of the encryption key
 * @param userId User ID to use as part of the encryption key
 * @param masterKey Master encryption key
 * @returns Encrypted data object with necessary components for decryption
 */
const encryptProductData = (content, productId, userId, masterKey = process.env.PRODUCT_ENCRYPTION_KEY || 'product_encryption_fallback_key') => {
    // Derive a key using product and user IDs
    const info = `${productId}-${userId}`;
    const key = crypto_1.default.pbkdf2Sync(masterKey, info, 10000, KEY_LENGTH, 'sha256');
    const iv = crypto_1.default.randomBytes(IV_LENGTH);
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(content, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();
    // Create HMAC for integrity verification
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
exports.encryptProductData = encryptProductData;
/**
 * Decrypts sensitive product information
 * @param encryptedData Encrypted data object containing all necessary components
 * @param productId Product ID used as part of the encryption key
 * @param userId User ID used as part of the encryption key
 * @param masterKey Master encryption key
 * @returns Decrypted content as string
 */
const decryptProductData = (encryptedData, productId, userId, masterKey = process.env.PRODUCT_ENCRYPTION_KEY || 'product_encryption_fallback_key') => {
    try {
        // Derive the same key using product and user IDs
        const info = `${productId}-${userId}`;
        const key = crypto_1.default.pbkdf2Sync(masterKey, info, 10000, KEY_LENGTH, 'sha256');
        const iv = Buffer.from(encryptedData.iv, 'base64');
        const authTag = Buffer.from(encryptedData.authTag, 'base64');
        // Verify HMAC for integrity
        const calculatedHmac = crypto_1.default.createHmac('sha256', masterKey)
            .update(encryptedData.encryptedContent + encryptedData.authTag)
            .digest('hex');
        if (calculatedHmac !== encryptedData.hmac) {
            throw new Error('Data integrity check failed');
        }
        const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedData.encryptedContent, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt product data');
    }
};
exports.decryptProductData = decryptProductData;
/**
 * Encrypt sensitive information in a product object
 * @param product Product object with sensitive data
 * @param userId User ID for encryption context
 * @returns Product with encrypted sensitive fields
 */
const encryptProductSensitiveInfo = (product, userId) => {
    if (!product)
        return product;
    const productId = product.id;
    // Create a copy to avoid modifying the original
    const result = Object.assign({}, product);
    // Encrypt payment information if present
    if (product.paymentInfo) {
        result.paymentInfo = (0, exports.encryptProductData)(JSON.stringify(product.paymentInfo), productId, userId);
    }
    // Encrypt contact information for privacy
    if (product.contactInfo) {
        result.contactInfo = (0, exports.encryptProductData)(JSON.stringify(product.contactInfo), productId, userId);
    }
    return result;
};
exports.encryptProductSensitiveInfo = encryptProductSensitiveInfo;
/**
 * Decrypt sensitive information in a product object
 * @param product Product object with encrypted sensitive data
 * @param userId User ID for decryption context
 * @returns Product with decrypted sensitive fields
 */
const decryptProductSensitiveInfo = (product, userId) => {
    if (!product)
        return product;
    const productId = product.id;
    const result = Object.assign({}, product);
    // Decrypt payment information if present
    if (product.paymentInfo && typeof product.paymentInfo === 'object') {
        try {
            result.paymentInfo = JSON.parse((0, exports.decryptProductData)(product.paymentInfo, productId, userId));
        }
        catch (error) {
            console.error('Failed to decrypt payment info:', error);
        }
    }
    // Decrypt contact information if present
    if (product.contactInfo && typeof product.contactInfo === 'object') {
        try {
            result.contactInfo = JSON.parse((0, exports.decryptProductData)(product.contactInfo, productId, userId));
        }
        catch (error) {
            console.error('Failed to decrypt contact info:', error);
        }
    }
    return result;
};
exports.decryptProductSensitiveInfo = decryptProductSensitiveInfo;
/**
 * Encrypt sensitive transaction data
 * @param transaction Transaction data to encrypt
 * @param orderId Order ID for encryption context
 * @param userId User ID for encryption context
 * @returns Encrypted transaction data
 */
const encryptTransactionData = (transaction, orderId, userId) => {
    if (!transaction)
        return transaction;
    return (0, exports.encryptProductData)(JSON.stringify(transaction), orderId, // Using orderId instead of productId for transaction context
    userId);
};
exports.encryptTransactionData = encryptTransactionData;
/**
 * Decrypt sensitive transaction data
 * @param encryptedTransaction Encrypted transaction data
 * @param orderId Order ID for decryption context
 * @param userId User ID for decryption context
 * @returns Decrypted transaction data
 */
const decryptTransactionData = (encryptedTransaction, orderId, userId) => {
    if (!encryptedTransaction)
        return encryptedTransaction;
    try {
        return JSON.parse((0, exports.decryptProductData)(encryptedTransaction, orderId, userId));
    }
    catch (error) {
        console.error('Failed to decrypt transaction data:', error);
        return null;
    }
};
exports.decryptTransactionData = decryptTransactionData;
