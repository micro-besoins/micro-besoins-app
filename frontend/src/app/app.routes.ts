import { Routes } from '@angular/router';
import { adminGuard } from './features/auth/admin.guard';
import { authGuard } from './features/auth/auth.guard';

export const routes: Routes = [
  { path: '', title: 'Micro-Besoins', loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage) },
  { path: 'publier-un-besoin', canActivate: [authGuard], title: 'Publier un besoin', loadComponent: () => import('./features/gigs/publish/publish-gig.page').then((m) => m.PublishGigPage) },
  { path: 'mes-besoins', canActivate: [authGuard], title: 'Mes besoins', data: { title: 'Mes besoins' }, loadComponent: () => import('./features/navigation/placeholder.page').then((m) => m.NavigationPlaceholderPage) },
  { path: 'mes-propositions', canActivate: [authGuard], title: 'Mes propositions', data: { title: 'Mes propositions' }, loadComponent: () => import('./features/navigation/placeholder.page').then((m) => m.NavigationPlaceholderPage) },
  { path: 'messages', canActivate: [authGuard], title: 'Messages', data: { title: 'Messages' }, loadComponent: () => import('./features/navigation/placeholder.page').then((m) => m.NavigationPlaceholderPage) },
  { path: 'besoins/:id', title: 'Détail du besoin', loadComponent: () => import('./features/gigs/detail/gig-detail.page').then((m) => m.GigDetailPage) },
  { path: 'besoins/:id/propositions', canActivate: [authGuard], title: 'Propositions reçues', loadComponent: () => import('./features/gigs/proposals/proposals.page').then((m) => m.ProposalsPage) },
  { path: 'auth', loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES) },
  { path: 'admin', canActivate: [adminGuard], loadComponent: () => import('./features/auth/admin/admin.page').then(m => m.AdminPage) },
  { path: 'admin/:section/:id', canActivate: [adminGuard], loadComponent: () => import('./features/auth/admin/admin.page').then(m => m.AdminPage) },
  { path: 'admin/:section', canActivate: [adminGuard], loadComponent: () => import('./features/auth/admin/admin.page').then(m => m.AdminPage) },
  { path: '**', redirectTo: '' },
];
