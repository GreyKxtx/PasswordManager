import { config } from './env';

/**
 * Конфигурация JWT токенов
 */
export const jwtConfig = {
  accessTokenTtl: config.jwt.accessExpiresIn,
  refreshTokenTtl: config.jwt.refreshExpiresIn,
  tempTokenTtl: config.jwt.tempTokenExpiresIn,
  secret: config.jwt.secret,
  // Готово к расширению для разных секретов:
  // accessSecret: config.jwt.accessSecret,
  // refreshSecret: config.jwt.refreshSecret,
};

