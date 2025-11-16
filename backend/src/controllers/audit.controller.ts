import { Response } from 'express';
import { AuditService } from '../services/audit.service';
import { AuthenticatedRequest } from '../types/express';
import { AuditEventType } from '../models/AuditLog';
import { logger } from '../utils/logger';

const auditService = new AuditService();

export class AuditController {
  /**
   * GET /audit
   * Получение логов текущего пользователя
   */
  async getLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.sub) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const eventType = req.query.eventType as AuditEventType | undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const result = await auditService.getUserLogs(req.user.sub, {
        limit: Math.min(limit, 100), // Максимум 100
        offset,
        eventType,
        startDate,
        endDate,
      });

      res.status(200).json({
        success: true,
        data: result.logs,
        pagination: {
          total: result.total,
          limit,
          offset,
          hasMore: offset + limit < result.total,
        },
      });
    } catch (error) {
      logger.error('Get audit logs error', {
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

