import { Injectable, ComponentRef, ViewContainerRef, TemplateRef } from '@angular/core';
import { Subject } from 'rxjs';

export interface DialogConfig {
  title?: string;
  content?: string;
  template?: TemplateRef<any>;
  showClose?: boolean;
  width?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  private dialogContainer?: ViewContainerRef;
  private dialogRefs: ComponentRef<any>[] = [];

  private closeSubject = new Subject<any>();
  public onClose$ = this.closeSubject.asObservable();

  setContainer(container: ViewContainerRef): void {
    this.dialogContainer = container;
  }

  open(config: DialogConfig): ComponentRef<any> | null {
    if (!this.dialogContainer) {
      console.error('Dialog container not set');
      return null;
    }

    // В реальной реализации здесь будет создание DialogComponent через CDK Overlay
    // Пока заглушка
    return null;
  }

  close(result?: any): void {
    if (this.dialogRefs.length > 0) {
      const ref = this.dialogRefs.pop();
      ref?.destroy();
      this.closeSubject.next(result);
    }
  }

  closeAll(): void {
    this.dialogRefs.forEach(ref => ref.destroy());
    this.dialogRefs = [];
  }
}

