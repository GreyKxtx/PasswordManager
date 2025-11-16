import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card.component.html',
})
export class UiCardComponent {
  get classes(): string {
    return 'rounded-lg border bg-card text-card-foreground shadow-sm';
  }
}

@Component({
  selector: 'ui-card-header',
  standalone: true,
  imports: [CommonModule],
  template: '<div class="flex flex-col space-y-1.5 p-6"><ng-content></ng-content></div>',
})
export class UiCardHeaderComponent {}

@Component({
  selector: 'ui-card-title',
  standalone: true,
  imports: [CommonModule],
  template: '<h3 class="text-2xl font-semibold leading-none tracking-tight"><ng-content></ng-content></h3>',
})
export class UiCardTitleComponent {}

@Component({
  selector: 'ui-card-description',
  standalone: true,
  imports: [CommonModule],
  template: '<p class="text-sm text-muted-foreground"><ng-content></ng-content></p>',
})
export class UiCardDescriptionComponent {}

@Component({
  selector: 'ui-card-content',
  standalone: true,
  imports: [CommonModule],
  template: '<div class="p-6 pt-0"><ng-content></ng-content></div>',
})
export class UiCardContentComponent {}

@Component({
  selector: 'ui-card-footer',
  standalone: true,
  imports: [CommonModule],
  template: '<div class="flex items-center p-6 pt-0"><ng-content></ng-content></div>',
})
export class UiCardFooterComponent {}

