import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { UiButtonComponent } from '../../../shared/ui/button/button.component';
import { UiInputComponent } from '../../../shared/ui/input/input.component';
import { UiCardComponent } from '../../../shared/ui/card/card.component';
import { UiDialogComponent } from '../../../shared/ui/dialog/dialog.component';
import { VaultService } from '../../../core/services/vault.service';
import { CryptoService } from '../../../core/services/crypto.service';
import { AuthService } from '../../../core/services/auth.service';
import { VaultItemDecrypted, CreateVaultItemPayload, UpdateVaultItemPayload } from '../../../core/types/vault.types';
import { VaultItemDialogComponent } from '../vault-item-dialog/vault-item-dialog.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-vault-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    UiButtonComponent,
    UiInputComponent,
    UiCardComponent,
    UiDialogComponent,
    VaultItemDialogComponent,
  ],
  templateUrl: './vault-list.component.html',
})
export class VaultListComponent implements OnInit, OnDestroy {
  items: VaultItemDecrypted[] = [];
  filteredItems: VaultItemDecrypted[] = [];
  searchQuery = '';
  isLoading = false;
  showDialog = false;
  editingItem: VaultItemDecrypted | null = null;
  showDeleteDialog = false;
  itemToDelete: VaultItemDecrypted | null = null;

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(
    private vaultService: VaultService,
    private cryptoService: CryptoService,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadItems();

    // Подписка на поиск с debounce
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(query => {
        this.performSearch(query);
      });

    // Подписка на изменения в хранилище
    this.vaultService.items$
      .pipe(takeUntil(this.destroy$))
      .subscribe(items => {
        this.items = items;
        this.performSearch(this.searchQuery);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadItems(): void {
    this.isLoading = true;
    this.vaultService.getItems().subscribe({
      next: (items) => {
        this.items = items;
        this.filteredItems = items;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.toastService.error('Ошибка загрузки записей');
      },
    });
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.searchSubject.next(query);
  }

  private performSearch(query: string): void {
    // Клиентская фильтрация вместо запросов на сервер
    if (!query.trim()) {
      this.filteredItems = this.items;
      return;
    }

    const lowerQuery = query.toLowerCase().trim();
    this.filteredItems = this.items.filter(item => {
      const titleMatch = item.title?.toLowerCase().includes(lowerQuery);
      const usernameMatch = item.username?.toLowerCase().includes(lowerQuery);
      const urlMatch = item.url?.toLowerCase().includes(lowerQuery);
      const tagsMatch = item.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));
      return titleMatch || usernameMatch || urlMatch || tagsMatch;
    });
  }

  onAddClick(): void {
    this.editingItem = null;
    this.showDialog = true;
  }

  async onEditClick(item: VaultItemDecrypted): Promise<void> {
    try {
      // Расшифровываем секреты при редактировании
      const vaultKey = await this.authService.getVaultKey();
      if (!vaultKey) {
        this.toastService.error('Vault key не доступен. Пожалуйста, войдите снова.');
        return;
      }

      // Получаем полную запись с сервера для расшифровки
      this.vaultService.getItemRaw(item.id).subscribe({
        next: async (fullItem) => {
          try {
            // Расшифровываем секретные данные
            const secrets = await this.vaultService.decryptItemSecrets(fullItem);

            // Объединяем расшифрованные секреты с метаданными
            this.editingItem = {
              id: fullItem.id,
              title: fullItem.title,
              username: fullItem.username,
              url: fullItem.url,
              tags: fullItem.tags,
              password: secrets.password,
              notes: secrets.notes,
              version: fullItem.version,
              createdAt: fullItem.createdAt,
              updatedAt: fullItem.updatedAt,
            };
            this.showDialog = true;
          } catch (error) {
            console.error('Error decrypting item secrets:', error);
            this.toastService.error('Ошибка расшифровки данных');
          }
        },
        error: () => {
          this.toastService.error('Ошибка загрузки записи');
        },
      });
    } catch (error) {
      console.error('Error preparing edit:', error);
      this.toastService.error('Ошибка при подготовке редактирования');
    }
  }

  onDeleteClick(item: VaultItemDecrypted): void {
    this.itemToDelete = item;
    this.showDeleteDialog = true;
  }

  onConfirmDelete(): void {
    if (!this.itemToDelete) {
      return;
    }

    const itemId = this.itemToDelete.id;
    this.vaultService.deleteItem(itemId).subscribe({
      next: () => {
        this.toastService.success('Запись удалена');
        this.showDeleteDialog = false;
        this.itemToDelete = null;
      },
      error: () => {
        this.toastService.error('Ошибка удаления записи');
        this.showDeleteDialog = false;
        this.itemToDelete = null;
      },
    });
  }

  onCancelDelete(): void {
    this.showDeleteDialog = false;
    this.itemToDelete = null;
  }

  onDialogClose(): void {
    this.showDialog = false;
    this.editingItem = null;
  }

  async onDialogSave(itemData: Partial<VaultItemDecrypted>): Promise<void> {
    try {
      const vaultKey = await this.authService.getVaultKey();
      if (!vaultKey) {
        this.toastService.error('Vault key не доступен. Пожалуйста, войдите снова.');
        return;
      }

      // Шифруем секретные данные
      const secretData = {
        password: itemData.password || '',
        notes: itemData.notes || '',
      };

      const encrypted = await this.cryptoService.encryptVaultEntry(vaultKey, secretData);

      if (this.editingItem) {
        // Обновление существующей записи
        const payload: UpdateVaultItemPayload = {
          title: itemData.title,
          username: itemData.username,
          url: itemData.url,
          tags: itemData.tags,
          encryptedData: encrypted.ciphertext,
          iv: encrypted.iv,
          version: (this.editingItem.version || 1) + 1,
        };

        this.vaultService.updateItem(this.editingItem.id, payload).subscribe({
          next: () => {
            this.toastService.success('Запись обновлена');
            this.loadItems(); // Перезагружаем список
            this.onDialogClose();
          },
          error: () => {
            this.toastService.error('Ошибка обновления записи');
            // isSaving сбросится при закрытии диалога или при следующем открытии
          },
        });
      } else {
        // Создание новой записи
        const payload: CreateVaultItemPayload = {
          title: itemData.title || '',
          username: itemData.username,
          url: itemData.url,
          tags: itemData.tags,
          encryptedData: encrypted.ciphertext,
          iv: encrypted.iv,
          version: 1,
        };

        this.vaultService.createItem(payload).subscribe({
          next: () => {
            this.toastService.success('Запись создана');
            this.loadItems(); // Перезагружаем список
            this.onDialogClose();
          },
          error: () => {
            this.toastService.error('Ошибка создания записи');
            // isSaving сбросится при закрытии диалога или при следующем открытии
          },
        });
      }
    } catch (error) {
      console.error('Error encrypting vault entry:', error);
      this.toastService.error('Ошибка шифрования данных');
    }
  }

  copyToClipboard(text: string, label: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.toastService.success(`${label} скопировано в буфер обмена`);
    }).catch(() => {
      this.toastService.error('Ошибка копирования');
    });
  }
}

