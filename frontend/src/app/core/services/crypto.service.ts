import { Injectable } from '@angular/core';
import { argon2id } from '@noble/hashes/argon2.js';
import { KeyDerivationParams } from '@password-manager/shared/types';
import { VaultSecretData } from '../types/vault.types';
import { environment } from '../../../environments/environment';

/**
 * Сервис для криптографических операций
 * Использует Argon2id для KDF и Web Crypto API (SubtleCrypto) для шифрования
 */
@Injectable({
  providedIn: 'root',
})
export class CryptoService {
  private readonly KEY_LENGTH = 32; // 256 бит для AES-256
  private readonly IV_LENGTH = 12; // 96 бит для GCM
  private readonly SALT_LENGTH = 16; // 128 бит

  /**
   * Вычисление ключа из мастер-пароля с использованием Argon2id
   * Возвращает CryptoKey для использования в Web Crypto API
   */
  async deriveKeyFromPassword(
    password: string,
    params: KeyDerivationParams
  ): Promise<CryptoKey> {
    // Проверяем, что salt не пустой
    if (!params.salt || params.salt.length === 0) {
      throw new Error('Salt is required for key derivation');
    }

    const salt = this.base64ToUint8Array(params.salt);

    // Отладочное логирование (только в dev режиме)
    if (!environment.production) {
      console.log('[CRYPTO] Deriving key with Argon2id - salt length:', salt.length, 'memory:', params.memory, 'iterations:', params.iterations);
    }

    // Вычисляем passwordKey через Argon2id используя @noble/hashes
    const passwordBytes = new TextEncoder().encode(password);
    const hashResult = argon2id(passwordBytes, salt, {
      m: params.memory, // память в килобайтах (KB)
      t: params.iterations, // количество итераций
      p: params.parallelism, // параллелизм
      dkLen: this.KEY_LENGTH, // длина ключа в байтах
    });

    // Конвертируем Uint8Array в новый ArrayBuffer для Web Crypto API
    const hashArray = new Uint8Array(hashResult);
    const hashBuffer = hashArray.buffer;

    // Импортируем результат Argon2id как CryptoKey
    return crypto.subtle.importKey(
      'raw',
      hashBuffer,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Вычисление passwordVerifier напрямую через Argon2id
   * Возвращает base64 строку результата Argon2id (для сравнения на сервере)
   */
  async computePasswordVerifier(
    password: string,
    params: KeyDerivationParams
  ): Promise<string> {
    // Проверяем, что salt не пустой
    if (!params.salt || params.salt.length === 0) {
      throw new Error('Salt is required for key derivation');
    }

    const salt = this.base64ToUint8Array(params.salt);

    // Вычисляем passwordVerifier через Argon2id используя @noble/hashes
    const passwordBytes = new TextEncoder().encode(password);
    const hashResult = argon2id(passwordBytes, salt, {
      m: params.memory, // память в килобайтах (KB)
      t: params.iterations, // количество итераций
      p: params.parallelism, // параллелизм
      dkLen: this.KEY_LENGTH, // длина ключа в байтах
    });

    // Возвращаем результат Argon2id в base64
    return this.uint8ArrayToBase64(hashResult);
  }

  /**
   * Генерация случайного ключа (для Vault Key)
   */
  async generateRandomKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true, // extractable для экспорта при необходимости
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Шифрование секретных данных vault entry
   */
  async encryptVaultEntry(
    vaultKey: CryptoKey,
    data: VaultSecretData
  ): Promise<{ iv: string; ciphertext: string }> {
    return this.encryptJson(vaultKey, data);
  }

  /**
   * Расшифровка секретных данных vault entry
   */
  async decryptVaultEntry(
    vaultKey: CryptoKey,
    payload: { iv: string; ciphertext: string }
  ): Promise<VaultSecretData> {
    return this.decryptJson<VaultSecretData>(vaultKey, payload);
  }

  /**
   * Шифрование JSON данных
   */
  async encryptJson<T>(key: CryptoKey, data: T): Promise<{ iv: string; ciphertext: string }> {
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
    const plaintext = new TextEncoder().encode(JSON.stringify(data));
    const plaintextBuffer = plaintext.buffer;

    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128, // 128 бит для GCM
      },
      key,
      plaintextBuffer
    );

    return {
      iv: this.uint8ArrayToBase64(iv),
      ciphertext: this.uint8ArrayToBase64(new Uint8Array(ciphertext)),
    };
  }

  /**
   * Расшифровка JSON данных
   */
  async decryptJson<T>(key: CryptoKey, payload: { iv: string; ciphertext: string }): Promise<T> {
    const ivArray = this.base64ToUint8Array(payload.iv);
    const iv = new Uint8Array(ivArray);
    const ciphertext = this.base64ToUint8Array(payload.ciphertext);
    const ciphertextBuffer = new Uint8Array(ciphertext).buffer;

    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128,
      },
      key,
      ciphertextBuffer
    );

    const jsonString = new TextDecoder().decode(plaintext);
    return JSON.parse(jsonString) as T;
  }

  /**
   * Генерация случайной соли
   */
  generateSalt(): string {
    const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
    return this.uint8ArrayToBase64(salt);
  }

  /**
   * Генерация случайного IV
   */
  generateIV(): string {
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
    return this.uint8ArrayToBase64(iv);
  }

  /**
   * Утилиты для конвертации base64 ↔ Uint8Array
   */
  uint8ArrayToBase64(array: Uint8Array): string {
    return btoa(String.fromCharCode(...array));
  }

  base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Экспорт ключа в base64 (для backup)
   */
  async exportKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('raw', key);
    return this.uint8ArrayToBase64(new Uint8Array(exported));
  }

  /**
   * Импорт ключа из base64
   */
  async importKey(base64Key: string): Promise<CryptoKey> {
    const keyData = this.base64ToUint8Array(base64Key);
    // Создаём новый ArrayBuffer для Web Crypto API
    const keyArray = new Uint8Array(keyData);
    const keyBuffer = keyArray.buffer;
    return crypto.subtle.importKey(
      'raw',
      keyBuffer,
      {
        name: 'AES-GCM',
        length: 256,
      },
      true, // extractable для возможности экспорта в sessionStorage
      ['encrypt', 'decrypt']
    );
  }
}
