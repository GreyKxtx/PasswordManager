import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-spinner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './spinner.component.html',
})
export class UiSpinnerComponent {
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  get classes(): string {
    const sizes = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
    };
    return `animate-spin rounded-full border-2 border-muted border-t-primary ${sizes[this.size]}`;
  }
}

