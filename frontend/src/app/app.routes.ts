import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', title: 'Micro-Besoins', loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage) },
  { path: 'publier-un-besoin', title: 'Publier un besoin', loadComponent: () => import('./features/gigs/publish/publish-gig.page').then((m) => m.PublishGigPage) },
  { path: 'besoins/:id', title: 'Détail du besoin', loadComponent: () => import('./features/gigs/detail/gig-detail.page').then((m) => m.GigDetailPage) },
  { path: 'mes-besoins', title: 'Mes besoins', data: { title: 'Mes besoins' }, loadComponent: () => import('./features/navigation/placeholder.page').then((m) => m.NavigationPlaceholderPage) },
  { path: 'mes-propositions', title: 'Mes propositions', data: { title: 'Mes propositions' }, loadComponent: () => import('./features/navigation/placeholder.page').then((m) => m.NavigationPlaceholderPage) },
  { path: 'messages', title: 'Messages', data: { title: 'Messages' }, loadComponent: () => import('./features/navigation/placeholder.page').then((m) => m.NavigationPlaceholderPage) },
  { path: 'auth', loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES) },
  { path: 'admin', loadComponent: () => import('./features/auth/admin/admin.page').then(m => m.AdminPage)  },
  { path: 'admin/:section/:id', loadComponent: () => import('./features/auth/admin/admin.page').then(m => m.AdminPage) },
  { path: 'admin/:section', loadComponent: () => import('./features/auth/admin/admin.page').then(m => m.AdminPage) },
  { path: '**', redirectTo: '' },
];
