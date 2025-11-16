import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiCardComponent, UiCardHeaderComponent, UiCardTitleComponent, UiCardContentComponent } from '../../../shared/ui/card/card.component';
import { UiButtonComponent } from '../../../shared/ui/button/button.component';
import { UiInputComponent } from '../../../shared/ui/input/input.component';
import { AuditService, AuditLog, AuditEventType } from '../../../core/services/audit.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    UiCardComponent,
    UiCardHeaderComponent,
    UiCardTitleComponent,
    UiCardContentComponent,
    UiButtonComponent,
    UiInputComponent,
  ],
  templateUrl: './audit.component.html',
})
export class AuditComponent implements OnInit {
  logs: AuditLog[] = [];
  isLoading = false;
  total = 0;
  limit = 50;
  offset = 0;
  hasMore = false;
  
  // Фильтры
  selectedEventType: AuditEventType | 'all' = 'all';
  startDate: string = '';
  endDate: string = '';

  eventTypes: Array<{ value: AuditEventType | 'all'; label: string }> = [
    { value: 'all', label: 'Все события' },
    { value: 'login_success', label: 'Успешный вход' },
    { value: 'login_failed', label: 'Неудачная попытка входа' },
    { value: 'logout', label: 'Выход из системы' },
    { value: 'register', label: 'Регистрация' },
    { value: 'vault_item_created', label: 'Создание записи' },
    { value: 'vault_item_updated', label: 'Обновление записи' },
    { value: 'vault_item_deleted', label: 'Удаление записи' },
    { value: 'session_revoked', label: 'Завершение сессии' },
    { value: 'session_revoked_all', label: 'Завершение всех сессий' },
    { value: 'token_refresh', label: 'Обновление токена' },
    { value: 'unauthorized_access', label: 'Неавторизованный доступ' },
  ];

  constructor(
    private auditService: AuditService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.isLoading = true;
    
    const options: any = {
      limit: this.limit,
      offset: this.offset,
    };

    if (this.selectedEventType !== 'all') {
      options.eventType = this.selectedEventType;
    }

    if (this.startDate) {
      options.startDate = new Date(this.startDate);
    }

    if (this.endDate) {
      options.endDate = new Date(this.endDate);
    }

    this.auditService.getLogs(options).subscribe({
      next: (response) => {
        this.logs = response.logs;
        this.total = response.pagination.total;
        this.hasMore = response.pagination.hasMore;
        this.isLoading = false;
      },
      error: () => {
        this.toastService.error('Ошибка загрузки логов');
        this.isLoading = false;
      },
    });
  }

  onFilterChange(): void {
    this.offset = 0;
    this.loadLogs();
  }

  loadMore(): void {
    if (this.hasMore && !this.isLoading) {
      this.offset += this.limit;
      this.loadLogs();
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  }

  getEventTypeLabel(eventType: AuditEventType): string {
    return this.auditService.getEventTypeLabel(eventType);
  }

  getEventTypeColor(eventType: AuditEventType): string {
    return this.auditService.getEventTypeColor(eventType);
  }

  /**
   * Проверка наличия метаданных
   */
  hasMetadata(log: AuditLog): boolean {
    return !!(log.metadata && Object.keys(log.metadata).length > 0);
  }

  /**
   * Форматирование метаданных в JSON
   */
  formatMetadata(metadata: Record<string, any> | undefined): string {
    if (!metadata) return '';
    return JSON.stringify(metadata, null, 2);
  }
}
