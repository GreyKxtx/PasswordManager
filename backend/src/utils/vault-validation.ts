import { z } from 'zod';

/**
 * Схема валидации для создания записи vault
 */
export const createVaultItemSchema = z.object({
  title: z.string().min(1).max(200),
  username: z.string().max(200).optional(),
  url: z.string().url().max(500).optional().or(z.literal('')),
  tags: z.array(z.string().max(50)).max(20).optional(),
  encryptedData: z.string().min(1), // base64 строка
  iv: z.string().min(1), // base64 строка
  version: z.number().int().positive(),
});

/**
 * Схема валидации для обновления записи vault
 */
export const updateVaultItemSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  username: z.string().max(200).optional(),
  url: z.string().url().max(500).optional().or(z.literal('')),
  tags: z.array(z.string().max(50)).max(20).optional(),
  encryptedData: z.string().min(1).optional(),
  iv: z.string().min(1).optional(),
  version: z.number().int().positive().optional(),
});

/**
 * Схема валидации для импорта vault
 */
export const vaultImportSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().optional(),
      title: z.string().min(1).max(200),
      username: z.string().max(200).optional(),
      url: z.string().url().max(500).optional().or(z.literal('')),
      tags: z.array(z.string().max(50)).max(20).optional(),
      encryptedData: z.string().min(1),
      iv: z.string().min(1),
      version: z.number().int().positive(),
      createdAt: z.string().datetime().optional(),
      updatedAt: z.string().datetime().optional(),
    })
  ),
});

