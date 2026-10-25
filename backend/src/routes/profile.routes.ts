import { Router } from 'express';
import { findPublicProfile } from '../services/profile.service';

const router = Router();
router.get('/:id/public', async (req, res, next) => {
  try {
    const raw = String(req.params.id);
    const id = Number(raw);
    if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(id) || id > 2147483647) {
      res.status(400).json({ message: 'Identifiant de profil invalide.' });
      return;
    }
    const profile = await findPublicProfile(id);
    if (!profile) { res.status(404).json({ message: 'Profil introuvable.' }); return; }
    res.json({ profile });
  } catch (error) { next(error); }
});
export default router;
