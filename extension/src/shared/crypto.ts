// @ts-ignore - argon2.js из @noble/hashes
import { argon2id } from './argon2.js';
import { KdfParams, VaultSecretData } from './types';

const KEY_LENGTH = 32; // 256 бит для AES-256
const IV_LENGTH = 12; // 96 бит для GCM

/**
 * Конвертация base64 в Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Конвертация Uint8Array в base64
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Вычисление passwordVerifier через Argon2id
 */
export async function computePasswordVerifier(
  password: string,
  kdf: KdfParams
): Promise<string> {
  if (!kdf.salt || kdf.salt.length === 0) {
    throw new Error('Salt is required for key derivation');
  }

  const salt = base64ToUint8Array(kdf.salt);
  const passwordBytes = new TextEncoder().encode(password);

  const hashResult = argon2id(passwordBytes, salt, {
    m: kdf.memory, // память в килобайтах (KB)
    t: kdf.iterations, // количество итераций
    p: kdf.parallelism, // параллелизм
    dkLen: KEY_LENGTH, // длина ключа в байтах
  });

  return uint8ArrayToBase64(hashResult);
}

/**
 * Вычисление passwordKey из мастер-пароля через Argon2id
 * Возвращает CryptoKey для использования в Web Crypto API
 */
export async function derivePasswordKey(
  password: string,
  kdf: KdfParams
): Promise<CryptoKey> {
  if (!kdf.salt || kdf.salt.length === 0) {
    throw new Error('Salt is required for key derivation');
  }

  const salt = base64ToUint8Array(kdf.salt);
  const passwordBytes = new TextEncoder().encode(password);

  const hashResult = argon2id(passwordBytes, salt, {
    m: kdf.memory,
    t: kdf.iterations,
    p: kdf.parallelism,
    dkLen: KEY_LENGTH,
  });

  const hashBuffer = new Uint8Array(hashResult).buffer;

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
 * Расшифровка Vault Key с помощью passwordKey
 * VaultKey хранится как зашифрованный JSON объект { key: base64String }
 */
export async function decryptVaultKey(
  vaultKeyEnc: string, // base64
  iv: string, // base64
  passwordKey: CryptoKey
): Promise<CryptoKey> {
  const encryptedData = new Uint8Array(base64ToUint8Array(vaultKeyEnc));
  const ivBytes = new Uint8Array(base64ToUint8Array(iv));

  // Расшифровываем vaultKey (это зашифрованный JSON объект)
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes,
      tagLength: 128, // 128 бит для GCM
    },
    passwordKey,
    encryptedData
  );

  // Парсим JSON (ожидаем { key: string })
  const jsonString = new TextDecoder().decode(decryptedData);
  const vaultKeyData = JSON.parse(jsonString) as { key: string };
  
  if (!vaultKeyData.key) {
    throw new Error('Invalid vault key format: missing key field');
  }

  // Конвертируем base64 строку в Uint8Array
  const vaultKeyBytes = base64ToUint8Array(vaultKeyData.key);

  // Проверяем размер ключа (должен быть 32 байта для AES-256)
  if (vaultKeyBytes.length !== 32) {
    throw new Error(`Invalid vault key length: expected 32 bytes, got ${vaultKeyBytes.length}`);
  }

  // Импортируем расшифрованный ключ как CryptoKey
  // Создаем новый Uint8Array для правильного типа
  const keyBuffer = new Uint8Array(vaultKeyBytes).buffer;
  
  return crypto.subtle.importKey(
    'raw',
    keyBuffer,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Шифрование секретных данных (password, notes) с помощью vaultKey
 */
export async function encryptSecret(
  vaultKey: CryptoKey,
  data: VaultSecretData
): Promise<{ encryptedData: string; iv: string }> {
  const dataJson = JSON.stringify(data);
  const dataBytes = new TextEncoder().encode(dataJson);

  // Генерируем случайный IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Шифруем данные
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    vaultKey,
    dataBytes
  );

  return {
    encryptedData: uint8ArrayToBase64(new Uint8Array(encryptedData)),
    iv: uint8ArrayToBase64(iv),
  };
}

/**
 * Расшифровка секретных данных (password, notes) с помощью vaultKey
 */
export async function decryptSecret(
  vaultKey: CryptoKey,
  encryptedData: string, // base64
  iv: string // base64
): Promise<VaultSecretData> {
  const encryptedBytes = new Uint8Array(base64ToUint8Array(encryptedData));
  const ivBytes = new Uint8Array(base64ToUint8Array(iv));

  // Расшифровываем данные
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes,
    },
    vaultKey,
    encryptedBytes
  );

  // Парсим JSON
  const jsonString = new TextDecoder().decode(decryptedData);
  return JSON.parse(jsonString) as VaultSecretData;
}

/**
 * Извлечение домена из URL
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    // Если URL некорректный, возвращаем как есть
    return url;
  }
}

/**
 * Проверка, соответствует ли домен записи
 */
export function matchesDomain(entryUrl: string | undefined, currentDomain: string): boolean {
  if (!entryUrl) return false;

  try {
    const entryDomain = extractDomain(entryUrl);
    // Точное совпадение
    if (entryDomain === currentDomain) return true;
    
    // Проверка поддоменов (например, mail.google.com соответствует google.com)
    if (entryDomain.endsWith('.' + currentDomain)) return true;
    if (currentDomain.endsWith('.' + entryDomain)) return true;

    return false;
  } catch {
    return false;
  }
}

