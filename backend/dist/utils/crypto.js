"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateHMAC = exports.hashPassword = exports.generateRandomKey = exports.decryptMessage = exports.encryptMessage = void 0;
const crypto_1 = __importDefault(require("crypto"));
const algorithm = 'aes-256-gcm';
const encryptMessage = (text, key) => {
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return {
        iv: iv.toString('hex'),
        content: encrypted,
        tag: cipher.getAuthTag().toString('hex')
    };
};
exports.encryptMessage = encryptMessage;
const decryptMessage = (encrypted, key) => {
    const decipher = crypto_1.default.createDecipheriv(algorithm, Buffer.from(key, 'hex'), Buffer.from(encrypted.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(encrypted.tag, 'hex'));
    let decrypted = decipher.update(encrypted.content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};
exports.decryptMessage = decryptMessage;
const generateRandomKey = (length = 32) => {
    return crypto_1.default.randomBytes(length).toString('hex');
};
exports.generateRandomKey = generateRandomKey;
const hashPassword = (password) => {
    return crypto_1.default.createHash('sha256').update(password).digest('hex');
};
exports.hashPassword = hashPassword;
const generateHMAC = (data, key) => {
    return crypto_1.default.createHmac('sha256', key).update(data).digest('hex');
};
exports.generateHMAC = generateHMAC;
