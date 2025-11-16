import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface Session {
  sessionId: string;
  userId: string;
  jti: string;
  deviceId?: string;
  userAgent?: string;
  ip?: string;
  createdAt: string;
  lastUsedAt: string;
  revokedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private baseUrl = '/api/sessions';

  constructor(private http: HttpClient) {}

  /**
   * Получение всех активных сессий текущего пользователя
   */
  getSessions(): Observable<Session[]> {
    return this.http.get<{ success: boolean; data: Session[] }>(this.baseUrl).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Get sessions error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Отзыв конкретной сессии
   */
  revokeSession(sessionId: string): Observable<void> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${sessionId}`).pipe(
      map(() => undefined),
      catchError(error => {
        console.error('Revoke session error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Отзыв всех сессий, кроме текущей
   */
  revokeAllSessions(): Observable<{ revokedCount: number }> {
    return this.http.delete<{ success: boolean; message: string; data: { revokedCount: number } }>(this.baseUrl).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Revoke all sessions error:', error);
        return throwError(() => error);
      })
    );
  }
}

