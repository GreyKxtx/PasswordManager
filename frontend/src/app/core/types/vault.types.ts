/**
 * Зашифрованная запись vault (как приходит с бэкенда)
 */
export interface VaultItem {
  id: string;
  title: string;
  username?: string;
  url?: string;
  tags?: string[];
  encryptedData: string; // base64 шифротекста
  iv: string; // base64 IV
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Расшифрованные секретные данные внутри vault entry
 */
export interface VaultSecretData {
  password: string;
  notes?: string;
}

/**
 * Расшифрованная запись vault (для UI)
 */
export interface VaultItemDecrypted {
  id: string;
  title: string;
  username?: string;
  url?: string;
  tags?: string[];
  password?: string;
  notes?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO для создания записи
 */
export interface CreateVaultItemPayload {
  title: string;
  username?: string;
  url?: string;
  tags?: string[];
  encryptedData: string;
  iv: string;
  version: number;
}

/**
 * DTO для обновления записи
 */
export interface UpdateVaultItemPayload {
  title?: string;
  username?: string;
  url?: string;
  tags?: string[];
  encryptedData?: string;
  iv?: string;
  version?: number;
}

