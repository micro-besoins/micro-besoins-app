import { Routes } from '@angular/router';
import { adminGuard } from './features/auth/admin.guard';
import { authGuard } from './features/auth/auth.guard';

export const routes: Routes = [
  { path: 'profil/:id', title: 'Profil public · Micro-Besoins', loadComponent: () => import('./features/profile/public-profile.page').then((m) => m.PublicProfilePage) },
  { path: '', title: 'Micro-Besoins', loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage) },
  { path: 'publier-un-besoin', canActivate: [authGuard], title: 'Publier un besoin', loadComponent: () => import('./features/gigs/publish/publish-gig.page').then((m) => m.PublishGigPage) },
  { path: 'besoins/:id', canActivate: [authGuard], title: 'Détail du besoin', loadComponent: () => import('./features/gigs/detail/gig-detail.page').then((m) => m.GigDetailPage) },
  { path: 'besoins/:id/propositions', canActivate: [authGuard], title: 'Propositions reçues', loadComponent: () => import('./features/gigs/proposals/proposals.page').then((m) => m.ProposalsPage) },
  { path: 'mes-besoins', canActivate: [authGuard], title: 'Mes besoins', loadComponent: () => import('./features/needs/needs.page').then((m) => m.MyNeedsPage) },
  { path: 'mon-profil', canActivate: [authGuard], title: 'Mon profil · Micro-Besoins', loadComponent: () => import('./features/profile/public-profile.page').then((m) => m.PublicProfilePage) },
  { path: 'messages', canActivate: [authGuard], title: 'Messages', loadComponent: () => import('./features/messages/messages.page').then((m) => m.MessagesPage) },
  { path: 'mes-propositions', canActivate: [authGuard], title: 'Mes propositions', loadComponent: () => import('./features/proposals/proposals.page').then((m) => m.ProposalsPage) },
  { path: 'auth', loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES) },
  { path: 'admin', canActivate: [adminGuard], loadComponent: () => import('./features/auth/admin/admin.page').then((m) => m.AdminPage) },
  { path: 'admin/:section/:id', canActivate: [adminGuard], loadComponent: () => import('./features/auth/admin/admin.page').then((m) => m.AdminPage) },
  { path: 'admin/:section', canActivate: [adminGuard], loadComponent: () => import('./features/auth/admin/admin.page').then((m) => m.AdminPage) },
  { path: '**', redirectTo: '' },
];
