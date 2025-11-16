import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UiButtonComponent } from '../../../shared/ui/button/button.component';
import { UiInputComponent } from '../../../shared/ui/input/input.component';
import { UiLabelComponent } from '../../../shared/ui/label/label.component';
import { UiCardComponent, UiCardHeaderComponent, UiCardTitleComponent, UiCardContentComponent } from '../../../shared/ui/card/card.component';
import { UiSpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { AuthService } from '../../../core/services/auth.service';
import { CryptoService } from '../../../core/services/crypto.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { LoginResponse } from '@password-manager/shared/types';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-two-factor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    UiButtonComponent,
    UiInputComponent,
    UiLabelComponent,
    UiCardComponent,
    UiCardHeaderComponent,
    UiCardTitleComponent,
    UiCardContentComponent,
    UiSpinnerComponent,
  ],
  templateUrl: './two-factor.component.html',
})
export class TwoFactorComponent implements OnInit {
  totpForm: FormGroup;
  isLoading = false;
  hasTempToken = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private cryptoService: CryptoService,
    private toastService: ToastService
  ) {
    this.totpForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    });
  }

  ngOnInit(): void {
    // Проверяем наличие tempToken
    const tempToken = sessionStorage.getItem('temp_token_2fa');
    if (!tempToken) {
      // Если нет tempToken, редиректим на логин
      this.router.navigate(['/auth/login']);
      return;
    }
    this.hasTempToken = true;
  }

  async onSubmit(): Promise<void> {
    if (this.totpForm.invalid) {
      return;
    }

    this.isLoading = true;
    const { code } = this.totpForm.value;

    try {
      this.authService.verify2FA(code).subscribe({
        next: async (response: LoginResponse) => {
          // Получаем сохраненный passwordKey для расшифровки vaultKey
          const passwordKeyBase64 = sessionStorage.getItem('password_key_temp');
          if (!passwordKeyBase64) {
            throw new Error('Password key not found');
          }

          try {
            const passwordKey = await this.cryptoService.importKey(passwordKeyBase64);
            
            // Расшифровываем vaultKey
            const vaultKeyEncrypted = {
              iv: response.vaultKeyEncIV,
              ciphertext: response.vaultKeyEnc,
            };
            
            const vaultKeyData = await this.cryptoService.decryptJson<{ key: string }>(passwordKey, vaultKeyEncrypted);
            const vaultKey = await this.cryptoService.importKey(vaultKeyData.key);
            
            // Отладочное логирование (только в dev режиме)
            if (!environment.production) {
              console.log('[2FA] VaultKey decrypted successfully');
            }
            
            // Сохраняем vaultKey
            await this.authService.setVaultKey(vaultKey);
            
            // Очищаем временный passwordKey
            sessionStorage.removeItem('password_key_temp');
            
            // Проверяем, что vaultKey сохранен
            const savedVaultKey = await this.authService.getVaultKey();
            if (!savedVaultKey) {
              throw new Error('Failed to save vault key');
            }
            
            this.isLoading = false;
            this.router.navigate(['/vault']);
            this.toastService.success('Успешный вход');
          } catch (error) {
            console.error('Error decrypting vault key:', error);
            this.isLoading = false;
            this.toastService.error('Ошибка при расшифровке vault key');
          }
        },
        error: (error) => {
          this.isLoading = false;
          const errorMessage = error.status === 401 
            ? 'Неверный код'
            : error.error?.error || 'Ошибка проверки кода. Попробуйте еще раз.';
          this.toastService.error(errorMessage);
        },
      });
    } catch (error) {
      this.isLoading = false;
      console.error('2FA verification error:', error);
      this.toastService.error('Ошибка при проверке кода');
    }
  }
}

