import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export type AuditEventType =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'register'
  | 'password_change'
  | 'vault_item_created'
  | 'vault_item_updated'
  | 'vault_item_deleted'
  | 'session_revoked'
  | 'session_revoked_all'
  | 'token_refresh'
  | 'unauthorized_access'
  | 'security_settings_changed';

export interface AuditLog {
  logId: string;
  userId?: string;
  eventType: AuditEventType;
  description: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuditService {
  private baseUrl = '/api/audit';

  constructor(private http: HttpClient) {}

  /**
   * Получение логов текущего пользователя
   */
  getLogs(options?: {
    limit?: number;
    offset?: number;
    eventType?: AuditEventType;
    startDate?: Date;
    endDate?: Date;
  }): Observable<AuditLogsResponse> {
    let params = new HttpParams();

    if (options?.limit) {
      params = params.set('limit', options.limit.toString());
    }
    if (options?.offset) {
      params = params.set('offset', options.offset.toString());
    }
    if (options?.eventType) {
      params = params.set('eventType', options.eventType);
    }
    if (options?.startDate) {
      params = params.set('startDate', options.startDate.toISOString());
    }
    if (options?.endDate) {
      params = params.set('endDate', options.endDate.toISOString());
    }

    return this.http
      .get<{ success: boolean; data: AuditLog[]; pagination: AuditLogsResponse['pagination'] }>(
        this.baseUrl,
        { params }
      )
      .pipe(
        map((response) => ({
          logs: response.data,
          pagination: response.pagination,
        })),
        catchError((error) => {
          console.error('Get audit logs error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Получение названия события на русском
   */
  getEventTypeLabel(eventType: AuditEventType): string {
    const labels: Record<AuditEventType, string> = {
      login_success: 'Успешный вход',
      login_failed: 'Неудачная попытка входа',
      logout: 'Выход из системы',
      register: 'Регистрация',
      password_change: 'Изменение пароля',
      vault_item_created: 'Создание записи',
      vault_item_updated: 'Обновление записи',
      vault_item_deleted: 'Удаление записи',
      session_revoked: 'Завершение сессии',
      session_revoked_all: 'Завершение всех сессий',
      token_refresh: 'Обновление токена',
      unauthorized_access: 'Неавторизованный доступ',
      security_settings_changed: 'Изменение настроек безопасности',
    };
    return labels[eventType] || eventType;
  }

  /**
   * Получение цвета для типа события
   */
  getEventTypeColor(eventType: AuditEventType): string {
    const colors: Record<AuditEventType, string> = {
      login_success: 'text-green-600 bg-green-50',
      login_failed: 'text-red-600 bg-red-50',
      logout: 'text-gray-600 bg-gray-50',
      register: 'text-blue-600 bg-blue-50',
      password_change: 'text-purple-600 bg-purple-50',
      vault_item_created: 'text-green-600 bg-green-50',
      vault_item_updated: 'text-blue-600 bg-blue-50',
      vault_item_deleted: 'text-red-600 bg-red-50',
      session_revoked: 'text-orange-600 bg-orange-50',
      session_revoked_all: 'text-orange-600 bg-orange-50',
      token_refresh: 'text-gray-600 bg-gray-50',
      unauthorized_access: 'text-red-600 bg-red-50',
      security_settings_changed: 'text-purple-600 bg-purple-50',
    };
    return colors[eventType] || 'text-gray-600 bg-gray-50';
  }
}

