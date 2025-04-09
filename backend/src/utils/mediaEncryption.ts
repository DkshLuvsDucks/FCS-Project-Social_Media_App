import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { promisify } from 'util';
import { writeFile, readFile, unlink } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const scrypt = promisify(require('crypto').scrypt);
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

export interface EncryptedMedia {
  encryptedData: Buffer;
  iv: Buffer;
  authTag: Buffer;
  salt: Buffer;
}

export async function encryptMedia(
  mediaBuffer: Buffer,
  senderId: number,
  receiverId: number
): Promise<EncryptedMedia> {
  // Generate a unique salt for this encryption
  const salt = randomBytes(SALT_LENGTH);
  
  // Derive a key using the salt and user IDs
  const key = await scrypt(
    `${senderId}-${receiverId}`,
    salt,
    KEY_LENGTH
  );

  // Generate a random IV
  const iv = randomBytes(IV_LENGTH);

  // Create cipher
  const cipher = createCipheriv(ALGORITHM, key, iv);

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

export async function decryptMedia(
  encryptedMedia: EncryptedMedia,
  senderId: number,
  receiverId: number
): Promise<Buffer> {
  // Derive the key using the salt and user IDs
  const key = await scrypt(
    `${senderId}-${receiverId}`,
    encryptedMedia.salt,
    KEY_LENGTH
  );

  // Create decipher
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    encryptedMedia.iv
  );

  // Set the auth tag
  decipher.setAuthTag(encryptedMedia.authTag);

  // Decrypt the media
  const decryptedData = Buffer.concat([
    decipher.update(encryptedMedia.encryptedData),
    decipher.final()
  ]);

  return decryptedData;
}

export async function saveEncryptedMedia(
  encryptedMedia: EncryptedMedia,
  originalFilename: string
): Promise<string> {
  const uploadDir = path.join(__dirname, '../../uploads/media');
  
  // Make sure the directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const fileExtension = path.extname(originalFilename);
  const uniqueFilename = `${uuidv4()}${fileExtension}`;
  const filePath = path.join(uploadDir, uniqueFilename);

  // Combine all the encrypted data into a single buffer
  const combinedData = Buffer.concat([
    encryptedMedia.salt,
    encryptedMedia.iv,
    encryptedMedia.authTag,
    encryptedMedia.encryptedData
  ]);

  // Save the encrypted data to disk
  await writeFile(filePath, combinedData);

  return uniqueFilename;
}

export async function readEncryptedMedia(
  filename: string
): Promise<EncryptedMedia> {
  const filePath = path.join(__dirname, '../../uploads/media', filename);
  
  // Ensure file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const combinedData = await readFile(filePath);

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

export async function deleteMediaFile(filename: string): Promise<void> {
  const filePath = path.join(__dirname, '../../uploads/media', filename);
  
  try {
    // Check if file exists before attempting to delete
    if (fs.existsSync(filePath)) {
      await unlink(filePath);
      console.log(`Deleted media file: ${filePath}`);
    } else {
      console.log(`File not found, nothing to delete: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error deleting media file ${filename}:`, error);
  }
} 