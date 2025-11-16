/**
 * Общие типы для всех компонентов системы
 */

// Типы для аутентификации
export interface User {
  userId: string;
  email: string;
  twoFactorEnabled: boolean;
  createdAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  masterPassword: string;
  totpCode?: string;
}

export interface RegisterRequest {
  email: string;
  masterPassword: string;
  totpSetup?: boolean;
}

// Типы для хранилища
export interface VaultItem {
  itemId: string;
  userId: string;
  type: 'password' | 'note' | 'card';
  data: string; // Зашифрованные данные (base64)
  folder?: string;
  tags?: string[];
  version: number; // Для синхронизации между устройствами
  createdAt: Date;
  updatedAt: Date;
  lastModified: Date;
}

export interface VaultItemDecrypted {
  itemId: string;
  title: string;
  login?: string;
  password?: string;
  url?: string;
  note?: string;
  customFields?: Record<string, string>;
  folder?: string;
  tags?: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
  lastModified: Date;
}

export interface VaultItemCreate {
  data: string; // Зашифрованные данные (base64)
  folder?: string;
  tags?: string[];
}

// Типы для регистрации и аутентификации (криптография)
export interface RegisterCryptoData {
  email: string;
  passwordVerifier: string; // Результат Argon2id KDF (base64)
  kdfParams: KeyDerivationParams;
  vaultKeyEnc: string; // VaultKey, зашифрованный PasswordKey (base64)
  vaultKeyEncIV: string; // IV для шифрования VaultKey (base64)
}

export interface LoginCryptoData {
  email: string;
  passwordVerifier: string; // Результат Argon2id KDF (base64)
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  vaultKeyEnc: string; // VaultKey в зашифрованном виде
  vaultKeyEncIV: string; // IV для расшифровки VaultKey
  user: User;
}

// Типы для сессий
export interface Session {
  sessionId: string;
  userId: string;
  device: string;
  ip: string;
  userAgent: string;
  createdAt: Date;
  lastActiveAt: Date;
  current: boolean;
}

// Типы для 2FA
export interface TOTPSetup {
  secret: string;
  qrCode: string; // base64 data URL
}

export interface WebAuthnCredential {
  credId: string;
  publicKey: string;
  type: string;
  regDate: Date;
}

// Типы для аудита
export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT'
  | 'USER_REGISTERED'
  | 'PASSWORD_CHANGED'
  | '2FA_ENABLED'
  | '2FA_DISABLED'
  | 'ITEM_CREATE'
  | 'ITEM_UPDATE'
  | 'ITEM_DELETE'
  | 'VAULT_EXPORTED'
  | 'VAULT_IMPORTED';

export interface AuditLog {
  logId: string;
  userId: string | null;
  action: AuditAction;
  timestamp: Date;
  details: Record<string, any>;
}

// API Response типы
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Типы для криптографии
export interface EncryptionResult {
  ciphertext: string; // base64
  iv: string; // base64
  tag: string; // base64 (для GCM)
}

export interface KeyDerivationParams {
  algorithm: 'argon2id';
  memory: number; // в KB (19456 для 19 МБ)
  iterations: number; // минимум 2
  parallelism: number; // обычно 1
  salt: string; // base64, 16 байт (128 бит)
}

// Типы для управления ключами
export interface VaultKeyInfo {
  vaultKey: Uint8Array; // 32 байта (256 бит) - только в памяти
  passwordKey: Uint8Array; // 32 байта - только в памяти, выведен из мастер-пароля
}

export interface PasswordChangeData {
  oldPasswordVerifier: string; // Для подтверждения старого пароля
  newPasswordVerifier: string;
  newKdfParams: KeyDerivationParams;
  newVaultKeyEnc: string;
  newVaultKeyEncIV: string;
}

