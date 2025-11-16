/**
 * JWT Payload интерфейс
 */
export interface JwtPayload {
  sub: string; // user id (subject)
  iat?: number; // issued at
  exp?: number; // expiration time
  jti?: string; // JWT ID (для ротации/blacklist)
  deviceId?: string; // id сессии/устройства
  // roles?: string[]; // если понадобятся роли в будущем
}

/**
 * Пара токенов
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}
