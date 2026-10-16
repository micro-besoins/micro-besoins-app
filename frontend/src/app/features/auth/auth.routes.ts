import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'register' },
  { path: 'register', title: 'Créer un compte', loadComponent: () => import('./register/register.page').then((m) => m.RegisterPage) },
  { path: 'login', title: 'Se connecter', loadComponent: () => import('./login/login.page').then((m) => m.LoginPage) },
  { path: 'connected', title: 'Micro-Besoins', loadComponent: () => import('./connected/connected.page').then((m) => m.ConnectedPage) },
];
