import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const API_URL = 'http://localhost:3000/api';

// Ajoute automatiquement le token à tous les appels vers l'API
// (sauf s'il est déjà présent), et renvoie vers la connexion quand le token n'est plus valide.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token();

  const request =
    token && req.url.startsWith(API_URL) && !req.headers.has('Authorization')
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/auth/login')) {
        auth.logout();
        void router.navigateByUrl('/auth/login');
      }
      return throwError(() => error);
    }),
  );
};