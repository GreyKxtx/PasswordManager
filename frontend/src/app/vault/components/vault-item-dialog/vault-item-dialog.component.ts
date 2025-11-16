import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UiDialogComponent } from '../../../shared/ui/dialog/dialog.component';
import { UiButtonComponent } from '../../../shared/ui/button/button.component';
import { UiInputComponent } from '../../../shared/ui/input/input.component';
import { UiLabelComponent } from '../../../shared/ui/label/label.component';
import { VaultItemDecrypted } from '../../../core/types/vault.types';

@Component({
  selector: 'app-vault-item-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    UiDialogComponent,
    UiButtonComponent,
    UiInputComponent,
    UiLabelComponent,
  ],
  templateUrl: './vault-item-dialog.component.html',
})
export class VaultItemDialogComponent implements OnChanges {
  @Input() show = false;
  @Input() item: VaultItemDecrypted | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<Partial<VaultItemDecrypted>>();

  itemForm: FormGroup;
  showPassword = false;
  isSaving = false;

  constructor(private fb: FormBuilder) {
    this.itemForm = this.fb.group({
      title: ['', [Validators.required]],
      login: [''],
      password: [''],
      url: [''],
      note: [''],
      tags: [''],
    });
  }

  ngOnChanges(): void {
    // Сбрасываем isSaving при открытии/закрытии диалога
    this.isSaving = false;
    
    if (this.item) {
      // Редактирование существующей записи
      this.itemForm.patchValue({
        title: this.item.title || '',
        login: this.item.username || '',
        password: this.item.password || '',
        url: this.item.url || '',
        note: this.item.notes || '',
        tags: this.item.tags?.join(', ') || '',
      });
    } else {
      // Создание новой записи
      this.itemForm.reset();
    }
  }

  onSubmit(): void {
    if (this.itemForm.invalid || this.isSaving) {
      return;
    }

    const formValue = this.itemForm.value;
    const itemData: Partial<VaultItemDecrypted> = {
      title: formValue.title,
      username: formValue.login || undefined,
      password: formValue.password || undefined,
      url: formValue.url || undefined,
      notes: formValue.note || undefined,
      tags: formValue.tags
        ? formValue.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0)
        : undefined,
    };

    this.isSaving = true;
    this.save.emit(itemData);
  }

  onClose(): void {
    this.close.emit();
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  generatePassword(): void {
    // TODO: Интегрировать генератор паролей
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    this.itemForm.patchValue({ password });
  }
}

