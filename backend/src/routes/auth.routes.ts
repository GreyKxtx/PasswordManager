import { Router, type Request, type Response } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();
const authController = new AuthController();

// Публичные маршруты
router.post('/register', (req, res) => authController.register(req, res));
router.get('/login/params', (req, res) => authController.getLoginParams(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.post('/refresh', (req, res) => authController.refresh(req, res));
router.post('/2fa/verify', (req, res) => authController.verify2FA(req, res));

// Защищенные маршруты
router.post('/logout', authMiddleware, (req, res) => authController.logout(req, res));
router.get('/me', authMiddleware, (req, res) => authController.getCurrentUser(req, res));

export default router;

