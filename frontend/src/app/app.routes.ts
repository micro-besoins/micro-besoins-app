import { Routes } from '@angular/router';
import { Login } from './login/login';
import { PageVide } from './page-vide/page-vide';

export const routes: Routes = [
  { path: '', component: Login },
  { path: 'page-vide', component: PageVide },
];
