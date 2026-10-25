import { AuthService, RegisteredUser } from './auth.service';

export const ADMIN_ROLE = 'ADMIN';

// Rôle de l'utilisateur connecté : lu dans l'utilisateur enregistré, sinon dans le token JWT.
// Sert uniquement à adapter l'affichage : les droits réels sont vérifiés par l'API.
export function currentRole(auth: AuthService): string | null {
  const user = auth.currentUser() as (RegisteredUser & { role?: string }) | null;
  if (user?.role) return user.role;

  const token = auth.token();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

export function isAdminUser(auth: AuthService): boolean {
  return currentRole(auth) === ADMIN_ROLE;
}
