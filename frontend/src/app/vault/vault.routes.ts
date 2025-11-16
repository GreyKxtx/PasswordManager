import { Routes } from '@angular/router';

export const vaultRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/vault-list/vault-list.component').then(m => m.VaultListComponent),
  },
  {
    path: 'backup',
    loadComponent: () => import('./components/backup-restore/backup-restore.component').then(m => m.BackupRestoreComponent),
  },
];

