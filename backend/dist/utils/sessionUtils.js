"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSessionId = void 0;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Generates a unique session ID.
 * @returns {string} A unique session ID.
 */
const generateSessionId = () => {
    return crypto_1.default.randomBytes(16).toString('hex'); // Generates a random 32-character hex string
};
exports.generateSessionId = generateSessionId;
