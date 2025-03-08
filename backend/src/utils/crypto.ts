import crypto from 'crypto';

const algorithm = 'aes-256-gcm';

export const encryptMessage = (text: string, key: string) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    iv: iv.toString('hex'),
    content: encrypted,
    tag: cipher.getAuthTag().toString('hex')
  };
};

export const decryptMessage = (encrypted: { iv: string; content: string; tag: string }, key: string) => {
  const decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(key, 'hex'),
    Buffer.from(encrypted.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(encrypted.tag, 'hex'));
  let decrypted = decipher.update(encrypted.content, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

export const generateRandomKey = (length: number = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

export const hashPassword = (password: string) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

export const generateHMAC = (data: string, key: string) => {
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}; 