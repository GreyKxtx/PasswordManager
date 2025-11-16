export interface VaultItemEncrypted {
  id: string;
  title: string;
  username?: string;
  url?: string;
  tags?: string[];
  encryptedData: string; // base64
  iv: string; // base64
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface VaultSecretData {
  password: string;
  notes?: string;
}

export interface VaultItemDecrypted {
  id: string;
  title: string;
  username?: string;
  url?: string;
  tags?: string[];
  password: string;
  notes?: string;
}

export interface KdfParams {
  salt: string; // base64
  memory: number; // KB
  iterations: number;
  parallelism: number;
  algorithm: 'argon2id';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  vaultKeyEnc: string; // base64
  vaultKeyEncIV: string; // base64
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  vaultKeyEnc: string;
  vaultKeyEncIV: string;
  user: {
    userId: string;
    email: string;
  };
}

// Типы для создания и обновления записей
export interface CreateVaultItemPayload {
  title: string;
  username?: string;
  url?: string;
  tags?: string[];
  encryptedData: string; // base64
  iv: string; // base64
  version: number;
}

export interface UpdateVaultItemPayload {
  title?: string;
  username?: string;
  url?: string;
  tags?: string[];
  encryptedData?: string; // base64
  iv?: string; // base64
  version?: number;
}

// Message types для communication между частями расширения
export type Message =
  | { type: 'PING' }
  | { type: 'CHECK_AUTH' }
  | { type: 'LOGIN'; email: string; password: string }
  | { type: 'LOGOUT' }
  | { type: 'GET_ENTRIES_FOR_DOMAIN'; domain: string }
  | { type: 'GET_ALL_ENTRIES' }
  | { type: 'SYNC_VAULT' }
  | { type: 'AUTOFILL'; entryId: string; username: string; password: string }
  | { type: 'CREATE_ITEM'; item: Partial<VaultItemDecrypted> }
  | { type: 'UPDATE_ITEM'; id: string; item: Partial<VaultItemDecrypted> }
  | { type: 'DELETE_ITEM'; id: string };

export type MessageResponse =
  | { success: true; data?: any; error?: string }
  | { success: false; error: string };

