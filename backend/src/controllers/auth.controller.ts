import { NextFunction, Request, Response } from 'express';
import { loginUser, registerUser } from '../services/auth.service';
import { RegisterRole } from '../types/auth';
import { AppError } from '../utils/AppError';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGISTER_ROLES: RegisterRole[] = ['demandeur', 'prospect'];

// Limites alignées sur la table utilisateur : nom/prenom VARCHAR(20), email VARCHAR(100)
const MAX_NOM = 20;
const MAX_PRENOM = 20;
const MAX_EMAIL = 100;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { nom, prenom, email, password, role } = req.body ?? {};

    const missing = Object.entries({ nom, prenom, email, password, role })
      .filter(([, value]) => !isNonEmptyString(value))
      .map(([key]) => key);
    if (missing.length > 0) {
      throw new AppError(400, `Champs manquants ou invalides : ${missing.join(', ')}.`);
    }

    if (nom.trim().length > MAX_NOM || prenom.trim().length > MAX_PRENOM) {
      throw new AppError(400, `Le nom et le prénom ne doivent pas dépasser ${MAX_NOM} caractères.`);
    }
    if (!EMAIL_REGEX.test(email.trim()) || email.trim().length > MAX_EMAIL) {
      throw new AppError(400, "Format d'email invalide.");
    }
    // bcrypt ignore tout ce qui dépasse 72 octets, d'où la limite haute
    if (password.length < 8 || password.length > 72) {
      throw new AppError(400, 'Le mot de passe doit contenir entre 8 et 72 caractères.');
    }
    if (!REGISTER_ROLES.includes(role)) {
      throw new AppError(400, 'Rôle invalide.');
    }

    const user = await registerUser({
      nom: nom.trim(),
      prenom: prenom.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
    });

    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body ?? {};

    if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
      throw new AppError(400, 'Email et mot de passe requis.');
    }

    const result = await loginUser(email.trim().toLowerCase(), password);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export function me(req: Request, res: Response) {
  res.json({ user: req.user });
}
