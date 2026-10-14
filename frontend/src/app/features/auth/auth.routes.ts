import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'register' },
  { path: 'register', title: 'Créer un compte', loadComponent: () => import('./register/register.page').then((m) => m.RegisterPage) },
];
