import { Routes } from '@angular/router';

export const settingsRoutes: Routes = [
  {
    path: '',
    redirectTo: 'profile',
    pathMatch: 'full',
  },
  {
    path: 'profile',
    loadComponent: () => import('./components/profile/profile.component').then(m => m.ProfileComponent),
  },
  {
    path: 'security',
    loadComponent: () => import('./components/security/security.component').then(m => m.SecurityComponent),
  },
  {
    path: 'devices',
    loadComponent: () => import('./components/devices/devices.component').then(m => m.DevicesComponent),
  },
  {
    path: 'audit',
    loadComponent: () => import('./components/audit/audit.component').then(m => m.AuditComponent),
  },
];

