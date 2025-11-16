import { SessionModel, SessionDocument } from '../models/Session';
import { JwtPayload } from '../types/jwt.types';
import { randomUUID } from 'crypto';

export interface SessionMetadata {
  ip?: string;
  userAgent?: string;
  deviceId?: string;
}

export interface SessionInfo {
  sessionId: string;
  userId: string;
  jti: string;
  deviceId?: string;
  userAgent?: string;
  ip?: string;
  createdAt: Date;
  lastUsedAt: Date;
  revokedAt?: Date;
}

export class SessionService {
  /**
   * Создание новой сессии
   */
  async createSession(
    userId: string,
    payload: JwtPayload,
    metadata: SessionMetadata
  ): Promise<SessionInfo> {
    // Генерируем jti, если его нет в payload
    const jti = payload.jti || randomUUID();

    const session = new SessionModel({
      userId,
      jti,
      deviceId: payload.deviceId || metadata.deviceId,
      userAgent: metadata.userAgent,
      ip: metadata.ip,
      lastUsedAt: new Date(),
    });

    await session.save();

    return this.toSessionInfo(session);
  }

  /**
   * Обновление времени последнего использования сессии
   */
  async touchSession(jti: string): Promise<void> {
    await SessionModel.findOneAndUpdate(
      { jti, revokedAt: null },
      { lastUsedAt: new Date() }
    );
  }

  /**
   * Отзыв сессии (logout)
   */
  async revokeSession(jti: string): Promise<boolean> {
    const result = await SessionModel.findOneAndUpdate(
      { jti, revokedAt: null },
      { revokedAt: new Date() },
      { new: true }
    );

    return !!result;
  }

  /**
   * Отзыв всех сессий пользователя, кроме указанной
   */
  async revokeAllUserSessionsExcept(userId: string, exceptJti: string): Promise<number> {
    const result = await SessionModel.updateMany(
      {
        userId,
        jti: { $ne: exceptJti },
        revokedAt: null,
      },
      {
        revokedAt: new Date(),
      }
    );

    return result.modifiedCount;
  }

  /**
   * Отзыв всех сессий пользователя
   */
  async revokeAllUserSessions(userId: string): Promise<number> {
    const result = await SessionModel.updateMany(
      {
        userId,
        revokedAt: null,
      },
      {
        revokedAt: new Date(),
      }
    );

    return result.modifiedCount;
  }

  /**
   * Получение всех активных сессий пользователя
   */
  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    const sessions = await SessionModel.find({
      userId,
      revokedAt: null,
    }).sort({ lastUsedAt: -1 });

    return sessions.map((session) => this.toSessionInfo(session));
  }

  /**
   * Получение сессии по jti
   */
  async getSessionByJti(jti: string): Promise<SessionInfo | null> {
    const session = await SessionModel.findOne({ jti });
    if (!session) {
      return null;
    }

    return this.toSessionInfo(session);
  }

  /**
   * Проверка, активна ли сессия
   */
  async isSessionActive(jti: string): Promise<boolean> {
    const session = await SessionModel.findOne({
      jti,
      revokedAt: null,
    });

    return !!session;
  }

  /**
   * Преобразование документа в SessionInfo
   */
  private toSessionInfo(session: SessionDocument): SessionInfo {
    return {
      sessionId: session._id.toString(),
      userId: session.userId.toString(),
      jti: session.jti,
      deviceId: session.deviceId,
      userAgent: session.userAgent,
      ip: session.ip,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      revokedAt: session.revokedAt,
    };
  }
}

