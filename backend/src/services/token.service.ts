import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.config';
import { JwtPayload, TokenPair } from '../types/jwt.types';
import { AuthTokens } from '@password-manager/shared/types';
import { TokenExpiredError, TokenInvalidError } from '../utils/token-errors';

export class TokenService {
  /**
   * Генерация Access Token
   */
  signAccessToken(payload: JwtPayload): string {
    const tokenPayload: Record<string, string> = { sub: payload.sub };
    
    // Сохраняем дополнительные поля, если они есть
    if (payload.jti) tokenPayload.jti = payload.jti;
    if (payload.deviceId) tokenPayload.deviceId = payload.deviceId;

    return jwt.sign(
      tokenPayload,
      jwtConfig.secret,
      {
        expiresIn: jwtConfig.accessTokenTtl,
      } as jwt.SignOptions
    );
  }

  /**
   * Генерация Refresh Token
   */
  signRefreshToken(payload: JwtPayload): string {
    const tokenPayload: Record<string, any> = { sub: payload.sub };
    
    // Сохраняем дополнительные поля, если они есть
    if (payload.jti) tokenPayload.jti = payload.jti;
    if (payload.deviceId) tokenPayload.deviceId = payload.deviceId;

    return jwt.sign(
      tokenPayload,
      jwtConfig.secret,
      {
        expiresIn: jwtConfig.refreshTokenTtl,
      } as jwt.SignOptions
    );
  }

  /**
   * Генерация временного токена для 2FA
   * @param userId - ID пользователя
   * @param purpose - назначение токена ('2fa')
   * @param method - метод 2FA ('TOTP')
   */
  signTempToken(userId: string, purpose: string = '2fa', method: string = 'TOTP'): string {
    const tokenPayload = {
      sub: userId,
      purpose,
      method,
    };

    return jwt.sign(
      tokenPayload,
      jwtConfig.secret,
      {
        expiresIn: jwtConfig.tempTokenTtl,
      } as jwt.SignOptions
    );
  }

  /**
   * Верификация временного токена для 2FA
   * @throws {TokenExpiredError} если токен истек
   * @throws {TokenInvalidError} если токен невалиден или purpose/method не совпадают
   */
  verifyTempToken(token: string, expectedPurpose: string = '2fa', expectedMethod: string = 'TOTP'): { userId: string; purpose: string; method: string } {
    try {
      const decoded = jwt.verify(token, jwtConfig.secret) as jwt.JwtPayload & { purpose?: string; method?: string };
      
      if (decoded.purpose !== expectedPurpose) {
        throw new TokenInvalidError('Invalid token purpose');
      }
      
      if (decoded.method !== expectedMethod) {
        throw new TokenInvalidError('Invalid token method');
      }
      
      return {
        userId: decoded.sub as string,
        purpose: decoded.purpose!,
        method: decoded.method!,
      };
    } catch (error: any) {
      if (error.name === 'TokenExpiredError' || error instanceof TokenExpiredError) {
        throw new TokenExpiredError('Temporary token expired');
      } else if (error.name === 'JsonWebTokenError' || error instanceof TokenInvalidError) {
        throw new TokenInvalidError('Invalid temporary token');
      }
      throw new TokenInvalidError('Failed to verify temporary token');
    }
  }

  /**
   * Генерация пары токенов (access + refresh)
   */
  generateTokens(payload: JwtPayload): AuthTokens {
    const accessToken = this.signAccessToken(payload);
    const refreshToken = this.signRefreshToken(payload);

    // Вычисляем expiresIn в секундах из строки типа "15m"
    const expiresInSeconds = this.parseExpiresIn(jwtConfig.accessTokenTtl);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: expiresInSeconds,
    };
  }

  /**
   * Верификация Access Token
   * @throws {TokenExpiredError} если токен истек
   * @throws {TokenInvalidError} если токен невалиден
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, jwtConfig.secret) as jwt.JwtPayload;
      return {
        sub: decoded.sub as string,
        iat: decoded.iat,
        exp: decoded.exp,
        jti: decoded.jti as string | undefined,
        deviceId: decoded.deviceId as string | undefined,
      };
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new TokenExpiredError('Access token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new TokenInvalidError('Invalid access token');
      }
      throw new TokenInvalidError('Failed to verify access token');
    }
  }

  /**
   * Верификация Refresh Token
   * @throws {TokenExpiredError} если токен истек
   * @throws {TokenInvalidError} если токен невалиден
   */
  verifyRefreshToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, jwtConfig.secret) as jwt.JwtPayload;
      return {
        sub: decoded.sub as string,
        iat: decoded.iat,
        exp: decoded.exp,
        jti: decoded.jti as string | undefined,
        deviceId: decoded.deviceId as string | undefined,
      };
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new TokenExpiredError('Refresh token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new TokenInvalidError('Invalid refresh token');
      }
      throw new TokenInvalidError('Failed to verify refresh token');
    }
  }

  /**
   * Проверка, истек ли токен (без выбрасывания ошибки)
   */
  isTokenExpired(token: string): boolean {
    try {
      jwt.verify(token, jwtConfig.secret);
      return false;
    } catch (error: any) {
      return error.name === 'TokenExpiredError';
    }
  }

  /**
   * Парсинг строки expiresIn в секунды
   */
  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 900; // По умолчанию 15 минут
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return value * (multipliers[unit] || 60);
  }
}
