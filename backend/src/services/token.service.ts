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
