import crypto from 'crypto';

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
export const encryptProductData = (
  content: string,
  productId: number,
  userId: number,
  masterKey: string = process.env.PRODUCT_ENCRYPTION_KEY || 'product_encryption_fallback_key'
) => {
  // Derive a key using product and user IDs
  const info = `${productId}-${userId}`;
  const key = crypto.pbkdf2Sync(
    masterKey,
    info,
    10000,
    KEY_LENGTH,
    'sha256'
  );

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(content, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  // Create HMAC for integrity verification
  const hmac = crypto.createHmac('sha256', masterKey)
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

/**
 * Decrypts sensitive product information
 * @param encryptedData Encrypted data object containing all necessary components
 * @param productId Product ID used as part of the encryption key
 * @param userId User ID used as part of the encryption key
 * @param masterKey Master encryption key
 * @returns Decrypted content as string
 */
export const decryptProductData = (
  encryptedData: {
    encryptedContent: string;
    iv: string;
    algorithm: string;
    hmac: string;
    authTag: string;
  },
  productId: number,
  userId: number,
  masterKey: string = process.env.PRODUCT_ENCRYPTION_KEY || 'product_encryption_fallback_key'
) => {
  try {
    // Derive the same key using product and user IDs
    const info = `${productId}-${userId}`;
    const key = crypto.pbkdf2Sync(
      masterKey,
      info,
      10000,
      KEY_LENGTH,
      'sha256'
    );

    const iv = Buffer.from(encryptedData.iv, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');

    // Verify HMAC for integrity
    const calculatedHmac = crypto.createHmac('sha256', masterKey)
      .update(encryptedData.encryptedContent + encryptedData.authTag)
      .digest('hex');

    if (calculatedHmac !== encryptedData.hmac) {
      throw new Error('Data integrity check failed');
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData.encryptedContent, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt product data');
  }
};

/**
 * Encrypt sensitive information in a product object
 * @param product Product object with sensitive data
 * @param userId User ID for encryption context
 * @returns Product with encrypted sensitive fields
 */
export const encryptProductSensitiveInfo = (
  product: any, 
  userId: number
) => {
  if (!product) return product;
  
  const productId = product.id;
  
  // Create a copy to avoid modifying the original
  const result = { ...product };
  
  // Encrypt payment information if present
  if (product.paymentInfo) {
    result.paymentInfo = encryptProductData(
      JSON.stringify(product.paymentInfo),
      productId,
      userId
    );
  }
  
  // Encrypt contact information for privacy
  if (product.contactInfo) {
    result.contactInfo = encryptProductData(
      JSON.stringify(product.contactInfo),
      productId,
      userId
    );
  }
  
  return result;
};

/**
 * Decrypt sensitive information in a product object
 * @param product Product object with encrypted sensitive data
 * @param userId User ID for decryption context
 * @returns Product with decrypted sensitive fields
 */
export const decryptProductSensitiveInfo = (
  product: any,
  userId: number
) => {
  if (!product) return product;
  
  const productId = product.id;
  const result = { ...product };
  
  // Decrypt payment information if present
  if (product.paymentInfo && typeof product.paymentInfo === 'object') {
    try {
      result.paymentInfo = JSON.parse(
        decryptProductData(product.paymentInfo, productId, userId)
      );
    } catch (error) {
      console.error('Failed to decrypt payment info:', error);
    }
  }
  
  // Decrypt contact information if present
  if (product.contactInfo && typeof product.contactInfo === 'object') {
    try {
      result.contactInfo = JSON.parse(
        decryptProductData(product.contactInfo, productId, userId)
      );
    } catch (error) {
      console.error('Failed to decrypt contact info:', error);
    }
  }
  
  return result;
};

/**
 * Encrypt sensitive transaction data
 * @param transaction Transaction data to encrypt
 * @param orderId Order ID for encryption context
 * @param userId User ID for encryption context
 * @returns Encrypted transaction data
 */
export const encryptTransactionData = (
  transaction: any,
  orderId: number,
  userId: number
) => {
  if (!transaction) return transaction;
  
  return encryptProductData(
    JSON.stringify(transaction),
    orderId, // Using orderId instead of productId for transaction context
    userId
  );
};

/**
 * Decrypt sensitive transaction data
 * @param encryptedTransaction Encrypted transaction data
 * @param orderId Order ID for decryption context
 * @param userId User ID for decryption context
 * @returns Decrypted transaction data
 */
export const decryptTransactionData = (
  encryptedTransaction: any,
  orderId: number,
  userId: number
) => {
  if (!encryptedTransaction) return encryptedTransaction;
  
  try {
    return JSON.parse(
      decryptProductData(encryptedTransaction, orderId, userId)
    );
  } catch (error) {
    console.error('Failed to decrypt transaction data:', error);
    return null;
  }
}; 