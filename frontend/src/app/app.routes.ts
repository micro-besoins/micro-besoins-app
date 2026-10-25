import { Routes } from '@angular/router';
import { adminGuard } from './features/auth/admin.guard';
import { authGuard } from './features/auth/auth.guard';

export const routes: Routes = [
  { path: 'profil/:id', title: 'Profil public · Micro-Besoins', loadComponent: () => import('./features/profile/public-profile.page').then((m) => m.PublicProfilePage) },
  { path: 'besoins/:id', title: 'Détail du besoin', loadComponent: () => import('./features/profile/profile-context.page').then((m) => m.ProfileContextPage) },
  { path: '', title: 'Micro-Besoins', loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage) },
  { path: 'profil', canActivate: [authGuard], title: 'Profil', loadComponent: () => import('./features/profile/profile-context.page').then((m) => m.ProfileContextPage) },
  { path: 'publier-un-besoin', canActivate: [authGuard], title: 'Publier un besoin', loadComponent: () => import('./features/gigs/publish/publish-gig.page').then((m) => m.PublishGigPage) },
  { path: 'mes-besoins', canActivate: [authGuard], title: 'Mes besoins', data: { title: 'Mes besoins' }, loadComponent: () => import('./features/navigation/placeholder.page').then((m) => m.NavigationPlaceholderPage) },
  { path: 'mes-propositions', canActivate: [authGuard], title: 'Mes propositions', loadComponent: () => import('./features/proposals/proposals.page').then((m) => m.ProposalsPage) },
  { path: 'messages', canActivate: [authGuard], title: 'Messages', data: { title: 'Messages' }, loadComponent: () => import('./features/navigation/placeholder.page').then((m) => m.NavigationPlaceholderPage) },
  { path: 'auth', loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES) },
  { path: 'admin', canActivate: [adminGuard], loadComponent: () => import('./features/auth/admin/admin.page').then(m => m.AdminPage) },
  { path: 'admin/:section/:id', canActivate: [adminGuard], loadComponent: () => import('./features/auth/admin/admin.page').then(m => m.AdminPage) },
  { path: 'admin/:section', canActivate: [adminGuard], loadComponent: () => import('./features/auth/admin/admin.page').then(m => m.AdminPage) },
  { path: '**', redirectTo: '' },
];
