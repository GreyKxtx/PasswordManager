import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { AuditService } from '../services/audit.service';
import { registerSchema, loginSchema, refreshTokenSchema } from '../utils/validation';
import { RegisterCryptoData, LoginCryptoData, LoginResponse } from '@password-manager/shared/types';
import { TokenExpiredError, TokenInvalidError } from '../utils/token-errors';
import { AuthenticatedRequest } from '../types/express';
import { UserModel } from '../models/User';
import { logger } from '../utils/logger';

const authService = new AuthService();
const auditService = new AuditService();

export class AuthController {
  /**
   * POST /auth/register
   * Регистрация нового пользователя
   */
  async register(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Валидация входных данных
      const validationResult = registerSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: validationResult.error.errors,
        });
        return;
      }

      const data: RegisterCryptoData = validationResult.data;
      const result = await authService.register(data);
      
      // Логируем регистрацию
      await auditService.logFromRequest(
        req,
        'register',
        `User registered: ${data.email}`,
        result.userId
      );
      
      res.status(201).json({
        success: true,
        data: result,
        message: 'User registered successfully',
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Email already in use') {
        res.status(409).json({
          success: false,
          error: error.message,
        });
      } else {
        logger.error('Registration error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          email: (req.body as RegisterCryptoData)?.email || 'unknown',
        });
        res.status(500).json({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  }

  /**
   * POST /auth/login
   * Вход пользователя
   */
  async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Валидация входных данных
      const validationResult = loginSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: validationResult.error.errors,
        });
        return;
      }

      const data: LoginCryptoData = validationResult.data;

      // Извлекаем метаданные для сессии
      const metadata = {
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      };

      const result = await authService.login(data, metadata);
      
      // Проверяем, требуется ли 2FA
      if ('require2FA' in result && result.require2FA) {
        // Логируем требование 2FA
        await auditService.logFromRequest(
          req,
          'login_2fa_required',
          `Login requires 2FA: ${data.email}`,
          undefined,
          { email: data.email }
        );
        
        res.status(200).json({
          success: true,
          data: result,
        });
        return;
      }
      
      // Логируем успешный вход (без 2FA)
      const loginResult = result as LoginResponse;
      await auditService.logFromRequest(
        req,
        'login_success',
        `User logged in: ${data.email}`,
        loginResult.user.userId,
        { twoFactor: false }
      );
      
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Invalid email or password') {
        // Логируем неудачную попытку входа
        const email = (req.body as LoginCryptoData)?.email || 'unknown';
        await auditService.logFromRequest(
          req,
          'login_failed',
          `Failed login attempt: ${email}`,
          undefined,
          { email }
        );
        
        res.status(401).json({
          success: false,
          error: error.message,
        });
      } else {
        logger.error('Login error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          email: (req.body as LoginCryptoData)?.email || 'unknown',
        });
        res.status(500).json({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  }

  /**
   * POST /auth/refresh
   * Обновление токенов
   */
  async refresh(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Валидация входных данных
      const validationResult = refreshTokenSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: validationResult.error.errors,
        });
        return;
      }

      const { refreshToken } = validationResult.data;

      try {
        const tokens = await authService.refreshTokens(refreshToken);
        
        // Логируем обновление токена
        if (req.user?.sub) {
          await auditService.logFromRequest(
            req,
            'token_refresh',
            'Access token refreshed',
            req.user.sub
          );
        }
        
        res.status(200).json({
          success: true,
          data: tokens,
        });
      } catch (error: unknown) {
        if (error instanceof TokenExpiredError) {
          res.status(401).json({
            success: false,
            error: 'Refresh token expired',
          });
        } else if (error instanceof TokenInvalidError) {
          // Проверяем, является ли это отозванной сессией
          const errorMessage = error.message || 'Invalid refresh token';
          res.status(401).json({
            success: false,
            error: errorMessage.includes('Session revoked') ? 'Session revoked' : 'Invalid refresh token',
          });
        } else if (error instanceof Error && error.message === 'User not found') {
          res.status(404).json({
            success: false,
            error: error.message,
          });
        } else {
          logger.error('Refresh token error', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          res.status(500).json({
            success: false,
            error: 'Internal server error',
          });
        }
      }
    } catch (error) {
      logger.error('Refresh endpoint error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * POST /auth/logout
   * Выход пользователя (отзыв текущей сессии)
   */
  async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.jti) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      await authService.logout(req.user.jti);
      
      // Логируем выход
      await auditService.logFromRequest(
        req,
        'logout',
        'User logged out',
        req.user.sub
      );
      
      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      logger.error('Logout error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.sub,
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /auth/login/params?email=...
   * Получение KDF параметров для логина (публичный endpoint)
   */
  async getLoginParams(req: Request, res: Response): Promise<void> {
    try {
      const email = req.query.email as string;
      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email parameter is required',
        });
        return;
      }

      const user = await UserModel.findOne({ email: email.toLowerCase() }).select('kdfParams');
      if (!user) {
        // Возвращаем дефолтные параметры, чтобы не раскрывать существование пользователя
        // Используем те же параметры, что и при регистрации по умолчанию
        res.status(200).json({
          success: true,
          data: {
            algorithm: 'argon2id',
            memory: 19456, // ~19 MB в KB
            iterations: 2, // Рекомендуемое значение для Argon2id
            parallelism: 1,
            salt: '', // Пустой salt для несуществующего пользователя
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user.kdfParams,
      });
    } catch (error) {
      logger.error('Get login params error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: req.query.email as string,
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * POST /auth/2fa/verify
   * Завершение логина с 2FA
   */
  async verify2FA(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { tempToken, code } = req.body;

      if (!tempToken || !code) {
        res.status(400).json({
          success: false,
          error: 'tempToken and code are required',
        });
        return;
      }

      // Валидация кода
      if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
        res.status(400).json({
          success: false,
          error: 'Invalid code format',
        });
        return;
      }

      // Извлекаем метаданные для сессии
      const metadata = {
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      };

      const result = await authService.completeLoginWith2FA(tempToken, code, metadata);
      
      // Логируем успешный вход с 2FA
      await auditService.logFromRequest(
        req,
        'login_success',
        `User logged in with 2FA: ${result.user.email}`,
        result.user.userId,
        { twoFactor: 'TOTP' }
      );
      
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message === 'Invalid 2FA code' || error.message.includes('Invalid temporary token')) {
          // Логируем неудачную попытку
          await auditService.logFromRequest(
            req,
            'login_2fa_failed',
            '2FA verification failed',
            undefined,
            { ip: req.ip, userAgent: req.headers['user-agent'] }
          );
          
          res.status(401).json({
            success: false,
            error: 'Invalid 2FA code',
          });
          return;
        }
      }
      
      logger.error('2FA verify error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /auth/me
   * Получение текущего пользователя
   */
  async getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Используем типизированный req.user вместо req.userId
      if (!req.user || !req.user.sub) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const userId = req.user.sub;
      const user = await authService.getUserById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error('Get current user error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.sub,
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}
