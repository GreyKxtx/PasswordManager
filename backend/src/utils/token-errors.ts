/**
 * Кастомные ошибки для работы с токенами
 */

/**
 * Базовый класс для ошибок авторизации
 */
export class AuthTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthTokenError';
    Object.setPrototypeOf(this, AuthTokenError.prototype);
  }
}

/**
 * Ошибка истечения токена
 */
export class TokenExpiredError extends AuthTokenError {
  constructor(message = 'Token expired') {
    super(message);
    this.name = 'TokenExpiredError';
    Object.setPrototypeOf(this, TokenExpiredError.prototype);
  }
}

/**
 * Ошибка невалидного токена
 */
export class TokenInvalidError extends AuthTokenError {
  constructor(message = 'Invalid token') {
    super(message);
    this.name = 'TokenInvalidError';
    Object.setPrototypeOf(this, TokenInvalidError.prototype);
  }
}

/**
 * Ошибка отсутствия токена
 */
export class TokenNotFoundError extends AuthTokenError {
  constructor(message = 'Token not provided') {
    super(message);
    this.name = 'TokenNotFoundError';
    Object.setPrototypeOf(this, TokenNotFoundError.prototype);
  }
}
