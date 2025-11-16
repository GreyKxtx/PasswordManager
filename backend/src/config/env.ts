import dotenv from 'dotenv';

dotenv.config();

/**
 * Проверка обязательных переменных окружения
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Проверка опциональных переменных окружения с дефолтными значениями
 */
function getEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

// Валидация порта
function validatePort(port: number): number {
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${port}. Port must be between 1 and 65535`);
  }
  return port;
}

export const config = {
  port: validatePort(parseInt(getEnv('PORT', '3000'), 10)),
  nodeEnv: getEnv('NODE_ENV', 'development'),
  mongoUri: requireEnv('MONGODB_URI'),
  jwt: {
    secret: requireEnv('JWT_SECRET'),
    accessExpiresIn: getEnv('JWT_ACCESS_EXPIRES_IN', '15m'),
    refreshExpiresIn: getEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
  },
  cors: {
    origin: getEnv('CORS_ORIGIN', 'http://localhost:4200'),
  },
};
