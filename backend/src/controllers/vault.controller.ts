import { Response } from 'express';
import { VaultService } from '../services/vault.service';
import { AuditService } from '../services/audit.service';
import { AuthenticatedRequest } from '../types/express';
import { CreateVaultItemDto, UpdateVaultItemDto, VaultImportItemDto } from '../types/vault.types';
import { createVaultItemSchema, updateVaultItemSchema, vaultImportSchema } from '../utils/vault-validation';
import { validateObjectId } from '../utils/validation-helpers';
import { logger } from '../utils/logger';

const vaultService = new VaultService();
const auditService = new AuditService();

export class VaultController {
  /**
   * GET /vault/items
   * Получение всех записей текущего пользователя
   */
  async getItems(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.sub) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const query = req.query.q as string | undefined;
      const items = query
        ? await vaultService.searchItems(req.user.sub, query)
        : await vaultService.getItems(req.user.sub);

      res.status(200).json({
        success: true,
        data: items,
      });
    } catch (error) {
      logger.error('Get vault items error', {
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
   * GET /vault/items/:id
   * Получение конкретной записи
   */
  async getItemById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.sub) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      
      // Валидация ObjectId
      try {
        validateObjectId(id, 'item id');
      } catch (error) {
        res.status(400).json({
          success: false,
          error: error instanceof Error ? error.message : 'Invalid item id',
        });
        return;
      }

      const item = await vaultService.getItemById(req.user.sub, id);

      if (!item) {
        res.status(404).json({
          success: false,
          error: 'Item not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: item,
      });
    } catch (error) {
      logger.error('Get vault item error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.sub,
        itemId: req.params.id,
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * POST /vault/items
   * Создание новой записи
   */
  async createItem(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.sub) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      // Валидация входных данных
      const validationResult = createVaultItemSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: validationResult.error.errors,
        });
        return;
      }

      const dto: CreateVaultItemDto = validationResult.data;
      const item = await vaultService.createItem(req.user.sub, dto);

      // Логируем создание записи
      await auditService.logFromRequest(
        req,
        'vault_item_created',
        `Vault item created: ${item.title}`,
        req.user.sub,
        { itemId: item.id, title: item.title }
      );

      res.status(201).json({
        success: true,
        data: item,
        message: 'Item created successfully',
      });
    } catch (error) {
      logger.error('Create vault item error', {
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
   * PUT /vault/items/:id
   * Обновление записи
   */
  async updateItem(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.sub) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      // Валидация входных данных
      const validationResult = updateVaultItemSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: validationResult.error.errors,
        });
        return;
      }

      const { id } = req.params;
      
      // Валидация ObjectId
      try {
        validateObjectId(id, 'item id');
      } catch (error) {
        res.status(400).json({
          success: false,
          error: error instanceof Error ? error.message : 'Invalid item id',
        });
        return;
      }

      const dto: UpdateVaultItemDto = validationResult.data;

      const item = await vaultService.updateItem(req.user.sub, id, dto);

      if (!item) {
        res.status(404).json({
          success: false,
          error: 'Item not found',
        });
        return;
      }

      // Логируем обновление записи
      await auditService.logFromRequest(
        req,
        'vault_item_updated',
        `Vault item updated: ${item.title}`,
        req.user.sub,
        { itemId: item.id, title: item.title }
      );

      res.status(200).json({
        success: true,
        data: item,
        message: 'Item updated successfully',
      });
    } catch (error) {
      logger.error('Update vault item error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.sub,
        itemId: req.params.id,
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * DELETE /vault/items/:id
   * Удаление записи
   */
  async deleteItem(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.sub) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      
      // Валидация ObjectId
      try {
        validateObjectId(id, 'item id');
      } catch (error) {
        res.status(400).json({
          success: false,
          error: error instanceof Error ? error.message : 'Invalid item id',
        });
        return;
      }
      
      // Получаем информацию о записи перед удалением для лога
      const item = await vaultService.getItemById(req.user.sub, id);
      
      const deleted = await vaultService.deleteItem(req.user.sub, id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Item not found',
        });
        return;
      }

      // Логируем удаление записи
      await auditService.logFromRequest(
        req,
        'vault_item_deleted',
        `Vault item deleted: ${item?.title || id}`,
        req.user.sub,
        { itemId: id, title: item?.title }
      );

      res.status(200).json({
        success: true,
        message: 'Item deleted successfully',
      });
    } catch (error) {
      logger.error('Delete vault item error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.sub,
        itemId: req.params.id,
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /vault/backup
   * Экспорт всех записей пользователя
   */
  async exportVault(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.sub) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const items = await vaultService.exportVault(req.user.sub);

      res.status(200).json({
        success: true,
        data: items,
      });
    } catch (error) {
      logger.error('Export vault error', {
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
   * POST /vault/restore
   * Импорт записей (заменяет все существующие)
   */
  async importVault(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.sub) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      // Валидация входных данных
      const validationResult = vaultImportSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: validationResult.error.errors,
        });
        return;
      }

      const items: VaultImportItemDto[] = validationResult.data.items.map((item) => ({
        id: item.id,
        title: item.title,
        username: item.username,
        url: item.url,
        tags: item.tags,
        encryptedData: item.encryptedData,
        iv: item.iv,
        version: item.version,
        createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
      }));

      const result = await vaultService.importVault(req.user.sub, items);

      res.status(200).json({
        success: true,
        data: result,
        message: `Imported ${result.imported} item(s), deleted ${result.deleted} existing item(s)`,
      });
    } catch (error) {
      logger.error('Import vault error', {
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

