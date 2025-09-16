import CryptoJS from 'crypto-js';

export class MessageCrypto {
  /**
   * Encrypt a message using AES encryption
   * @param {string} message - The plain text message
   * @param {string} secretKey - The secret key for encryption
   * @returns {string} - Encrypted message
   */
  static encrypt(message, secretKey) {
    try {
      const encrypted = CryptoJS.AES.encrypt(message, secretKey).toString();
      return encrypted;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt a message using AES decryption
   * @param {string} encryptedMessage - The encrypted message
   * @param {string} secretKey - The secret key for decryption
   * @returns {string} - Decrypted message
   */
  static decrypt(encryptedMessage, secretKey) {
    try {
      const decryptedBytes = CryptoJS.AES.decrypt(encryptedMessage, secretKey);
      const decryptedMessage = decryptedBytes.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedMessage) {
        throw new Error('Invalid secret key or corrupted message');
      }
      
      return decryptedMessage;
    } catch (error) {
      return `[DECRYPTION FAILED: ${error.message}]`;
    }
  }

  /**
   * Generate a random secret code
   * @param {number} length - Length of the secret code
   * @returns {string} - Random secret code
   */
  static generateSecretCode(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Validate secret code format
   * @param {string} secretCode - The secret code to validate
   * @returns {boolean} - True if valid
   */
  static isValidSecretCode(secretCode) {
    return typeof secretCode === 'string' && secretCode.length >= 8;
  }
}