import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { authenticator, totp } from 'otplib';
import { config } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Сервис для работы с TOTP (Time-based One-Time Password)
 */
export class TotpService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 32 байта для AES-256
  private readonly ivLength = 12; // 12 байт для GCM

  /**
   * Получить ключ шифрования из конфигурации
   */
  private getEncryptionKey(): Buffer {
    const keyBase64 = config.totp.encKey;
    const key = Buffer.from(keyBase64, 'base64');
    
    if (key.length !== this.keyLength) {
      throw new Error(`TOTP encryption key must be ${this.keyLength} bytes (${this.keyLength * 2} hex chars)`);
    }
    
    return key;
  }

  /**
   * Шифрование TOTP секрета
   * Возвращает encrypted data (с authTag) и IV отдельно
   */
  encryptSecret(rawSecret: Buffer): { encrypted: string; iv: string } {
    try {
      const key = this.getEncryptionKey();
      const iv = randomBytes(this.ivLength);
      
      const cipher = createCipheriv(this.algorithm, key, iv);
      
      let encrypted = cipher.update(rawSecret);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      const authTag = cipher.getAuthTag();
      
      // Объединяем encrypted + authTag для хранения
      const combined = Buffer.concat([encrypted, authTag]);
      
      return {
        encrypted: combined.toString('base64'),
        iv: iv.toString('base64'),
      };
    } catch (error) {
      logger.error('TOTP secret encryption error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to encrypt TOTP secret');
    }
  }

  /**
   * Расшифровка TOTP секрета
   */
  decryptSecret(encrypted: string, iv: string): Buffer {
    try {
      const key = this.getEncryptionKey();
      const ivBuffer = Buffer.from(iv, 'base64');
      const encryptedBuffer = Buffer.from(encrypted, 'base64');
      
      // Разделяем encrypted и authTag
      const authTagLength = 16; // GCM auth tag всегда 16 байт
      const encryptedData = encryptedBuffer.subarray(0, encryptedBuffer.length - authTagLength);
      const authTag = encryptedBuffer.subarray(encryptedBuffer.length - authTagLength);
      
      const decipher = createDecipheriv(this.algorithm, key, ivBuffer);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptedData);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted;
    } catch (error) {
      logger.error('TOTP secret decryption error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to decrypt TOTP secret');
    }
  }

  /**
   * Генерация нового TOTP секрета
   */
  generateSecret(): Buffer {
    return randomBytes(20); // 20 байт = 160 бит (рекомендуется для TOTP)
  }

  /**
   * Конвертация секрета в base32 (для отображения пользователю)
   */
  secretToBase32(secret: Buffer): string {
    return authenticator.encode(secret);
  }

  /**
   * Генерация otpauth:// URI для QR-кода
   */
  generateOtpAuthUrl(email: string, secretBase32: string): string {
    const appName = config.totp.appName;
    const encodedAppName = encodeURIComponent(appName);
    const encodedEmail = encodeURIComponent(email);
    
    return `otpauth://totp/${encodedAppName}:${encodedEmail}?secret=${secretBase32}&issuer=${encodedAppName}&algorithm=SHA1&digits=6&period=30`;
  }

  /**
   * Проверка TOTP кода
   * @param secret - расшифрованный секрет (Buffer)
   * @param code - код от пользователя (строка из 6 цифр)
   * @param window - окно времени (±1 шаг = 90 секунд)
   */
  verifyCode(secret: Buffer, code: string, window: number = 1): boolean {
    try {
      // Конвертируем Buffer в base32 для otplib
      const secretBase32 = this.secretToBase32(secret);
      
      // Проверяем код с окном времени
      return authenticator.check(code, secretBase32, {
        window: [window, window], // [-window, +window] шагов
      });
    } catch (error) {
      logger.error('TOTP code verification error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Генерация TOTP кода (для тестирования)
   */
  generateCode(secret: Buffer): string {
    const secretBase32 = this.secretToBase32(secret);
    return authenticator.generate(secretBase32);
  }
}

