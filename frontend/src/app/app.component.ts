import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UiToastContainerComponent } from './shared/ui/toast/toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, UiToastContainerComponent],
  template: `
    <router-outlet></router-outlet>
    <ui-toast-container></ui-toast-container>
  `,
})
export class AppComponent {
  title = 'Password Manager';
}

