import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { UiButtonComponent } from '../../../shared/ui/button/button.component';
import { UiCardComponent, UiCardHeaderComponent, UiCardTitleComponent, UiCardContentComponent } from '../../../shared/ui/card/card.component';
import { UiInputComponent } from '../../../shared/ui/input/input.component';
import { UiLabelComponent } from '../../../shared/ui/label/label.component';
import { UiSpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { UiDialogComponent } from '../../../shared/ui/dialog/dialog.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { UiQrcodeComponent } from '../../../shared/ui/qrcode/qrcode.component';

interface TotpSetupResponse {
  success: boolean;
  data: {
    secretBase32: string;
    otpauthUrl: string;
  };
}

@Component({
  selector: 'app-security',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    UiButtonComponent,
    UiCardComponent,
    UiCardHeaderComponent,
    UiCardTitleComponent,
    UiCardContentComponent,
    UiInputComponent,
    UiLabelComponent,
    UiSpinnerComponent,
    UiDialogComponent,
    UiQrcodeComponent,
  ],
  templateUrl: './security.component.html',
})
export class SecurityComponent implements OnInit, OnDestroy {
  twoFactorEnabled = false;
  isLoading = false;
  isSettingUp = false;
  showSetupDialog = false;
  showDisableDialog = false;
  secretBase32 = '';
  otpauthUrl = '';
  confirmCodeForm: FormGroup;
  disableCodeForm: FormGroup;
  private userSubscription?: Subscription;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private toastService: ToastService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.confirmCodeForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    });
    
    this.disableCodeForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    });
  }

  ngOnInit(): void {
    this.loadUserStatus();
    
    // Подписываемся на изменения пользователя
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      if (user) {
        const newValue = user.twoFactorEnabled || false;
        if (this.twoFactorEnabled !== newValue) {
          console.log('[SECURITY] User status changed, twoFactorEnabled:', newValue);
          this.twoFactorEnabled = newValue;
          this.cdr.detectChanges();
        }
      }
    });
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  loadUserStatus(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.twoFactorEnabled = user.twoFactorEnabled || false;
      console.log('[SECURITY] Loaded user status, twoFactorEnabled:', this.twoFactorEnabled);
    } else {
      console.log('[SECURITY] No user found');
    }
  }

  private async reloadUser(): Promise<void> {
    try {
      // Используем метод loadSessionOnStartup для обновления пользователя
      await this.authService.loadSessionOnStartup().toPromise();
      // Обновляем локальное состояние
      this.loadUserStatus();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error reloading user:', error);
    }
  }

  async startTotpSetup(): Promise<void> {
    this.isLoading = true;
    try {
      const response = await this.http.post<TotpSetupResponse>('/api/auth/totp/setup', {}).toPromise();
      if (response?.success && response.data) {
        this.secretBase32 = response.data.secretBase32;
        this.otpauthUrl = response.data.otpauthUrl;
        this.isSettingUp = true;
        this.showSetupDialog = true;
      } else {
        this.toastService.error('Ошибка при настройке TOTP');
      }
    } catch (error: any) {
      console.error('TOTP setup error:', error);
      const errorMessage = error.error?.error || 'Ошибка при настройке TOTP';
      this.toastService.error(errorMessage);
    } finally {
      this.isLoading = false;
    }
  }

  async confirmTotpSetup(): Promise<void> {
    if (this.confirmCodeForm.invalid) {
      return;
    }

    this.isLoading = true;
    const { code } = this.confirmCodeForm.value;

    try {
      const response = await this.http.post<{ success: boolean; message?: string }>('/api/auth/totp/confirm', { code }).toPromise();
      if (response?.success) {
        // Перезагружаем данные пользователя с сервера
        await this.reloadUser();
        
        // Обновляем состояние в следующем цикле обнаружения изменений
        setTimeout(() => {
          this.showSetupDialog = false;
          this.isSettingUp = false;
          this.confirmCodeForm.reset();
          this.cdr.detectChanges();
        });
        
        this.toastService.success('TOTP успешно включен');
      } else {
        this.toastService.error('Неверный код. Проверьте время и попробуйте еще раз.');
      }
    } catch (error: any) {
      console.error('TOTP confirm error:', error);
      const errorMessage = error.error?.error || 'Ошибка при подтверждении кода';
      this.toastService.error(errorMessage);
    } finally {
      this.isLoading = false;
    }
  }

  cancelSetup(): void {
    this.showSetupDialog = false;
    this.isSettingUp = false;
    this.secretBase32 = '';
    this.otpauthUrl = '';
    this.confirmCodeForm.reset();
  }

  openDisableDialog(): void {
    this.showDisableDialog = true;
  }

  cancelDisable(): void {
    this.showDisableDialog = false;
    this.disableCodeForm.reset();
  }

  async disableTotp(): Promise<void> {
    if (this.disableCodeForm.invalid) {
      return;
    }

    this.isLoading = true;
    const { code } = this.disableCodeForm.value;

    try {
      const response = await this.http.post<{ success: boolean; message?: string }>('/api/auth/totp/disable', { code }).toPromise();
      if (response?.success) {
        // Перезагружаем данные пользователя с сервера
        await this.reloadUser();
        
        // Обновляем состояние в следующем цикле обнаружения изменений
        setTimeout(() => {
          this.showDisableDialog = false;
          this.disableCodeForm.reset();
          this.cdr.detectChanges();
        });
        
        this.toastService.success('TOTP отключен');
      } else {
        this.toastService.error('Неверный код');
      }
    } catch (error: any) {
      console.error('TOTP disable error:', error);
      const errorMessage = error.error?.error || 'Ошибка при отключении TOTP';
      this.toastService.error(errorMessage);
    } finally {
      this.isLoading = false;
    }
  }

  async copySecret(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.secretBase32);
      this.toastService.success('Секрет скопирован');
    } catch (error) {
      console.error('Error copying secret:', error);
      this.toastService.error('Не удалось скопировать секрет');
    }
  }
}
