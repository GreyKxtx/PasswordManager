import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-qrcode',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex justify-center">
      @if (qrCodeDataUrl) {
        <img [src]="qrCodeDataUrl" [alt]="alt" [width]="width" [height]="width" />
      } @else {
        <div class="flex items-center justify-center" [style.width.px]="width" [style.height.px]="width">
          <p class="text-sm text-muted-foreground">Загрузка QR-кода...</p>
        </div>
      }
    </div>
  `,
})
export class UiQrcodeComponent implements OnInit, OnChanges {
  @Input() data = '';
  @Input() width = 256;
  @Input() alt = 'QR Code';
  @Input() errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = 'M';

  qrCodeDataUrl: string | null = null;

  ngOnInit(): void {
    if (this.data) {
      this.generateQRCode();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data) {
      this.generateQRCode();
    }
  }

  private async generateQRCode(): Promise<void> {
    if (!this.data) {
      return;
    }

    try {
      // Используем qrcode-generator для работы в браузере
      const qrcodeModule = await import('qrcode-generator');
      // typeNumber: 0 = автоматический выбор размера
      // errorCorrectionLevel: 'L', 'M', 'Q', 'H'
      const errorLevel = this.errorCorrectionLevel || 'M';
      
      // Получаем функцию конструктора
      const QRCode = qrcodeModule.default || (qrcodeModule as any);
      const qr = QRCode(0, errorLevel);
      qr.addData(this.data);
      qr.make();

      // Создаем canvas для отрисовки QR-кода
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      const moduleCount = qr.getModuleCount();
      const cellSize = Math.floor(this.width / moduleCount);
      const size = moduleCount * cellSize;
      
      canvas.width = size;
      canvas.height = size;

      // Очищаем canvas белым фоном
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);

      // Рисуем QR-код
      ctx.fillStyle = '#000000';
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (qr.isDark(row, col)) {
            ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
          }
        }
      }

      this.qrCodeDataUrl = canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error generating QR code:', error);
      this.qrCodeDataUrl = null;
    }
  }
}

