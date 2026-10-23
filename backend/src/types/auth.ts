export type Role = 'demandeur' | 'prospect' | 'ADMIN';

// L'inscription publique n'autorise pas le rôle administrateur
export type RegisterRole = Exclude<Role, 'ADMIN'>;

export interface AuthPayload {
  id: number;
  role: Role;
}
