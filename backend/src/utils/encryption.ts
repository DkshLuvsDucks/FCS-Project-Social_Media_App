import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

// Derive a key from the master key and user-specific data
const deriveKey = (masterKey: string, userId: number, receiverId: number) => {
  const info = `${userId}-${receiverId}`;
  return crypto.pbkdf2Sync(
    masterKey,
    info,
    10000,
    KEY_LENGTH,
    'sha256'
  );
};

export const encryptMessage = (
  content: string,
  userId: number,
  receiverId: number,
  masterKey: string = process.env.MESSAGE_ENCRYPTION_KEY || 'fallback_key'
) => {
  const key = deriveKey(masterKey, userId, receiverId);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encryptedContent = cipher.update(content, 'utf8', 'base64');
  encryptedContent += cipher.final('base64');

  const authTag = cipher.getAuthTag();
  const hmac = crypto.createHmac('sha256', masterKey)
    .update(encryptedContent)
    .digest('hex');

  return {
    encryptedContent: encryptedContent + authTag.toString('base64'),
    iv: iv.toString('base64'),
    algorithm: ALGORITHM,
    hmac
  };
};

export const decryptMessage = (
  encryptedData: {
    encryptedContent: string,
    iv: string,
    algorithm: string,
    hmac: string
  },
  userId: number,
  receiverId: number,
  masterKey: string = process.env.MESSAGE_ENCRYPTION_KEY || 'fallback_key'
) => {
  // Verify HMAC first
  const calculatedHmac = crypto.createHmac('sha256', masterKey)
    .update(encryptedData.encryptedContent)
    .digest('hex');

  if (calculatedHmac !== encryptedData.hmac) {
    throw new Error('Message integrity check failed');
  }

  const key = deriveKey(masterKey, userId, receiverId);
  const iv = Buffer.from(encryptedData.iv, 'base64');
  
  // Split encrypted content and auth tag
  const encryptedContentLength = encryptedData.encryptedContent.length - (AUTH_TAG_LENGTH * 4/3);
  const encryptedContent = encryptedData.encryptedContent.slice(0, encryptedContentLength);
  const authTag = Buffer.from(
    encryptedData.encryptedContent.slice(encryptedContentLength),
    'base64'
  );

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedContent, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}; 