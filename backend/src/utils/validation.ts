import { z } from 'zod';

/**
 * Валидация email
 */
export const emailSchema = z.string().email('Invalid email format').toLowerCase().trim();

/**
 * Валидация base64 строки
 */
export const base64Schema = z.string().regex(/^[A-Za-z0-9+/]*={0,2}$/, 'Invalid base64 format');

/**
 * Валидация данных регистрации
 */
export const registerSchema = z.object({
  email: emailSchema,
  passwordVerifier: base64Schema,
  kdfParams: z.object({
    algorithm: z.literal('argon2id'),
    memory: z.number().int().positive(),
    iterations: z.number().int().positive(),
    parallelism: z.number().int().positive(),
    salt: base64Schema,
  }),
  vaultKeyEnc: base64Schema,
  vaultKeyEncIV: base64Schema,
});

/**
 * Валидация данных входа
 */
export const loginSchema = z.object({
  email: emailSchema,
  passwordVerifier: base64Schema,
});

/**
 * Валидация refresh token
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

