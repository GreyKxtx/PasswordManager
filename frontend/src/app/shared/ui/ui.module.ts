import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiButtonComponent } from './button/button.component';
import { UiInputComponent } from './input/input.component';
import { UiLabelComponent } from './label/label.component';
import {
  UiCardComponent,
  UiCardHeaderComponent,
  UiCardTitleComponent,
  UiCardDescriptionComponent,
  UiCardContentComponent,
  UiCardFooterComponent,
} from './card/card.component';
import { UiSpinnerComponent } from './spinner/spinner.component';

/**
 * UI Module - содержит все базовые UI компоненты
 * Компоненты сделаны standalone, но модуль для удобства импорта
 */
@NgModule({
  imports: [
    CommonModule,
    UiButtonComponent,
    UiInputComponent,
    UiLabelComponent,
    UiCardComponent,
    UiCardHeaderComponent,
    UiCardTitleComponent,
    UiCardDescriptionComponent,
    UiCardContentComponent,
    UiCardFooterComponent,
    UiSpinnerComponent,
  ],
  exports: [
    UiButtonComponent,
    UiInputComponent,
    UiLabelComponent,
    UiCardComponent,
    UiCardHeaderComponent,
    UiCardTitleComponent,
    UiCardDescriptionComponent,
    UiCardContentComponent,
    UiCardFooterComponent,
    UiSpinnerComponent,
  ],
})
export class UiModule {}

