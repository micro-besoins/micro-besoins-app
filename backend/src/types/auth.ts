export type Role = 'demandeur' | 'prospect' | 'administrateur';

// L'inscription publique n'autorise pas le rôle administrateur
export type RegisterRole = Exclude<Role, 'administrateur'>;

export interface AuthPayload {
  id: number;
  role: Role;
}
