import { Router } from 'express';
import { TotpController } from '../controllers/totp.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import rateLimit from 'express-rate-limit';

const router: Router = Router();
const totpController = new TotpController();

// Rate limiting для 2FA эндпоинтов (5 попыток за 15 минут)
const totpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 5, // максимум 5 попыток
  message: {
    success: false,
    error: 'Too many attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Все TOTP эндпоинты требуют авторизации
router.post('/setup', authMiddleware, (req, res) => totpController.setup(req, res));
router.post('/confirm', authMiddleware, totpRateLimit, (req, res) => totpController.confirm(req, res));
router.post('/disable', authMiddleware, totpRateLimit, (req, res) => totpController.disable(req, res));

export default router;

