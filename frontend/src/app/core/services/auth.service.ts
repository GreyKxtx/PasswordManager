import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { AuthTokens, LoginCryptoData, RegisterCryptoData, User, LoginResponse } from '@password-manager/shared/types';
import { CryptoService } from './crypto.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'current_user';
  private readonly VAULT_KEY_KEY = 'vault_key_enc';
  private readonly VAULT_KEY_IV_KEY = 'vault_key_iv';
  private readonly VAULT_KEY_DECRYPTED_KEY = 'vault_key_decrypted'; // sessionStorage
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  
  private currentUserSubject = new BehaviorSubject<User | null>(this.getStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  private vaultKeySubject = new BehaviorSubject<CryptoKey | null>(null);
  public vaultKey$ = this.vaultKeySubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private cryptoService: CryptoService
  ) {
    // Загружаем vaultKey при старте, если есть сохраненные данные
    this.loadVaultKey();
  }

  isAuthenticated(): boolean {
    return this.hasToken();
  }

  private hasToken(): boolean {
    return !!localStorage.getItem(this.TOKEN_KEY);
  }

  login(credentials: LoginCryptoData): Observable<LoginResponse | { require2FA: true; method: string; tempToken: string }> {
    return this.http.post<{ success: boolean; data: LoginResponse | { require2FA: true; method: string; tempToken: string } }>('/api/auth/login', credentials).pipe(
      map(response => response.data),
      tap(async response => {
        // Проверяем, требуется ли 2FA
        if ('require2FA' in response && response.require2FA) {
          // Сохраняем tempToken для последующей проверки 2FA
          sessionStorage.setItem('temp_token_2fa', response.tempToken);
          // Не устанавливаем токены и не меняем состояние аутентификации
          return;
        }
        
        // Обычный логин без 2FA
        const loginResponse = response as LoginResponse;
        this.setTokens({
          accessToken: loginResponse.accessToken,
          refreshToken: loginResponse.refreshToken,
          tokenType: loginResponse.tokenType,
          expiresIn: loginResponse.expiresIn,
        });
        this.setCurrentUser(loginResponse.user);
        
        // Сохраняем зашифрованный vaultKey для последующей расшифровки
        localStorage.setItem(this.VAULT_KEY_KEY, loginResponse.vaultKeyEnc);
        localStorage.setItem(this.VAULT_KEY_IV_KEY, loginResponse.vaultKeyEncIV);
        
        this.isAuthenticatedSubject.next(true);
      }),
      catchError(error => {
        this.isAuthenticatedSubject.next(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Завершение логина с 2FA
   */
  verify2FA(code: string): Observable<LoginResponse> {
    const tempToken = sessionStorage.getItem('temp_token_2fa');
    if (!tempToken) {
      return throwError(() => new Error('No temporary token found'));
    }

    return this.http.post<{ success: boolean; data: LoginResponse }>('/api/auth/2fa/verify', {
      tempToken,
      code,
    }).pipe(
      map(response => response.data),
      tap(async response => {
        // Удаляем tempToken
        sessionStorage.removeItem('temp_token_2fa');
        
        this.setTokens({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          tokenType: response.tokenType,
          expiresIn: response.expiresIn,
        });
        this.setCurrentUser(response.user);
        
        // Сохраняем зашифрованный vaultKey для последующей расшифровки
        localStorage.setItem(this.VAULT_KEY_KEY, response.vaultKeyEnc);
        localStorage.setItem(this.VAULT_KEY_IV_KEY, response.vaultKeyEncIV);
        
        this.isAuthenticatedSubject.next(true);
      }),
      catchError(error => {
        this.isAuthenticatedSubject.next(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Завершение логина (для использования после расшифровки vaultKey)
   */
  finishLogin(response: LoginResponse, vaultKey: CryptoKey): void {
    this.setTokens({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      tokenType: response.tokenType,
      expiresIn: response.expiresIn,
    });
    this.setCurrentUser(response.user);
    this.setVaultKey(vaultKey);
    this.isAuthenticatedSubject.next(true);
  }

  register(data: RegisterCryptoData): Observable<{ userId: string }> {
    return this.http.post<{ success: boolean; data: { userId: string } }>('/api/auth/register', data).pipe(
      map(response => response.data),
      catchError(error => {
        // Логируем только ошибки (без чувствительных данных)
        console.error('[AUTH] Register failed:', error.status, error.error?.error || 'Unknown error');
        return throwError(() => error);
      })
    );
  }

  logout(): Observable<void> {
    return this.http.post<{ success: boolean; message?: string }>('/api/auth/logout', {}).pipe(
      tap((response) => {
        // Сессия успешно отозвана на сервере - очищаем локальную сессию
        // skipNavigation=false, чтобы выполнить редирект на логин
        this.clearSession(false);
      }),
      map(() => undefined),
      catchError(error => {
        // Даже если запрос не удался (например, токен уже истек), очищаем локальную сессию
        // Это гарантирует, что пользователь будет разлогинен локально в любом случае
        // skipNavigation=false, чтобы выполнить редирект на логин
        this.clearSession(false);
        return throwError(() => error);
      })
    );
  }

  clearSession(skipNavigation = false): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.VAULT_KEY_KEY);
    localStorage.removeItem(this.VAULT_KEY_IV_KEY);
    sessionStorage.removeItem(this.VAULT_KEY_DECRYPTED_KEY);
    sessionStorage.removeItem('temp_token_2fa'); // Очищаем tempToken для 2FA
    this.currentUserSubject.next(null);
    this.vaultKeySubject.next(null);
    this.isAuthenticatedSubject.next(false);
    
    // Пропускаем навигацию, если она уже будет выполнена в вызывающем коде
    if (!skipNavigation) {
      this.router.navigate(['/auth/login']);
    }
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  loadSessionOnStartup(): Observable<User | null> {
    if (!this.hasToken()) {
      this.isAuthenticatedSubject.next(false);
      this.currentUserSubject.next(null);
      return new Observable(observer => {
        observer.next(null);
        observer.complete();
      });
    }

    return this.http.get<{ success: boolean; data: User }>('/api/auth/me').pipe(
      map(response => response.data),
      tap(user => {
        this.setCurrentUser(user);
        this.isAuthenticatedSubject.next(true);
        // Загружаем vaultKey, если есть сохраненные данные
        this.loadVaultKey();
      }),
      catchError(error => {
        // Токен невалиден, очищаем сессию
        this.clearSession();
        return throwError(() => error);
      })
    );
  }

  /**
   * Получение vaultKey (для использования в VaultService)
   */
  async getVaultKey(): Promise<CryptoKey | null> {
    return this.vaultKeySubject.value;
  }

  /**
   * Установка vaultKey (после расшифровки при логине)
   */
  async setVaultKey(vaultKey: CryptoKey): Promise<void> {
    this.vaultKeySubject.next(vaultKey);
    // Сохраняем расшифрованный vaultKey в sessionStorage для восстановления после обновления страницы
    try {
      const vaultKeyBase64 = await this.cryptoService.exportKey(vaultKey);
      sessionStorage.setItem(this.VAULT_KEY_DECRYPTED_KEY, vaultKeyBase64);
    } catch (error) {
      console.error('Error saving vaultKey to sessionStorage:', error);
      // Не критично, просто не сохраним в sessionStorage
    }
  }

  /**
   * Загрузка vaultKey из sessionStorage (расшифрованный) или localStorage (зашифрованный)
   */
  private async loadVaultKey(): Promise<void> {
    // Сначала пробуем загрузить расшифрованный vaultKey из sessionStorage
    const vaultKeyDecrypted = sessionStorage.getItem(this.VAULT_KEY_DECRYPTED_KEY);
    if (vaultKeyDecrypted) {
      try {
        const vaultKey = await this.cryptoService.importKey(vaultKeyDecrypted);
        this.vaultKeySubject.next(vaultKey);
        return;
      } catch (error) {
        console.error('Error importing vaultKey from sessionStorage:', error);
        // Если не удалось импортировать, удаляем невалидные данные
        sessionStorage.removeItem(this.VAULT_KEY_DECRYPTED_KEY);
      }
    }
    
    // Если нет расшифрованного vaultKey в sessionStorage, проверяем зашифрованный в localStorage
    // Но без мастер-пароля мы не можем его расшифровать, поэтому оставляем null
    // Пользователю нужно будет войти снова
    const vaultKeyEnc = localStorage.getItem(this.VAULT_KEY_KEY);
    const vaultKeyIV = localStorage.getItem(this.VAULT_KEY_IV_KEY);
    
    if (vaultKeyEnc && vaultKeyIV) {
      // Зашифрованный vaultKey есть, но без мастер-пароля мы не можем его расшифровать
      // Оставляем null - пользователю нужно будет войти снова
      this.vaultKeySubject.next(null);
    }
  }

  refreshTokens(): Observable<AuthTokens> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.clearSession();
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<{ success: boolean; data: AuthTokens }>('/api/auth/refresh', { refreshToken }).pipe(
      map(response => response.data),
      tap(tokens => {
        this.setTokens(tokens);
      }),
      catchError(error => {
        // Refresh token невалиден, выходим
        this.clearSession();
        return throwError(() => error);
      })
    );
  }

  private setTokens(tokens: AuthTokens): void {
    localStorage.setItem(this.TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken);
  }

  private setCurrentUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private getStoredUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    if (!userStr) {
      return null;
    }
    try {
      const user = JSON.parse(userStr);
      // Преобразуем строки дат обратно в Date объекты
      if (user.createdAt) {
        user.createdAt = new Date(user.createdAt);
      }
      return user;
    } catch {
      return null;
    }
  }
}

