import { Router } from 'express';
import { VaultController } from '../controllers/vault.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();
const vaultController = new VaultController();

// Все маршруты требуют авторизации
router.use(authMiddleware);

// CRUD операции
router.get('/items', (req, res) => vaultController.getItems(req, res));
router.get('/items/:id', (req, res) => vaultController.getItemById(req, res));
router.post('/items', (req, res) => vaultController.createItem(req, res));
router.put('/items/:id', (req, res) => vaultController.updateItem(req, res));
router.delete('/items/:id', (req, res) => vaultController.deleteItem(req, res));

// Backup/Restore
router.get('/backup', (req, res) => vaultController.exportVault(req, res));
router.post('/restore', (req, res) => vaultController.importVault(req, res));

export default router;

