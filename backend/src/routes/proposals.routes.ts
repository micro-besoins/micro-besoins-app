import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { findMyProposals, findProposalNeed, findProposalOwner, withdrawProposal } from '../services/proposals.service';
import { AppError } from '../utils/AppError';

const router = Router();
router.use(authenticate);
router.use((req, _res, next) => {
  if (!Number.isSafeInteger(req.user?.id) || req.user!.id <= 0) {
    return next(new AppError(401, 'Authentification requise.'));
  }
  next();
});
router.param('id', (_req, _res, next, value) => {
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > 2147483647) {
    return next(new AppError(400, 'Identifiant de proposition invalide.'));
  }
  next();
});
router.get('/', async (req, res, next) => {
  try { res.json({ proposals: await findMyProposals(req.user!.id) }); }
  catch (error) { next(error); }
});
router.patch('/:id/withdraw', async (req, res, next) => {
  try { res.json({ proposal: await withdrawProposal(Number(req.params.id), req.user!.id) }); }
  catch (error) { next(error); }
});
router.get('/:id/need', async (req, res, next) => {
  try { res.json({ gig: await findProposalNeed(Number(req.params.id), req.user!.id) }); }
  catch (error) { next(error); }
});
router.get('/:id/profile', async (req, res, next) => {
  try { res.json({ profile: await findProposalOwner(Number(req.params.id), req.user!.id) }); }
  catch (error) { next(error); }
});
export default router;
