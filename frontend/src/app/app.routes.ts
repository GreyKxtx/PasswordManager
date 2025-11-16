import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.routes').then(m => m.authRoutes),
  },
  {
    path: '',
    canActivate: [AuthGuard],
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'vault',
      },
      {
        path: 'vault',
        loadChildren: () => import('./vault/vault.routes').then(m => m.vaultRoutes),
      },
      {
        path: 'settings',
        loadChildren: () => import('./settings/settings.routes').then(m => m.settingsRoutes),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () => import('./core/components/not-found/not-found.component').then(m => m.NotFoundComponent),
  },
];

