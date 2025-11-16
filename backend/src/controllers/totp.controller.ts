import { Response } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { TotpService } from '../services/totp.service';
import { AuthService } from '../services/auth.service';
import { AuditService } from '../services/audit.service';
import { UserModel } from '../models/User';
import { logger } from '../utils/logger';
import { z } from 'zod';

const totpService = new TotpService();
const authService = new AuthService();
const auditService = new AuditService();

// Валидационные схемы
const confirmTotpSchema = z.object({
  code: z.string().length(6, 'TOTP code must be 6 digits').regex(/^\d+$/, 'TOTP code must contain only digits'),
});

const disableTotpSchema = z.object({
  code: z.string().length(6, 'TOTP code must be 6 digits').regex(/^\d+$/, 'TOTP code must contain only digits'),
});

export class TotpController {
  /**
   * POST /api/auth/totp/setup
   * Начало настройки TOTP
   */
  async setup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.sub) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const userId = req.user.sub;
      const user = await UserModel.findById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Проверяем, что 2FA еще не включена
      if (user.twoFactorEnabled) {
        res.status(400).json({
          success: false,
          error: '2FA is already enabled',
        });
        return;
      }

      // Генерируем новый секрет
      const rawSecret = totpService.generateSecret();
      const secretBase32 = totpService.secretToBase32(rawSecret);

      // Шифруем секрет
      const { encrypted, iv } = totpService.encryptSecret(rawSecret);

      // Сохраняем зашифрованный секрет (но пока не включаем 2FA)
      user.totpSecretEnc = encrypted;
      user.totpSecretEncIV = iv;
      // twoFactorEnabled остается false до подтверждения
      await user.save();

      // Генерируем otpauth:// URL
      const otpauthUrl = totpService.generateOtpAuthUrl(user.email, secretBase32);

      // Логируем начало настройки
      await auditService.logFromRequest(
        req,
        'totp_setup_started',
        'TOTP setup started',
        userId
      );

      res.status(200).json({
        success: true,
        data: {
          secretBase32,
          otpauthUrl,
        },
      });
    } catch (error) {
      logger.error('TOTP setup error', {
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
   * POST /api/auth/totp/confirm
   * Подтверждение включения TOTP
   */
  async confirm(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.sub) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      // Валидация
      const validationResult = confirmTotpSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: validationResult.error.errors,
        });
        return;
      }

      const { code } = validationResult.data;
      const userId = req.user.sub;
      const user = await UserModel.findById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Проверяем, что секрет существует
      if (!user.totpSecretEnc || !user.totpSecretEncIV) {
        res.status(400).json({
          success: false,
          error: 'TOTP setup not started',
        });
        return;
      }

      // Расшифровываем секрет
      const rawSecret = totpService.decryptSecret(user.totpSecretEnc, user.totpSecretEncIV);

      // Проверяем код
      if (!totpService.verifyCode(rawSecret, code, 1)) {
        // Логируем неудачную попытку
        await auditService.logFromRequest(
          req,
          'totp_enable_failed',
          'TOTP enable failed: invalid code',
          userId,
          { ip: req.ip, userAgent: req.headers['user-agent'] }
        );

        res.status(400).json({
          success: false,
          error: 'Invalid TOTP code',
        });
        return;
      }

      // Включаем 2FA
      user.twoFactorEnabled = true;
      await user.save();

      // Логируем успешное включение
      await auditService.logFromRequest(
        req,
        'totp_enabled',
        'TOTP enabled',
        userId
      );

      res.status(200).json({
        success: true,
        message: 'TOTP enabled successfully',
      });
    } catch (error) {
      logger.error('TOTP confirm error', {
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
   * POST /api/auth/totp/disable
   * Отключение TOTP
   */
  async disable(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.sub) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      // Валидация
      const validationResult = disableTotpSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: validationResult.error.errors,
        });
        return;
      }

      const { code } = validationResult.data;
      const userId = req.user.sub;
      const user = await UserModel.findById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Проверяем, что 2FA включена
      if (!user.twoFactorEnabled || !user.totpSecretEnc || !user.totpSecretEncIV) {
        res.status(400).json({
          success: false,
          error: '2FA is not enabled',
        });
        return;
      }

      // Расшифровываем секрет
      const rawSecret = totpService.decryptSecret(user.totpSecretEnc, user.totpSecretEncIV);

      // Проверяем код
      if (!totpService.verifyCode(rawSecret, code, 1)) {
        // Логируем неудачную попытку
        await auditService.logFromRequest(
          req,
          'totp_disable_failed',
          'TOTP disable failed: invalid code',
          userId,
          { ip: req.ip, userAgent: req.headers['user-agent'] }
        );

        res.status(400).json({
          success: false,
          error: 'Invalid TOTP code',
        });
        return;
      }

      // Отключаем 2FA и удаляем секрет
      user.twoFactorEnabled = false;
      user.totpSecretEnc = undefined;
      user.totpSecretEncIV = undefined;
      await user.save();

      // Логируем отключение
      await auditService.logFromRequest(
        req,
        'totp_disabled',
        'TOTP disabled',
        userId
      );

      res.status(200).json({
        success: true,
        message: 'TOTP disabled successfully',
      });
    } catch (error) {
      logger.error('TOTP disable error', {
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

