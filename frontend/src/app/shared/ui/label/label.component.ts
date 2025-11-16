import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-label',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './label.component.html',
})
export class UiLabelComponent {
  @Input() for = '';
  @Input() required = false;

  get classes(): string {
    return [
      'text-sm font-medium leading-none',
      'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      this.required ? 'after:content-["*"] after:ml-0.5 after:text-destructive' : '',
    ].join(' ');
  }
}

