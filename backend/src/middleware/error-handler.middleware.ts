import { Request, Response, NextFunction } from 'express';
import { AuthTokenError } from '../utils/token-errors';
import { logger } from '../utils/logger';

/**
 * Централизованный обработчик ошибок
 */
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  // Обработка ошибок авторизации
  if (err instanceof AuthTokenError) {
    // Логируем security-события для аудита
    logger.warn(`Auth error: ${err.name}`, {
      message: err.message,
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    res.status(401).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Обработка остальных ошибок
  logger.error('Unhandled error', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
};
