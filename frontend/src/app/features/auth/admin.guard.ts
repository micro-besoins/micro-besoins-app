import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isAdminUser } from './admin-role';
import { AuthService } from './auth.service';

// Réserve une route aux comptes administrateur :
// pas connecté -> connexion, connecté mais pas admin -> accueil.
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.token()) return router.createUrlTree(['/auth/login']);
  return isAdminUser(auth) ? true : router.createUrlTree(['/']);
};
