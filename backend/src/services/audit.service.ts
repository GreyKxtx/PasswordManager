import { AuditLogModel, AuditLogDocument, AuditEventType } from '../models/AuditLog';
import { Request } from 'express';

export interface CreateAuditLogParams {
  userId?: string;
  eventType: AuditEventType;
  description: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogInfo {
  logId: string;
  userId?: string;
  eventType: AuditEventType;
  description: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export class AuditService {
  /**
   * Создание записи аудита
   */
  async createLog(params: CreateAuditLogParams): Promise<AuditLogInfo> {
    const log = new AuditLogModel({
      userId: params.userId || undefined,
      eventType: params.eventType,
      description: params.description,
      ip: params.ip,
      userAgent: params.userAgent,
      metadata: params.metadata || {},
    });

    await log.save();
    return this.toAuditLogInfo(log);
  }

  /**
   * Создание записи аудита из Express Request
   */
  async logFromRequest(
    req: Request,
    eventType: AuditEventType,
    description: string,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<AuditLogInfo> {
    return this.createLog({
      userId,
      eventType,
      description,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      metadata,
    });
  }

  /**
   * Получение логов пользователя
   */
  async getUserLogs(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      eventType?: AuditEventType;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{ logs: AuditLogInfo[]; total: number }> {
    const query: any = { userId };

    if (options?.eventType) {
      query.eventType = options.eventType;
    }

    if (options?.startDate || options?.endDate) {
      query.createdAt = {};
      if (options.startDate) {
        query.createdAt.$gte = options.startDate;
      }
      if (options.endDate) {
        query.createdAt.$lte = options.endDate;
      }
    }

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const [logs, total] = await Promise.all([
      AuditLogModel.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean(),
      AuditLogModel.countDocuments(query),
    ]);

    return {
      logs: logs.map((log) => this.toAuditLogInfo(log as any)),
      total,
    };
  }

  /**
   * Получение всех логов (для админов, если нужно)
   */
  async getAllLogs(
    options?: {
      limit?: number;
      offset?: number;
      eventType?: AuditEventType;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{ logs: AuditLogInfo[]; total: number }> {
    const query: any = {};

    if (options?.userId) {
      query.userId = options.userId;
    }

    if (options?.eventType) {
      query.eventType = options.eventType;
    }

    if (options?.startDate || options?.endDate) {
      query.createdAt = {};
      if (options.startDate) {
        query.createdAt.$gte = options.startDate;
      }
      if (options.endDate) {
        query.createdAt.$lte = options.endDate;
      }
    }

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const [logs, total] = await Promise.all([
      AuditLogModel.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean(),
      AuditLogModel.countDocuments(query),
    ]);

    return {
      logs: logs.map((log) => this.toAuditLogInfo(log as any)),
      total,
    };
  }

  /**
   * Преобразование документа в AuditLogInfo
   */
  private toAuditLogInfo(log: AuditLogDocument | any): AuditLogInfo {
    return {
      logId: log._id?.toString() || log.logId,
      userId: log.userId?.toString() || log.userId || undefined,
      eventType: log.eventType,
      description: log.description,
      ip: log.ip,
      userAgent: log.userAgent,
      metadata: log.metadata,
      createdAt: log.createdAt,
    };
  }
}

