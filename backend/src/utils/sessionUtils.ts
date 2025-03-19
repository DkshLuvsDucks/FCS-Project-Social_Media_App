import crypto from 'crypto';

/**
 * Generates a unique session ID.
 * @returns {string} A unique session ID.
 */
export const generateSessionId = (): string => {
  return crypto.randomBytes(16).toString('hex'); // Generates a random 32-character hex string
};