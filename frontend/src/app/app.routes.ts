import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auth/register' },
  { path: 'auth', loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES) },
  { path: 'admin', loadComponent: () => import('./features/auth/admin/admin.page').then(m => m.AdminPage)  },
  { path: 'admin/:section/:id', loadComponent: () => import('./features/auth/admin/admin.page').then(m => m.AdminPage) },
  { path: 'admin/:section', loadComponent: () => import('./features/auth/admin/admin.page').then(m => m.AdminPage) },
];
