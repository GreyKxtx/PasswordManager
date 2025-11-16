import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UiButtonComponent } from '../../../shared/ui/button/button.component';
import { UiInputComponent } from '../../../shared/ui/input/input.component';
import { UiLabelComponent } from '../../../shared/ui/label/label.component';
import { UiCardComponent, UiCardHeaderComponent, UiCardTitleComponent, UiCardContentComponent } from '../../../shared/ui/card/card.component';

@Component({
  selector: 'app-two-factor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    UiButtonComponent,
    UiInputComponent,
    UiLabelComponent,
    UiCardComponent,
    UiCardHeaderComponent,
    UiCardTitleComponent,
    UiCardContentComponent,
  ],
  templateUrl: './two-factor.component.html',
})
export class TwoFactorComponent {
  totpForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    this.totpForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    });
  }

  onSubmit(): void {
    if (this.totpForm.invalid) {
      return;
    }

    // TODO: Отправить код на сервер для проверки
    this.router.navigate(['/vault']);
  }
}

