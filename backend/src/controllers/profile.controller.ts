import { NextFunction, Request, Response } from 'express';
import { getProfile, ProfileInput, updateProfile } from '../services/profile.service';
import { AppError } from '../utils/AppError';

export async function readProfile(req: Request, res: Response, next: NextFunction) {
  try { res.json({ profile: await getProfile(req.user!.id) }); } catch (error) { next(error); }
}

export async function saveProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const limits: Record<keyof ProfileInput, number> = { nom: 20, prenom: 20, email: 100, publicName: 80, location: 80, bio: 1000 };
    const input = {} as ProfileInput;
    for (const field of Object.keys(limits) as (keyof ProfileInput)[]) {
      const value = req.body?.[field];
      if (typeof value !== 'string' || value.trim().length > limits[field] || (field !== 'bio' && !value.trim())) {
        throw new AppError(400, `Champ invalide : ${field} (${limits[field]} caractères maximum).`);
      }
      input[field] = value.trim();
    }
    input.email = input.email.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new AppError(400, 'Adresse e-mail invalide.');
    res.json({ profile: await updateProfile(req.user!.id, input), message: 'Votre profil a été mis à jour.' });
  } catch (error) { next(error); }
}
