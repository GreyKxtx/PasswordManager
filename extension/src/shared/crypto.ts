// @ts-ignore - argon2.js из @noble/hashes
import { argon2id } from './argon2.js';
import { KdfParams, VaultSecretData } from './types';

const KEY_LENGTH = 32; // 256 бит для AES-256
const IV_LENGTH = 12; // 96 бит для GCM

/**
 * Конвертация base64 в Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  // Проверяем входные данные
  if (base64 === null || base64 === undefined) {
    throw new Error(`Invalid base64 input: null or undefined. Type: ${typeof base64}`);
  }

  if (typeof base64 !== 'string') {
    throw new Error(`Invalid base64 input: expected string, got ${typeof base64}. Value: ${String(base64).substring(0, 100)}`);
  }

  if (base64.length === 0) {
    throw new Error('Invalid base64 input: empty string');
  }

  // Удаляем пробелы и переносы строк
  const cleaned = base64.trim().replace(/\s/g, '');

  // Проверяем, что строка не пустая после очистки
  if (cleaned.length === 0) {
    throw new Error(`Invalid base64 input: empty string after cleaning. Original length: ${base64.length}, original preview: ${base64.substring(0, 50)}`);
  }

  // Проверяем базовую валидность base64 (только символы A-Z, a-z, 0-9, +, /, =)
  // Base64 может содержать только эти символы и максимум 2 знака = в конце
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(cleaned)) {
    // Находим первый невалидный символ
    const invalidCharIndex = cleaned.split('').findIndex(c => !/[A-Za-z0-9+/=]/.test(c));
    const invalidChar = invalidCharIndex >= 0 ? cleaned[invalidCharIndex] : 'unknown';
    const invalidCharCode = invalidCharIndex >= 0 ? cleaned.charCodeAt(invalidCharIndex) : -1;
    
    throw new Error(
      `Invalid base64 string: contains invalid character "${invalidChar}" (code ${invalidCharCode}) at position ${invalidCharIndex}. ` +
      `Input length: ${cleaned.length}, preview: ${cleaned.substring(0, 100)}`
    );
  }

  // Проверяем длину (base64 строка должна быть кратной 4 после padding)
  const paddingLength = (cleaned.match(/=/g) || []).length;
  if (paddingLength > 2) {
    throw new Error(`Invalid base64 string: too many padding characters (${paddingLength}). Max allowed: 2`);
  }

  try {
    const binaryString = atob(cleaned);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    // Создаем новый ArrayBuffer и копируем данные для правильной типизации
    const buffer = new ArrayBuffer(bytes.length);
    const result = new Uint8Array(buffer);
    result.set(bytes);
    return result;
  } catch (error) {
    // Детальная информация об ошибке
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const firstInvalidIndex = cleaned.split('').findIndex((c, i) => {
      try {
        // Пробуем декодировать до этого символа
        atob(cleaned.substring(0, i + 1));
        return false;
      } catch {
        return true;
      }
    });
    
    throw new Error(
      `Failed to decode base64 string: ${errorMessage}. ` +
      `Input length: ${cleaned.length}, ` +
      `First invalid position: ${firstInvalidIndex >= 0 ? firstInvalidIndex : 'unknown'}, ` +
      `Preview: ${cleaned.substring(0, 100)}`
    );
  }
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

  let salt: Uint8Array;
  try {
    salt = base64ToUint8Array(kdf.salt);
  } catch (error) {
    throw new Error(`Failed to decode salt: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
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

  let salt: Uint8Array;
  try {
    salt = base64ToUint8Array(kdf.salt);
  } catch (error) {
    throw new Error(`Failed to decode salt: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
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
  // Проверяем входные данные
  if (!vaultKeyEnc || typeof vaultKeyEnc !== 'string') {
    throw new Error('Invalid vaultKeyEnc: must be a non-empty string');
  }
  if (!iv || typeof iv !== 'string') {
    throw new Error('Invalid iv: must be a non-empty string');
  }

  console.log('[CRYPTO] decryptVaultKey called:', {
    vaultKeyEncType: typeof vaultKeyEnc,
    ivType: typeof iv,
    vaultKeyEncLength: vaultKeyEnc?.length || 0,
    ivLength: iv?.length || 0,
    vaultKeyEncPreview: String(vaultKeyEnc).substring(0, 100),
    ivPreview: String(iv).substring(0, 100),
    vaultKeyEncFirstChars: String(vaultKeyEnc).split('').slice(0, 30).map(c => `${c}(${c.charCodeAt(0)})`).join(' '),
    ivFirstChars: String(iv).split('').slice(0, 30).map(c => `${c}(${c.charCodeAt(0)})`).join(' '),
  });

  // Проверяем, что строки не пустые после очистки
  const cleanedVaultKeyEnc = vaultKeyEnc.trim().replace(/\s/g, '');
  const cleanedIV = iv.trim().replace(/\s/g, '');

  if (cleanedVaultKeyEnc.length === 0) {
    throw new Error('Invalid vaultKeyEnc: empty string after cleaning');
  }
  if (cleanedIV.length === 0) {
    throw new Error('Invalid iv: empty string after cleaning');
  }

  let encryptedData: Uint8Array;
  let ivBytes: Uint8Array;

  try {
    console.log('[CRYPTO] Decoding vaultKeyEnc...');
    encryptedData = base64ToUint8Array(cleanedVaultKeyEnc);
    console.log('[CRYPTO] vaultKeyEnc decoded successfully, length:', encryptedData.length);
  } catch (error) {
    console.error('[CRYPTO] Failed to decode vaultKeyEnc:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      inputLength: cleanedVaultKeyEnc.length,
      inputPreview: cleanedVaultKeyEnc.substring(0, 100),
    });
    throw new Error(`Failed to decode vaultKeyEnc: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  try {
    console.log('[CRYPTO] Decoding iv...');
    ivBytes = base64ToUint8Array(cleanedIV);
    console.log('[CRYPTO] iv decoded successfully, length:', ivBytes.length);
  } catch (error) {
    console.error('[CRYPTO] Failed to decode iv:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      inputLength: cleanedIV.length,
      inputPreview: cleanedIV.substring(0, 100),
    });
    throw new Error(`Failed to decode iv: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Расшифровываем vaultKey (это зашифрованный JSON объект)
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      // @ts-expect-error - TypeScript strict typing issue with Uint8Array in Web Crypto API
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
  // Проверяем входные данные
  if (!encryptedData || typeof encryptedData !== 'string') {
    throw new Error('Invalid encryptedData: must be a non-empty string');
  }
  if (!iv || typeof iv !== 'string') {
    throw new Error('Invalid iv: must be a non-empty string');
  }

  let encryptedBytes: Uint8Array;
  let ivBytes: Uint8Array;

  try {
    encryptedBytes = base64ToUint8Array(encryptedData);
  } catch (error) {
    throw new Error(`Failed to decode encryptedData: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  try {
    ivBytes = base64ToUint8Array(iv);
  } catch (error) {
    throw new Error(`Failed to decode iv: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Расшифровываем данные
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      // @ts-expect-error - TypeScript strict typing issue with Uint8Array in Web Crypto API
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

