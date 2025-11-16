import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiButtonComponent } from '../button/button.component';

@Component({
  selector: 'ui-dialog',
  standalone: true,
  imports: [CommonModule, UiButtonComponent],
  templateUrl: './dialog.component.html',
})
export class UiDialogComponent {
  @Input() show = false;
  @Input() title = '';
  @Input() width: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' = 'md';
  @Input() showClose = true;
  @Output() close = new EventEmitter<void>();

  get widthClasses(): string {
    const widths = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl',
      full: 'max-w-full',
    };
    return widths[this.width];
  }

  onClose(): void {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }
}

