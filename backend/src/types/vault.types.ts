/**
 * DTO для создания новой записи в vault
 * Все данные уже зашифрованы на клиенте
 */
export interface CreateVaultItemDto {
  title: string;
  username?: string;
  url?: string;
  tags?: string[];
  encryptedData: string; // base64 шифротекста
  iv: string; // base64 IV
  version: number;
}

/**
 * DTO для обновления записи в vault
 */
export interface UpdateVaultItemDto {
  title?: string;
  username?: string;
  url?: string;
  tags?: string[];
  encryptedData?: string;
  iv?: string;
  version?: number;
}

/**
 * Информация о записи vault (для ответов API)
 */
export interface VaultItemInfo {
  id: string;
  userId: string;
  title: string;
  username?: string;
  url?: string;
  tags?: string[];
  encryptedData: string;
  iv: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO для импорта vault (backup/restore)
 */
export interface VaultImportItemDto {
  id?: string; // Опционально, для сохранения ID при импорте
  title: string;
  username?: string;
  url?: string;
  tags?: string[];
  encryptedData: string;
  iv: string;
  version: number;
  createdAt?: Date;
  updatedAt?: Date;
}

