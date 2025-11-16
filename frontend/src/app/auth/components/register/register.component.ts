import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UiButtonComponent } from '../../../shared/ui/button/button.component';
import { UiInputComponent } from '../../../shared/ui/input/input.component';
import { UiLabelComponent } from '../../../shared/ui/label/label.component';
import { UiCardComponent, UiCardHeaderComponent, UiCardTitleComponent, UiCardContentComponent, UiCardFooterComponent } from '../../../shared/ui/card/card.component';
import { AuthService } from '../../../core/services/auth.service';
import { CryptoService } from '../../../core/services/crypto.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { RegisterCryptoData } from '@password-manager/shared/types';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-register',
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
  ],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  registerForm: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private cryptoService: CryptoService,
    private router: Router,
    private toastService: ToastService
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      masterPassword: ['', [Validators.required, Validators.minLength(12)]],
      confirmPassword: ['', [Validators.required]],
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(group: FormGroup) {
    const password = group.get('masterPassword');
    const confirmPassword = group.get('confirmPassword');
    return password && confirmPassword && password.value === confirmPassword.value
      ? null
      : { mismatch: true };
  }

  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid) {
      return;
    }

    this.isLoading = true;
    const { email, masterPassword } = this.registerForm.value;

    try {
      // Генерируем salt для KDF
      const salt = this.cryptoService.generateSalt();
      
      // Параметры KDF для Argon2id
      const kdfParams = {
        algorithm: 'argon2id' as const,
        memory: 19456, // ~19 MB в KB
        iterations: 2, // Рекомендуемое значение для Argon2id
        parallelism: 1,
        salt,
      };

      // Вычисляем passwordVerifier напрямую через Argon2id
      const passwordVerifier = await this.cryptoService.computePasswordVerifier(masterPassword, kdfParams);

      // Вычисляем passwordKey для шифрования vaultKey
      const passwordKey = await this.cryptoService.deriveKeyFromPassword(masterPassword, kdfParams);
      
      // Генерируем vaultKey
      const vaultKey = await this.cryptoService.generateRandomKey();
      
      // Экспортируем vaultKey в base64 для шифрования
      const vaultKeyBase64 = await this.cryptoService.exportKey(vaultKey);
      
      // Шифруем vaultKey с помощью passwordKey
      const vaultKeyEncrypted = await this.cryptoService.encryptJson(passwordKey, { key: vaultKeyBase64 });

      // Отладочное логирование (только в dev режиме)
      if (!environment.production) {
        console.log('[REGISTER] passwordVerifier length:', passwordVerifier.length);
        console.log('[REGISTER] kdfParams:', JSON.stringify(kdfParams));
      }

      const registerData: RegisterCryptoData = {
        email,
        passwordVerifier,
        kdfParams,
        vaultKeyEnc: vaultKeyEncrypted.ciphertext,
        vaultKeyEncIV: vaultKeyEncrypted.iv,
      };

      this.authService.register(registerData).subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigate(['/auth/login']);
          this.toastService.success('Регистрация успешна. Теперь вы можете войти.');
        },
        error: (error) => {
          this.isLoading = false;
          const errorMessage = error.status === 409
            ? 'Пользователь с таким email уже существует'
            : error.error?.error || 'Ошибка регистрации';
          this.toastService.error(errorMessage);
        },
      });
    } catch (error) {
      this.isLoading = false;
      console.error('Registration crypto error:', error);
      this.toastService.error('Ошибка при обработке пароля');
    }
  }
}

