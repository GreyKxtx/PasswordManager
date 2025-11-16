import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiButtonComponent } from '../../../shared/ui/button/button.component';
import { UiInputComponent } from '../../../shared/ui/input/input.component';
import { UiLabelComponent } from '../../../shared/ui/label/label.component';
import { UiCardComponent, UiCardHeaderComponent, UiCardTitleComponent, UiCardContentComponent } from '../../../shared/ui/card/card.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, UiButtonComponent, UiInputComponent, UiLabelComponent, UiCardComponent, UiCardHeaderComponent, UiCardTitleComponent, UiCardContentComponent],
  template: `
    <div class="container mx-auto p-6 max-w-2xl">
      <h1 class="text-3xl font-bold mb-6">Профиль</h1>
      <ui-card>
        <ui-card-header>
          <ui-card-title>Личная информация</ui-card-title>
        </ui-card-header>
        <ui-card-content>
          <div class="space-y-2 mb-4">
            <ui-label for="name">Имя</ui-label>
            <ui-input id="name" placeholder="Ваше имя" />
          </div>
          <div class="space-y-2 mb-4">
            <ui-label for="email">Email</ui-label>
            <ui-input id="email" type="email" [disabled]="true" />
          </div>
          <div>
            <ui-button>Сохранить изменения</ui-button>
          </div>
        </ui-card-content>
      </ui-card>
    </div>
  `,
})
export class ProfileComponent {}

