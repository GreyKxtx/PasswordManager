import { Response, NextFunction } from 'express';
import { TokenService } from '../services/token.service';
import { AuditService } from '../services/audit.service';
import { SessionService } from '../services/session.service';
import { TokenNotFoundError, TokenExpiredError, TokenInvalidError } from '../utils/token-errors';
import { AuthenticatedRequest } from '../types/express';

const tokenService = new TokenService();
const auditService = new AuditService();
const sessionService = new SessionService();

/**
 * Извлечение токена из запроса
 * Поддерживает Authorization header и cookies
 */
function extractToken(req: AuthenticatedRequest): string | null {
  // 1. Проверяем Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 2. Проверяем cookie (если будет использоваться)
  // const tokenFromCookie = req.cookies?.accessToken;
  // if (tokenFromCookie) {
  //   return tokenFromCookie;
  // }

  return null;
}

/**
 * Middleware для проверки JWT токена
 * Выбрасывает AuthTokenError для централизованной обработки в errorHandler
 */
export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Извлекаем токен
    const token = extractToken(req);

    if (!token) {
      // Выбрасываем ошибку для централизованной обработки
      throw new TokenNotFoundError('No token provided');
    }

    // Верифицируем токен через TokenService
    // TokenService сам выбрасывает TokenExpiredError или TokenInvalidError
    const payload = tokenService.verifyAccessToken(token);
    
    // Проверяем, активна ли сессия в базе данных
    // Если jti есть в токене, проверяем статус сессии
    if (payload.jti) {
      const isActive = await sessionService.isSessionActive(payload.jti);
      if (!isActive) {
        // Сессия отозвана, выбрасываем ошибку
        throw new TokenInvalidError('Session revoked');
      }
    }
    
    // Сохраняем полный payload и userId для использования в контроллерах
    req.user = payload;
    req.userId = payload.sub; // Для обратной совместимости
    next();
  } catch (error) {
    // Логируем попытки неавторизованного доступа
    if (error instanceof TokenNotFoundError || error instanceof TokenExpiredError || error instanceof TokenInvalidError) {
      auditService.logFromRequest(
        req,
        'unauthorized_access',
        `Unauthorized access attempt: ${error.message}`,
        undefined,
        { path: req.path, method: req.method }
      ).catch(err => {
        // Используем console.error здесь, так как logger может быть недоступен
        console.error('Failed to log unauthorized access:', err);
      });
    }
    // Пробрасываем ошибку дальше для централизованной обработки
    next(error);
  }
};
