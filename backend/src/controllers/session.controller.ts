import { Response } from 'express';
import { SessionService } from '../services/session.service';
import { AuditService } from '../services/audit.service';
import { AuthenticatedRequest } from '../types/express';
import { logger } from '../utils/logger';

const sessionService = new SessionService();
const auditService = new AuditService();

export class SessionController {
  /**
   * GET /sessions
   * Получение всех активных сессий текущего пользователя
   */
  async getSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.sub) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const sessions = await sessionService.getUserSessions(req.user.sub);
      res.status(200).json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      logger.error('Get sessions error', {
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
   * DELETE /sessions/:sessionId
   * Отзыв конкретной сессии
   */
  async revokeSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.sub) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { sessionId } = req.params;
      // sessionId в параметрах - это jti (JWT ID)
      const session = await sessionService.getSessionByJti(sessionId);
      
      if (!session) {
        res.status(404).json({
          success: false,
          error: 'Session not found',
        });
        return;
      }

      // Проверяем, что сессия принадлежит текущему пользователю
      if (session.userId !== req.user.sub) {
        res.status(403).json({
          success: false,
          error: 'Forbidden: Session does not belong to current user',
        });
        return;
      }

      const revoked = await sessionService.revokeSession(sessionId);
      if (!revoked) {
        res.status(400).json({
          success: false,
          error: 'Session already revoked',
        });
        return;
      }

      // Логируем завершение сессии
      await auditService.logFromRequest(
        req,
        'session_revoked',
        `Session revoked: ${session.deviceId || session.userAgent || sessionId}`,
        req.user.sub,
        { sessionId, jti: sessionId, deviceId: session.deviceId }
      );

      res.status(200).json({
        success: true,
        message: 'Session revoked successfully',
      });
    } catch (error) {
      logger.error('Revoke session error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.sub,
        sessionId: req.params.sessionId,
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * DELETE /sessions
   * Отзыв всех сессий, кроме текущей
   */
  async revokeAllSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.sub || !req.user.jti) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const count = await sessionService.revokeAllUserSessionsExcept(
        req.user.sub,
        req.user.jti
      );

      // Логируем завершение всех сессий
      await auditService.logFromRequest(
        req,
        'session_revoked_all',
        `All other sessions revoked (${count} sessions)`,
        req.user.sub,
        { revokedCount: count }
      );

      res.status(200).json({
        success: true,
        message: `Revoked ${count} session(s)`,
        data: { revokedCount: count },
      });
    } catch (error) {
      logger.error('Revoke all sessions error', {
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

