import { Component, Input, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dropdown.component.html',
})
export class UiDropdownComponent {
  @Input() trigger: 'click' | 'hover' = 'click';
  isOpen = false;

  toggle(): void {
    if (this.trigger === 'click') {
      this.isOpen = !this.isOpen;
    }
  }

  open(): void {
    this.isOpen = true;
  }

  close(): void {
    this.isOpen = false;
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    if (this.trigger === 'hover') {
      this.open();
    }
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    if (this.trigger === 'hover') {
      this.close();
    }
  }
}

@Component({
  selector: 'ui-dropdown-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
      (click)="onClick()"
    >
      <ng-content></ng-content>
    </div>
  `,
})
export class UiDropdownItemComponent {
  onClick(): void {
    // Эмит события или callback можно добавить при необходимости
  }
}

