import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { UiButtonComponent } from '../../shared/ui/button/button.component';
import { UiInputComponent } from '../../shared/ui/input/input.component';
import { UiDropdownComponent, UiDropdownItemComponent } from '../../shared/ui/dropdown/dropdown.component';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { Observable } from 'rxjs';
import { User } from '@password-manager/shared/types';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    UiButtonComponent,
    UiInputComponent,
    UiDropdownComponent,
    UiDropdownItemComponent,
  ],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent implements OnInit {
  @ViewChild('userMenu') userMenu!: UiDropdownComponent;
  
  currentUser$: Observable<User | null>;
  searchQuery = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    // Загружаем сессию при старте, если её нет
    if (!this.authService.getCurrentUser()) {
      this.authService.loadSessionOnStartup().subscribe();
    }
  }

  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => {
        // Сессия успешно отозвана на сервере, clearSession уже вызван в AuthService
        // Редирект на логин уже выполнен в clearSession
        this.toastService.success('Вы успешно вышли из системы');
      },
      error: (error) => {
        // Даже если запрос не удался, сессия уже очищена локально
        console.error('Logout error:', error);
        // Не показываем ошибку пользователю, так как локальная сессия уже очищена
      }
    });
  }

  onProfileClick(): void {
    this.router.navigate(['/settings/profile']);
    if (this.userMenu) {
      this.userMenu.close();
    }
  }
}

