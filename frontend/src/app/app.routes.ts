import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './features/auth/auth.service';

export const routes: Routes = [
  { path: 'mon-profil', title: 'Mon profil — Micro-Besoins', canActivate: [() => inject(AuthService).token() ? true : inject(Router).createUrlTree(['/auth/login'])], loadComponent: () => import('./features/profile/profile.page').then((m) => m.ProfilePage) },
  { path: 'profil/:id', title: 'Profil public · Micro-Besoins', loadComponent: () => import('./features/profile/public-profile.page').then((m) => m.PublicProfilePage) },
  { path: 'besoins/:id', title: 'Détail du besoin', loadComponent: () => import('./features/profile/profile-context.page').then((m) => m.ProfileContextPage) },
  { path: '', title: 'Micro-Besoins', loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage) },
  { path: 'publier-un-besoin', title: 'Publier un besoin', loadComponent: () => import('./features/gigs/publish/publish-gig.page').then((m) => m.PublishGigPage) },
  { path: 'mes-besoins', title: 'Mes besoins', data: { title: 'Mes besoins' }, loadComponent: () => import('./features/navigation/placeholder.page').then((m) => m.NavigationPlaceholderPage) },
  { path: 'mes-propositions', title: 'Mes propositions', loadComponent: () => import('./features/profile/profile-context.page').then((m) => m.ProfileContextPage) },
  { path: 'messages', title: 'Messages', data: { title: 'Messages' }, loadComponent: () => import('./features/navigation/placeholder.page').then((m) => m.NavigationPlaceholderPage) },
  { path: 'auth', loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES) },
  { path: 'admin', loadComponent: () => import('./features/auth/admin/admin.page').then(m => m.AdminPage)  },
  { path: 'admin/:section/:id', loadComponent: () => import('./features/auth/admin/admin.page').then(m => m.AdminPage) },
  { path: 'admin/:section', loadComponent: () => import('./features/auth/admin/admin.page').then(m => m.AdminPage) },
  { path: '**', redirectTo: '' },
];
