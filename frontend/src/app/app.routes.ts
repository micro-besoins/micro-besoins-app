import { Routes } from '@angular/router';

export const routes: Routes = [
  { 
    path: '',
    pathMatch: 'full',
    redirectTo: 'auth/register'
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },
];