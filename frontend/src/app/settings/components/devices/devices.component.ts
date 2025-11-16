import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiButtonComponent } from '../../../shared/ui/button/button.component';
import { UiCardComponent, UiCardHeaderComponent, UiCardTitleComponent, UiCardContentComponent } from '../../../shared/ui/card/card.component';
import { UiDialogComponent } from '../../../shared/ui/dialog/dialog.component';
import { SessionService, Session } from '../../../core/services/session.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-devices',
  standalone: true,
  imports: [
    CommonModule,
    UiButtonComponent,
    UiCardComponent,
    UiCardHeaderComponent,
    UiCardTitleComponent,
    UiCardContentComponent,
    UiDialogComponent,
  ],
  templateUrl: './devices.component.html',
})
export class DevicesComponent implements OnInit {
  sessions: Session[] = [];
  isLoading = false;
  currentJti: string | null = null;
  showRevokeDialog = false;
  showRevokeAllDialog = false;
  sessionToRevoke: Session | null = null;

  constructor(
    private sessionService: SessionService,
    private toastService: ToastService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Получаем текущий jti из токена
    const token = this.authService.getAccessToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.currentJti = payload.jti || null;
      } catch (e) {
        console.error('Error parsing token:', e);
      }
    }

    this.loadSessions();
  }

  loadSessions(): void {
    this.isLoading = true;
    this.sessionService.getSessions().subscribe({
      next: (sessions) => {
        this.sessions = sessions;
        this.isLoading = false;
      },
      error: () => {
        this.toastService.error('Ошибка загрузки сессий');
        this.isLoading = false;
      },
    });
  }

  isCurrentSession(session: Session): boolean {
    return session.jti === this.currentJti;
  }

  onRevokeClick(session: Session): void {
    if (this.isCurrentSession(session)) {
      this.toastService.error('Нельзя завершить текущую сессию');
      return;
    }
    this.sessionToRevoke = session;
    this.showRevokeDialog = true;
  }

  onRevokeAllClick(): void {
    const otherSessions = this.sessions.filter(s => !this.isCurrentSession(s));
    if (otherSessions.length === 0) {
      this.toastService.warning('Нет других активных сессий');
      return;
    }
    this.showRevokeAllDialog = true;
  }

  onConfirmRevoke(): void {
    if (!this.sessionToRevoke) {
      return;
    }

    this.sessionService.revokeSession(this.sessionToRevoke.jti).subscribe({
      next: () => {
        this.toastService.success('Сессия успешно завершена');
        this.showRevokeDialog = false;
        this.sessionToRevoke = null;
        this.loadSessions();
      },
      error: (error) => {
        console.error('Revoke session error:', error);
        const errorMessage = error.error?.error || 'Ошибка завершения сессии';
        this.toastService.error(errorMessage);
        this.showRevokeDialog = false;
        this.sessionToRevoke = null;
      },
    });
  }

  onCancelRevoke(): void {
    this.showRevokeDialog = false;
    this.sessionToRevoke = null;
  }

  onConfirmRevokeAll(): void {
    this.sessionService.revokeAllSessions().subscribe({
      next: (result) => {
        this.toastService.success(`Завершено ${result.revokedCount} сессий`);
        this.showRevokeAllDialog = false;
        this.loadSessions();
      },
      error: (error) => {
        console.error('Revoke all sessions error:', error);
        const errorMessage = error.error?.error || 'Ошибка завершения сессий';
        this.toastService.error(errorMessage);
        this.showRevokeAllDialog = false;
      },
    });
  }

  onCancelRevokeAll(): void {
    this.showRevokeAllDialog = false;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  getDeviceName(session: Session): string {
    if (session.deviceId) {
      return session.deviceId;
    }
    if (session.userAgent) {
      return this.parseUserAgent(session.userAgent);
    }
    return 'Неизвестное устройство';
  }

  parseUserAgent(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    
    // Определяем браузер
    let browser = '';
    if (ua.includes('chrome') && !ua.includes('edg')) {
      browser = 'Chrome';
    } else if (ua.includes('firefox')) {
      browser = 'Firefox';
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
      browser = 'Safari';
    } else if (ua.includes('edg')) {
      browser = 'Edge';
    } else if (ua.includes('opera') || ua.includes('opr')) {
      browser = 'Opera';
    }
    
    // Определяем ОС
    let os = '';
    if (ua.includes('windows')) {
      if (ua.includes('windows nt 10.0')) {
        os = 'Windows 10/11';
      } else if (ua.includes('windows nt 6.3')) {
        os = 'Windows 8.1';
      } else if (ua.includes('windows nt 6.2')) {
        os = 'Windows 8';
      } else if (ua.includes('windows nt 6.1')) {
        os = 'Windows 7';
      } else {
        os = 'Windows';
      }
    } else if (ua.includes('mac os x') || ua.includes('macintosh')) {
      os = 'macOS';
    } else if (ua.includes('linux')) {
      os = 'Linux';
    } else if (ua.includes('android')) {
      os = 'Android';
    } else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) {
      os = 'iOS';
    }
    
    // Комбинируем
    if (os && browser) {
      return `${os} • ${browser}`;
    } else if (os) {
      return os;
    } else if (browser) {
      return browser;
    }
    
    return 'Неизвестное устройство';
  }

  getOtherSessionsCount(): number {
    return this.sessions.filter(s => !this.isCurrentSession(s)).length;
  }
}
