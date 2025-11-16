import { timingSafeEqual } from 'crypto';
import { randomUUID } from 'crypto';
import { UserModel } from '../models/User';
import { RegisterCryptoData, LoginCryptoData, LoginResponse, AuthTokens, User } from '@password-manager/shared/types';
import { TokenService } from './token.service';
import { SessionService, SessionMetadata } from './session.service';
import { TotpService } from './totp.service';
import { JwtPayload } from '../types/jwt.types';

export class AuthService {
  private tokenService: TokenService;
  private sessionService: SessionService;

  constructor() {
    this.tokenService = new TokenService();
    this.sessionService = new SessionService();
  }

  /**
   * Сравнение passwordVerifier с использованием timing-safe сравнения
   */
  private comparePasswordVerifier(stored: string, provided: string): boolean {
    if (stored.length !== provided.length) {
      return false;
    }

    try {
      const storedBuffer = Buffer.from(stored, 'base64');
      const providedBuffer = Buffer.from(provided, 'base64');

      if (storedBuffer.length !== providedBuffer.length) {
        return false;
      }

      return timingSafeEqual(storedBuffer, providedBuffer);
    } catch (error) {
      // Логируем только ошибки без чувствительных данных
      // Используем console.error здесь, так как logger может быть недоступен в сервисе
      console.error('[AUTH] Error comparing verifiers');
      return false;
    }
  }

  /**
   * Регистрация нового пользователя
   */
  async register(data: RegisterCryptoData): Promise<{ userId: string }> {
    // Проверяем, существует ли пользователь с таким email
    const existingUser = await UserModel.findOne({ email: data.email.toLowerCase() });
    if (existingUser) {
      throw new Error('Email already in use');
    }
    
    // Создаем нового пользователя
    const user = new UserModel({
      email: data.email.toLowerCase(),
      passwordVerifier: data.passwordVerifier,
      kdfParams: data.kdfParams,
      vaultKeyEnc: data.vaultKeyEnc,
      vaultKeyEncIV: data.vaultKeyEncIV,
      twoFactorEnabled: false,
    });

    await user.save();
    
    // Security log: успешная регистрация (без чувствительных данных)
    console.log('[AUTH] User registered:', data.email.toLowerCase());

    return { userId: user._id.toString() };
  }

  /**
   * Вход пользователя
   * Если у пользователя включена 2FA, возвращает require2FA: true и tempToken
   */
  async login(data: LoginCryptoData, metadata?: SessionMetadata): Promise<LoginResponse | { require2FA: true; method: string; tempToken: string }> {
    // Находим пользователя по email
    const user = await UserModel.findOne({ email: data.email.toLowerCase() });
    if (!user) {
      // Security log: неуспешная попытка входа
      console.log('[AUTH] Login failed: user not found');
      throw new Error('Invalid email or password');
    }

    // Проверяем passwordVerifier с timing-safe сравнением
    if (!this.comparePasswordVerifier(user.passwordVerifier, data.passwordVerifier)) {
      // Security log: неуспешная попытка входа
      console.log('[AUTH] Login failed: invalid password');
      throw new Error('Invalid email or password');
    }

    // Если 2FA включена, возвращаем tempToken вместо обычных токенов
    if (user.twoFactorEnabled) {
      // Генерируем временный токен для 2FA
      const tempToken = this.tokenService.signTempToken(user._id.toString(), '2fa', 'TOTP');
      
      // Security log: требуется 2FA
      console.log('[AUTH] Login requires 2FA:', data.email.toLowerCase());
      
      return {
        require2FA: true,
        method: 'TOTP',
        tempToken,
      };
    }

    // Security log: успешный вход (без 2FA)
    console.log('[AUTH] Login successful:', data.email.toLowerCase());

    // Генерируем jti для сессии
    const jti = randomUUID();
    const deviceId = metadata?.deviceId || randomUUID();

    // Создаем payload с jti и deviceId
    const payload: JwtPayload = {
      sub: user._id.toString(),
      jti,
      deviceId,
    };

    // Генерируем токены через TokenService
    const tokens = this.tokenService.generateTokens(payload);

    // Создаем сессию
    await this.sessionService.createSession(user._id.toString(), payload, metadata || {});

    // Формируем ответ
    const userResponse: User = {
      userId: user._id.toString(),
      email: user.email,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
    };

    return {
      ...tokens,
      vaultKeyEnc: user.vaultKeyEnc,
      vaultKeyEncIV: user.vaultKeyEncIV,
      user: userResponse,
    };
  }

  /**
   * Завершение логина с 2FA
   * Проверяет TOTP код и выдает обычные токены
   */
  async completeLoginWith2FA(tempToken: string, totpCode: string, metadata?: SessionMetadata): Promise<LoginResponse> {
    const totpService = new TotpService();
    
    // Верифицируем временный токен
    const tempTokenData = this.tokenService.verifyTempToken(tempToken, '2fa', 'TOTP');
    
    // Находим пользователя
    const user = await UserModel.findById(tempTokenData.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Проверяем, что 2FA включена
    if (!user.twoFactorEnabled || !user.totpSecretEnc || !user.totpSecretEncIV) {
      throw new Error('2FA is not enabled for this user');
    }

    // Расшифровываем TOTP секрет
    const rawSecret = totpService.decryptSecret(user.totpSecretEnc, user.totpSecretEncIV);
    
    // Проверяем TOTP код
    if (!totpService.verifyCode(rawSecret, totpCode, 1)) {
      throw new Error('Invalid 2FA code');
    }

    // Security log: успешный вход с 2FA
    console.log('[AUTH] Login successful with 2FA:', user.email);

    // Генерируем jti для сессии
    const jti = randomUUID();
    const deviceId = metadata?.deviceId || randomUUID();

    // Создаем payload с jti и deviceId
    const payload: JwtPayload = {
      sub: user._id.toString(),
      jti,
      deviceId,
    };

    // Генерируем токены через TokenService
    const tokens = this.tokenService.generateTokens(payload);

    // Создаем сессию
    await this.sessionService.createSession(user._id.toString(), payload, metadata || {});

    // Формируем ответ
    const userResponse: User = {
      userId: user._id.toString(),
      email: user.email,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
    };

    return {
      ...tokens,
      vaultKeyEnc: user.vaultKeyEnc,
      vaultKeyEncIV: user.vaultKeyEncIV,
      user: userResponse,
    };
  }

  /**
   * Обновление токенов
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    // Верифицируем refresh token
    const decoded = this.tokenService.verifyRefreshToken(refreshToken);

    // Проверяем, существует ли пользователь
    const user = await UserModel.findById(decoded.sub);
    if (!user) {
      throw new Error('User not found');
    }

    // Проверяем, активна ли сессия
    if (decoded.jti) {
      const isActive = await this.sessionService.isSessionActive(decoded.jti);
      if (!isActive) {
        // Сессия отозвана - выбрасываем TokenInvalidError для правильной обработки
        const { TokenInvalidError } = require('../utils/token-errors');
        throw new TokenInvalidError('Session revoked');
      }

      // Обновляем время последнего использования
      await this.sessionService.touchSession(decoded.jti);
    }

    // Генерируем новые токены с сохранением jti и deviceId
    const payload: JwtPayload = {
      sub: decoded.sub,
      jti: decoded.jti,
      deviceId: decoded.deviceId,
    };
    return this.tokenService.generateTokens(payload);
  }

  /**
   * Выход пользователя (отзыв сессии)
   */
  async logout(jti: string): Promise<void> {
    await this.sessionService.revokeSession(jti);
  }

  /**
   * Выход со всех устройств
   */
  async logoutAll(userId: string): Promise<number> {
    return await this.sessionService.revokeAllUserSessions(userId);
  }

  /**
   * Получение пользователя по ID
   */
  async getUserById(userId: string): Promise<User | null> {
    const user = await UserModel.findById(userId);
    if (!user) {
      return null;
    }

    return {
      userId: user._id.toString(),
      email: user.email,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
    };
  }
}
