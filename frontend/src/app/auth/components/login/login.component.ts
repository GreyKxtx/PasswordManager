import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UiButtonComponent } from '../../../shared/ui/button/button.component';
import { UiInputComponent } from '../../../shared/ui/input/input.component';
import { UiLabelComponent } from '../../../shared/ui/label/label.component';
import { UiCardComponent, UiCardHeaderComponent, UiCardTitleComponent, UiCardContentComponent, UiCardFooterComponent } from '../../../shared/ui/card/card.component';
import { UiSpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { AuthService } from '../../../core/services/auth.service';
import { CryptoService } from '../../../core/services/crypto.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { LoginCryptoData, LoginResponse } from '@password-manager/shared/types';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    UiButtonComponent,
    UiInputComponent,
    UiLabelComponent,
    UiCardComponent,
    UiCardHeaderComponent,
    UiCardTitleComponent,
    UiCardContentComponent,
    UiCardFooterComponent,
    UiSpinnerComponent,
  ],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  loginForm: FormGroup;
  showPassword = false;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private cryptoService: CryptoService,
    private router: Router,
    private toastService: ToastService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      masterPassword: ['', [Validators.required]],
      rememberMe: [false],
    });
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    const { email, masterPassword } = this.loginForm.value;

    try {
      // Получаем KDF параметры пользователя
      const kdfParamsResponse = await fetch(`/api/auth/login/params?email=${encodeURIComponent(email)}`);
      const kdfParamsData = await kdfParamsResponse.json();
      
      if (!kdfParamsData.success || !kdfParamsData.data) {
        throw new Error('Не удалось получить параметры входа');
      }

      const kdfParams = kdfParamsData.data;

      // Отладочное логирование (только в dev режиме)
      if (!environment.production) {
        console.log('[LOGIN] kdfParams from server:', JSON.stringify(kdfParams));
      }

      // Вычисляем passwordVerifier напрямую через Argon2id
      const passwordVerifier = await this.cryptoService.computePasswordVerifier(masterPassword, kdfParams);

      // Вычисляем passwordKey для расшифровки vaultKey
      const passwordKey = await this.cryptoService.deriveKeyFromPassword(masterPassword, kdfParams);

      const loginData: LoginCryptoData = {
        email,
        passwordVerifier,
      };

      this.authService.login(loginData).subscribe({
        next: async (response) => {
          // Проверяем, требуется ли 2FA
          if ('require2FA' in response && response.require2FA) {
            // Сохраняем passwordKey для последующей расшифровки vaultKey после 2FA
            // Используем sessionStorage, так как это временные данные
            try {
              const passwordKeyBase64 = await this.cryptoService.exportKey(passwordKey);
              sessionStorage.setItem('password_key_temp', passwordKeyBase64);
            } catch (error) {
              console.error('Error saving password key:', error);
            }
            
            this.isLoading = false;
            // Редирект на страницу 2FA
            this.router.navigate(['/auth/2fa']);
            return;
          }
          
          // Обычный логин без 2FA
          const loginResponse = response as LoginResponse;
          
          // Расшифровываем vaultKey после успешного логина
          try {
            const vaultKeyEncrypted = {
              iv: loginResponse.vaultKeyEncIV,
              ciphertext: loginResponse.vaultKeyEnc,
            };
            
            const vaultKeyData = await this.cryptoService.decryptJson<{ key: string }>(passwordKey, vaultKeyEncrypted);
            const vaultKey = await this.cryptoService.importKey(vaultKeyData.key);
            
            // Отладочное логирование (только в dev режиме)
            if (!environment.production) {
              console.log('[LOGIN] VaultKey decrypted successfully');
            }
            
            // Сохраняем vaultKey в AuthService (async, но не ждем)
            await this.authService.setVaultKey(vaultKey);
            
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
            ? 'Неверный email или пароль'
            : error.error?.error || 'Ошибка входа. Проверьте данные.';
          this.toastService.error(errorMessage);
        },
      });
    } catch (error) {
      this.isLoading = false;
      console.error('Login crypto error:', error);
      this.toastService.error('Ошибка при обработке пароля');
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}

