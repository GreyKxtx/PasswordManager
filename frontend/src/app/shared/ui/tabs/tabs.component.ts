import { Component, Input, ContentChildren, QueryList, AfterContentInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-tabs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tabs.component.html',
})
export class UiTabsComponent {
  @Input() defaultValue = '';
  selectedTab = '';

  ngOnInit(): void {
    this.selectedTab = this.defaultValue;
  }

  selectTab(value: string): void {
    this.selectedTab = value;
  }
}

@Component({
  selector: 'ui-tabs-list',
  standalone: true,
  imports: [CommonModule],
  template: '<div class="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground"><ng-content></ng-content></div>',
})
export class UiTabsListComponent {}

@Component({
  selector: 'ui-tabs-trigger',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [class]="
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ' +
        (active ? 'bg-background text-foreground shadow-sm' : '')
      "
      (click)="onClick()"
    >
      <ng-content></ng-content>
    </button>
  `,
  inputs: ['value', 'active'],
})
export class UiTabsTriggerComponent {
  value = '';
  active = false;
  onClick = () => {};
}

@Component({
  selector: 'ui-tabs-content',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (active) {
      <div class="mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <ng-content></ng-content>
      </div>
    }
  `,
  inputs: ['value', 'active'],
})
export class UiTabsContentComponent {
  value = '';
  active = false;
}

