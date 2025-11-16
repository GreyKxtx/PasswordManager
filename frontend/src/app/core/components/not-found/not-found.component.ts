import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiButtonComponent } from '../../../shared/ui/button/button.component';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, UiButtonComponent],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-background">
      <div class="text-center">
        <h1 class="text-6xl font-bold text-foreground mb-4">404</h1>
        <p class="text-xl text-muted-foreground mb-8">Страница не найдена</p>
        <ui-button routerLink="/vault">Вернуться на главную</ui-button>
      </div>
    </div>
  `,
})
export class NotFoundComponent {}

