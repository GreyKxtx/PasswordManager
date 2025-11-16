import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiButtonComponent } from '../../../shared/ui/button/button.component';
import { UiCardComponent, UiCardHeaderComponent, UiCardTitleComponent, UiCardContentComponent } from '../../../shared/ui/card/card.component';

@Component({
  selector: 'app-security',
  standalone: true,
  imports: [CommonModule, UiButtonComponent, UiCardComponent, UiCardHeaderComponent, UiCardTitleComponent, UiCardContentComponent],
  template: `
    <div class="container mx-auto p-6 max-w-2xl">
      <h1 class="text-3xl font-bold mb-6">Безопасность</h1>
      <div class="space-y-6">
        <ui-card>
          <ui-card-header>
            <ui-card-title>Мастер-пароль</ui-card-title>
          </ui-card-header>
          <ui-card-content>
            <ui-button variant="outline">Изменить мастер-пароль</ui-button>
          </ui-card-content>
        </ui-card>

        <ui-card>
          <ui-card-header>
            <ui-card-title>Двухфакторная аутентификация</ui-card-title>
          </ui-card-header>
          <ui-card-content>
            <p class="text-sm text-muted-foreground mb-4">Статус: Выключена</p>
            <ui-button>Включить TOTP</ui-button>
          </ui-card-content>
        </ui-card>
      </div>
    </div>
  `,
})
export class SecurityComponent {}

