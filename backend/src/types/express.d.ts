import { Request } from 'express';
import { JwtPayload } from './jwt.types';

/**
 * Расширение Express Request для авторизованных запросов
 */
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  userId?: string; // Для обратной совместимости
}

