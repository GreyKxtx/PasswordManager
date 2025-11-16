import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { VaultItem, VaultItemDecrypted, CreateVaultItemPayload, UpdateVaultItemPayload, VaultSecretData } from '../types/vault.types';
import { CryptoService } from './crypto.service';
import { AuthService } from './auth.service';

/**
 * Сервис для работы с хранилищем паролей
 * Интегрирован с бэкенд API
 */
@Injectable({
  providedIn: 'root',
})
export class VaultService {
  private baseUrl = '/api/vault';
  private itemsSubject = new BehaviorSubject<VaultItemDecrypted[]>([]);
  public items$ = this.itemsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private cryptoService: CryptoService,
    private authService: AuthService
  ) {}

  /**
   * Получение всех записей (с опциональным поиском)
   */
  getItems(query?: string): Observable<VaultItemDecrypted[]> {
    let params = new HttpParams();
    if (query) {
      params = params.set('q', query);
    }

    return this.http.get<{ success: boolean; data: VaultItem[] }>(`${this.baseUrl}/items`, { params }).pipe(
      map(response => response.data),
      map(items => items.map(item => this.toDecryptedItem(item))), // Пока без расшифровки секретов
      tap(items => this.itemsSubject.next(items)),
      catchError(error => {
        console.error('Get vault items error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Получение конкретной записи (расшифрованная, без секретов)
   */
  getItem(id: string): Observable<VaultItemDecrypted> {
    return this.http.get<{ success: boolean; data: VaultItem }>(`${this.baseUrl}/items/${id}`).pipe(
      map(response => response.data),
      map(item => this.toDecryptedItem(item)),
      catchError(error => {
        console.error('Get vault item error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Получение полной записи с зашифрованными данными (для расшифровки)
   */
  getItemRaw(id: string): Observable<VaultItem> {
    return this.http.get<{ success: boolean; data: VaultItem }>(`${this.baseUrl}/items/${id}`).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Get vault item raw error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Создание новой записи
   */
  createItem(payload: CreateVaultItemPayload): Observable<VaultItemDecrypted> {
    return this.http.post<{ success: boolean; data: VaultItem }>(`${this.baseUrl}/items`, payload).pipe(
      map(response => response.data),
      map(item => this.toDecryptedItem(item)),
      tap(item => {
        const currentItems = this.itemsSubject.value;
        this.itemsSubject.next([item, ...currentItems]);
      }),
      catchError(error => {
        console.error('Create vault item error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Обновление записи
   */
  updateItem(id: string, payload: UpdateVaultItemPayload): Observable<VaultItemDecrypted> {
    return this.http.put<{ success: boolean; data: VaultItem }>(`${this.baseUrl}/items/${id}`, payload).pipe(
      map(response => response.data),
      map(item => this.toDecryptedItem(item)),
      tap(updatedItem => {
        const currentItems = this.itemsSubject.value;
        const index = currentItems.findIndex(item => item.id === id);
        if (index !== -1) {
          currentItems[index] = updatedItem;
          this.itemsSubject.next([...currentItems]);
        }
      }),
      catchError(error => {
        console.error('Update vault item error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Удаление записи
   */
  deleteItem(id: string): Observable<void> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/items/${id}`).pipe(
      tap(() => {
        const currentItems = this.itemsSubject.value;
        this.itemsSubject.next(currentItems.filter(item => item.id !== id));
      }),
      map(() => undefined),
      catchError(error => {
        console.error('Delete vault item error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Экспорт всех записей (backup)
   */
  exportVault(): Observable<VaultItem[]> {
    return this.http.get<{ success: boolean; data: VaultItem[] }>(`${this.baseUrl}/backup`).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Export vault error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Импорт записей (restore)
   */
  importVault(items: VaultItem[]): Observable<{ imported: number; deleted: number }> {
    return this.http.post<{ success: boolean; data: { imported: number; deleted: number } }>(
      `${this.baseUrl}/restore`,
      { items }
    ).pipe(
      map(response => response.data),
      tap(() => {
        // Перезагружаем список после импорта
        this.getItems().subscribe();
      }),
      catchError(error => {
        console.error('Import vault error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Расшифровка секретных данных записи
   * Требует vaultKey из AuthService
   */
  async decryptItemSecrets(item: VaultItem): Promise<VaultSecretData> {
    // Получаем vaultKey из AuthService (должен быть сохранен после логина)
    const vaultKey = await this.getVaultKey();
    if (!vaultKey) {
      throw new Error('Vault key not available');
    }

    return this.cryptoService.decryptVaultEntry(vaultKey, {
      iv: item.iv,
      ciphertext: item.encryptedData,
    });
  }

  /**
   * Преобразование зашифрованной записи в расшифрованную (без секретов)
   */
  private toDecryptedItem(item: VaultItem): VaultItemDecrypted {
    return {
      id: item.id,
      title: item.title,
      username: item.username,
      url: item.url,
      tags: item.tags,
      version: item.version,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      // password и notes остаются undefined до явной расшифровки
    };
  }

  /**
   * Получение vaultKey из AuthService
   */
  private async getVaultKey(): Promise<CryptoKey | null> {
    return await this.authService.getVaultKey();
  }
}
