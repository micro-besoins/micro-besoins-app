import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { AuthPayload, RegisterRole, Role } from '../types/auth';

const BCRYPT_ROUNDS = 12;

// Hash factice : on fait la même comparaison même si l'email n'existe pas,
// pour ne pas révéler l'existence d'un compte via le temps de réponse.
const DUMMY_HASH = bcrypt.hashSync('mot-de-passe-factice', BCRYPT_ROUNDS);

// Les colonnes de la table `utilisateur` sont écrites en camelCase sans guillemets :
// PostgreSQL les met en minuscules. Les alias (AS ...) ci-dessous donnent des noms
// propres côté code (id, role, motDePasse).
export interface PublicUser {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
}

interface UserRow extends PublicUser {
  passwordHash: string | null;
}

export async function registerUser(input: {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  role: RegisterRole;
}): Promise<PublicUser> {
  const hash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  try {
    const { rows } = await pool.query<PublicUser>(
      `INSERT INTO utilisateur (nom, prenom, email, motdepasse, roleUtilisateur)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING idUtilisateur AS id, nom, prenom, email, roleUtilisateur AS role`,
      [input.nom, input.prenom, input.email, hash, input.role]
    );
    return rows[0];
  } catch (err: any) {
    // 23505 = violation de la contrainte UNIQUE sur l'email
    if (err.code === '23505') {
      throw new AppError(409, 'Un compte existe déjà avec cet email.');
    }
    throw err;
  }
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ token: string; user: PublicUser }> {
  const { rows } = await pool.query<UserRow>(
    `SELECT idUtilisateur AS id, nom, prenom, email,
            roleUtilisateur AS role, motdepasse AS "passwordHash"
     FROM utilisateur
     WHERE email = $1`,
    [email]
  );
  const user = rows[0];

  const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  // Même message que l'email soit inconnu ou le mot de passe faux
  // (un compte sans mot de passe enregistré est aussi refusé)
  if (!user || !user.passwordHash || !passwordOk) {
    throw new AppError(401, 'Email ou mot de passe incorrect.');
  }

  const payload: AuthPayload = { id: user.id, role: user.role };
  const token = jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });

  return {
    token,
    user: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role: user.role },
  };
}
