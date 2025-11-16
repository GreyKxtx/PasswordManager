import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, shareReplay } from 'rxjs';
import { AuthService } from '../services/auth.service';

// Глобальная переменная для хранения текущего refresh запроса
let refreshTokenRequest: ReturnType<typeof AuthService.prototype.refreshTokens> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  // Пропускаем запросы на refresh и login, чтобы избежать бесконечного цикла
  const url = req.url;
  if (url.includes('/auth/refresh') || url.includes('/auth/login') || url.includes('/auth/register')) {
    return next(req);
  }

  // Сохраняем оригинальный запрос для повторной попытки
  const originalRequest = req;

  // Добавляем токен к запросу, если он есть
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Если получили 401 и есть refresh token, пробуем обновить
      if (error.status === 401 && authService.getRefreshToken() && !url.includes('/auth/refresh')) {
        // Если уже есть активный refresh запрос, используем его
        if (!refreshTokenRequest) {
          refreshTokenRequest = authService.refreshTokens().pipe(
            shareReplay(1), // Кэшируем результат для всех подписчиков
            catchError((refreshError) => {
              // Очищаем глобальную переменную при ошибке
              refreshTokenRequest = null;
              // Если refresh не удался, выходим (clearSession уже делает navigate)
              authService.clearSession();
              return throwError(() => refreshError);
            })
          );
        }

        return refreshTokenRequest.pipe(
          switchMap((tokens) => {
            // Очищаем глобальную переменную после успешного refresh
            refreshTokenRequest = null;
            // Повторяем оригинальный запрос с новым токеном
            const clonedReq = originalRequest.clone({
              setHeaders: {
                Authorization: `Bearer ${tokens.accessToken}`,
              },
            });
            return next(clonedReq);
          }),
          catchError((refreshError) => {
            // Очищаем глобальную переменную при ошибке
            refreshTokenRequest = null;
            // Если refresh не удался, выходим (clearSession уже делает navigate)
            authService.clearSession();
            return throwError(() => refreshError);
          })
        );
      }

      // Для других ошибок просто пробрасываем
      return throwError(() => error);
    })
  );
};

