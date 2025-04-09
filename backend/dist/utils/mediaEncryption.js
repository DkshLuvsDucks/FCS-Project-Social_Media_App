"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptMedia = encryptMedia;
exports.decryptMedia = decryptMedia;
exports.saveEncryptedMedia = saveEncryptedMedia;
exports.readEncryptedMedia = readEncryptedMedia;
exports.deleteMediaFile = deleteMediaFile;
const crypto_1 = require("crypto");
const util_1 = require("util");
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
const scrypt = (0, util_1.promisify)(require('crypto').scrypt);
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
async function encryptMedia(mediaBuffer, senderId, receiverId) {
    // Generate a unique salt for this encryption
    const salt = (0, crypto_1.randomBytes)(SALT_LENGTH);
    // Derive a key using the salt and user IDs
    const key = await scrypt(`${senderId}-${receiverId}`, salt, KEY_LENGTH);
    // Generate a random IV
    const iv = (0, crypto_1.randomBytes)(IV_LENGTH);
    // Create cipher
    const cipher = (0, crypto_1.createCipheriv)(ALGORITHM, key, iv);
    // Encrypt the media
    const encryptedData = Buffer.concat([
        cipher.update(mediaBuffer),
        cipher.final()
    ]);
    // Get the auth tag
    const authTag = cipher.getAuthTag();
    return {
        encryptedData,
        iv,
        authTag,
        salt
    };
}
async function decryptMedia(encryptedMedia, senderId, receiverId) {
    // Derive the key using the salt and user IDs
    const key = await scrypt(`${senderId}-${receiverId}`, encryptedMedia.salt, KEY_LENGTH);
    // Create decipher
    const decipher = (0, crypto_1.createDecipheriv)(ALGORITHM, key, encryptedMedia.iv);
    // Set the auth tag
    decipher.setAuthTag(encryptedMedia.authTag);
    // Decrypt the media
    const decryptedData = Buffer.concat([
        decipher.update(encryptedMedia.encryptedData),
        decipher.final()
    ]);
    return decryptedData;
}
async function saveEncryptedMedia(encryptedMedia, originalFilename) {
    const uploadDir = path_1.default.join(__dirname, '../../uploads/media');
    // Make sure the directory exists
    if (!fs_1.default.existsSync(uploadDir)) {
        fs_1.default.mkdirSync(uploadDir, { recursive: true });
    }
    const fileExtension = path_1.default.extname(originalFilename);
    const uniqueFilename = `${(0, uuid_1.v4)()}${fileExtension}`;
    const filePath = path_1.default.join(uploadDir, uniqueFilename);
    // Combine all the encrypted data into a single buffer
    const combinedData = Buffer.concat([
        encryptedMedia.salt,
        encryptedMedia.iv,
        encryptedMedia.authTag,
        encryptedMedia.encryptedData
    ]);
    // Save the encrypted data to disk
    await (0, promises_1.writeFile)(filePath, combinedData);
    return uniqueFilename;
}
async function readEncryptedMedia(filename) {
    const filePath = path_1.default.join(__dirname, '../../uploads/media', filename);
    // Ensure file exists
    if (!fs_1.default.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    const combinedData = await (0, promises_1.readFile)(filePath);
    // Extract the components from the combined data
    const salt = combinedData.slice(0, SALT_LENGTH);
    const iv = combinedData.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combinedData.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encryptedData = combinedData.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    return {
        salt,
        iv,
        authTag,
        encryptedData
    };
}
async function deleteMediaFile(filename) {
    const filePath = path_1.default.join(__dirname, '../../uploads/media', filename);
    try {
        // Check if file exists before attempting to delete
        if (fs_1.default.existsSync(filePath)) {
            await (0, promises_1.unlink)(filePath);
            console.log(`Deleted media file: ${filePath}`);
        }
        else {
            console.log(`File not found, nothing to delete: ${filePath}`);
        }
    }
    catch (error) {
        console.error(`Error deleting media file ${filename}:`, error);
    }
}
