import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();
const auditController = new AuditController();

// Все маршруты требуют авторизации
router.get('/', authMiddleware, (req, res) => auditController.getLogs(req, res));

export default router;

