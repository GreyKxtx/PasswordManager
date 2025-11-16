/**
 * Общие константы для всех компонентов
 */

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    STATUS: '/auth/status',
    TOTP: {
      ENABLE: '/auth/totp/enable',
      VERIFY: '/auth/totp/verify',
      DISABLE: '/auth/totp/disable',
    },
    WEBAUTHN: {
      REGISTER: '/auth/webauthn/register',
      REGISTER_FINISH: '/auth/webauthn/register/finish',
      AUTHENTICATE: '/auth/webauthn/authenticate',
      VERIFY: '/auth/webauthn/verify',
    },
  },
  VAULT: {
    ITEMS: '/vault/items',
    ITEM: (id: string) => `/vault/items/${id}`,
    BACKUP: '/vault/backup',
    RESTORE: '/vault/restore',
  },
  SESSIONS: {
    LIST: '/sessions',
    TERMINATE: (id: string) => `/sessions/${id}`,
    TERMINATE_ALL: '/sessions?all=true',
  },
  AUDIT: {
    LOGS: '/audit-log',
  },
  USER: {
    PROFILE: '/user/profile',
    PASSWORD: '/user/password',
    ENABLE_2FA: '/user/enable-2fa',
  },
} as const;

// Криптографические константы
export const CRYPTO = {
  // KDF параметры (Argon2id)
  KDF: {
    ALGORITHM: 'argon2id' as const,
    MEMORY: 19 * 1024, // 19 МБ в KB (OWASP рекомендация)
    ITERATIONS: 2,
    PARALLELISM: 1,
    SALT_LENGTH: 16, // 128 бит
  },
  // Шифрование
  ENCRYPTION: {
    ALGORITHM: 'AES-GCM' as const,
    KEY_LENGTH: 256, // бит
    IV_LENGTH: 12, // 96 бит для GCM
    TAG_LENGTH: 128, // бит
  },
  // TOTP
  TOTP: {
    ALGORITHM: 'SHA-1' as const,
    PERIOD: 30, // секунд
    DIGITS: 6,
    SECRET_LENGTH: 20, // байт (160 бит)
  },
} as const;

// Валидация
export const VALIDATION = {
  PASSWORD: {
    MIN_LENGTH: 12,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL: true,
  },
  EMAIL: {
    MAX_LENGTH: 255,
  },
  VAULT_ITEM: {
    TITLE_MAX_LENGTH: 200,
    LOGIN_MAX_LENGTH: 500,
    PASSWORD_MAX_LENGTH: 1000,
    NOTE_MAX_LENGTH: 10000,
    URL_MAX_LENGTH: 2000,
  },
} as const;

// JWT
export const JWT = {
  ACCESS_TOKEN_EXPIRY: 3600, // 1 час (секунды)
  REFRESH_TOKEN_EXPIRY: 604800, // 7 дней (секунды)
} as const;

// Rate Limiting
export const RATE_LIMIT = {
  LOGIN: {
    WINDOW_MS: 15 * 60 * 1000, // 15 минут
    MAX_ATTEMPTS: 5,
  },
  REGISTER: {
    WINDOW_MS: 60 * 60 * 1000, // 1 час
    MAX_ATTEMPTS: 3,
  },
} as const;

// Сессии
export const SESSION = {
  INACTIVITY_TIMEOUT: 30 * 60 * 1000, // 30 минут
  MAX_SESSIONS_PER_USER: 10,
} as const;

