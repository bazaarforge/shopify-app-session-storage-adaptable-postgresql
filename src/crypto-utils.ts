import crypto from 'crypto';

export interface Encryptor {
  encrypt(data: string | Buffer): string
  decrypt(encryptedData: string): string
}

export interface EncryptionConfig {
  key: string;
  algorithm?: string;
  ivLength?: number;
  authTagLength?: number;
}

export class NoEncryption implements Encryptor {
  public  encrypt(data: string | Buffer): string {
    if (!data) {
      throw new Error('Data is required');
    }

    return typeof data === 'string' ? data : data.toString();
  }

  public decrypt(encryptedData: string): string {
    if (!encryptedData) {
      throw new Error('Encrypted data is required');
    }

    return encryptedData;
  }
}

export class SymmetricEncryptor implements Encryptor {
  private readonly key: Buffer;
  private readonly algorithm: string;
  private readonly ivLength: number;
  private readonly authTagLength: number;

  constructor(config: EncryptionConfig) {
    if (!config.key) {
      throw new Error('Encryption key is required');
    }

    this.key = Buffer.from(config.key, 'hex');
    this.algorithm = config.algorithm || 'aes-256-gcm';
    this.ivLength = config.ivLength || 12;       // 96 bits for GCM
    this.authTagLength = config.authTagLength || 16;  // 128 bits

    // Validate key length
    if (this.key.length !== 32) {  // 256 bits
      throw new Error('Invalid key length. Expected 32 bytes (256 bits)');
    }
  }

  /**
   * Encrypts sensitive data
   * @param data - Data to encrypt
   * @returns Encrypted data as base64 string
   * @throws Error if encryption fails
   */
  public encrypt(data: string | Buffer): string {
    try {
      if (!data) {
        throw new Error('Data is required');
      }

      // Generate a new IV for each encryption
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(
        this.algorithm,
        this.key,
        iv
      ) as crypto.CipherGCM;

      // Encrypt the data
      const encrypted = Buffer.concat([
        cipher.update(typeof data === 'string' ? data : Buffer.from(data)),
        cipher.final()
      ]);

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      // Combine IV, auth tag, and encrypted data
      return Buffer.concat([
        iv,
        authTag,
        encrypted
      ]).toString('base64');

    } catch (error) {
      // Log error securely (without exposing sensitive data)
      console.error('Encryption error:', error instanceof Error ? error.message : 'Unknown error');
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypts encrypted data
   * @param encryptedData - Base64 encoded encrypted data
   * @returns Decrypted data as string
   * @throws Error if decryption fails
   */
  public decrypt(encryptedData: string): string {
    try {
      if (!encryptedData) {
        throw new Error('Encrypted data is required');
      }

      // Convert from base64 and extract components
      const buffer = Buffer.from(encryptedData, 'base64');

      // Extract the pieces using subarray instead of slice
      const iv = buffer.subarray(0, this.ivLength);
      const authTag = buffer.subarray(
        this.ivLength,
        this.ivLength + this.authTagLength
      );
      const encrypted = buffer.subarray(this.ivLength + this.authTagLength);


      // Create decipher
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.key,
        iv
      ) as crypto.DecipherGCM;
      ;

      // Set auth tag
      decipher.setAuthTag(authTag);

      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      console.error('Decryption error:', error instanceof Error ? error.message : 'Unknown error');
      throw new Error('Decryption failed');
    }
  }
}

