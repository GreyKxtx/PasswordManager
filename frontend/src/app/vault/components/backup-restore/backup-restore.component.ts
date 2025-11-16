import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { UiButtonComponent } from '../../../shared/ui/button/button.component';
import { UiCardComponent, UiCardHeaderComponent, UiCardTitleComponent, UiCardContentComponent } from '../../../shared/ui/card/card.component';
import { UiDialogComponent } from '../../../shared/ui/dialog/dialog.component';
import { VaultService } from '../../../core/services/vault.service';
import { CryptoService } from '../../../core/services/crypto.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { VaultItem } from '../../../core/types/vault.types';

interface BackupData {
  version: string;
  items: VaultItem[];
  exportedAt: string;
}

@Component({
  selector: 'app-backup-restore',
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
  templateUrl: './backup-restore.component.html',
})
export class BackupRestoreComponent {
  isExporting = false;
  isImporting = false;
  showImportDialog = false;
  pendingImportItems: VaultItem[] = [];

  constructor(
    private vaultService: VaultService,
    private cryptoService: CryptoService,
    private toastService: ToastService
  ) {}

  async onExport(): Promise<void> {
    this.isExporting = true;
    try {
      // Получаем зашифрованные записи через API
      const items = await firstValueFrom(this.vaultService.exportVault());
      
      if (!items || items.length === 0) {
        this.toastService.error('Нет данных для экспорта');
        return;
      }

      const backupData: BackupData = {
        version: '1.0.0',
        items: items,
        exportedAt: new Date().toISOString(),
      };

      // Экспортируем зашифрованные данные (сервер не видит секретов)
      const jsonData = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `password-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      this.toastService.success('Backup успешно экспортирован');
    } catch (error) {
      console.error('Export error:', error);
      this.toastService.error('Ошибка экспорта backup');
    } finally {
      this.isExporting = false;
    }
  }

  async onImport(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const backupData: BackupData = JSON.parse(text);

      // Валидация структуры backup
      if (!backupData.items || !Array.isArray(backupData.items)) {
        this.toastService.error('Неверный формат backup файла');
        input.value = '';
        return;
      }

      // Сохраняем данные для подтверждения
      this.pendingImportItems = backupData.items;
      this.showImportDialog = true;
      
      // Сброс input (файл уже прочитан)
      input.value = '';
    } catch (error) {
      console.error('Import error:', error);
      this.toastService.error('Ошибка импорта backup. Проверьте формат файла.');
      input.value = '';
    }
  }

  onConfirmImport(): void {
    if (this.pendingImportItems.length === 0) {
      return;
    }

    this.isImporting = true;
    this.showImportDialog = false;
    const itemsToImport = this.pendingImportItems;
    this.pendingImportItems = [];

    firstValueFrom(this.vaultService.importVault(itemsToImport)).then(() => {
      this.toastService.success(`Успешно импортировано ${itemsToImport.length} записей`);
      this.isImporting = false;
    }).catch((error) => {
      console.error('Import error:', error);
      this.toastService.error('Ошибка импорта backup. Проверьте формат файла.');
      this.isImporting = false;
    });
  }

  onCancelImport(): void {
    this.showImportDialog = false;
    this.pendingImportItems = [];
  }
}

