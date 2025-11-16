import { Router } from 'express';
import { SessionController } from '../controllers/session.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();
const sessionController = new SessionController();

// Все маршруты требуют авторизации
router.get('/', authMiddleware, (req, res) => sessionController.getSessions(req, res));
router.delete('/:sessionId', authMiddleware, (req, res) => sessionController.revokeSession(req, res));
router.delete('/', authMiddleware, (req, res) => sessionController.revokeAllSessions(req, res));

export default router;

