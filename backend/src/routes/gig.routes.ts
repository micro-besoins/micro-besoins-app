import { Router } from 'express';
import { createGigReport, getGig, gigFilterOptions, listGigs, createPropositionHandler, publishGig, accepterProposition, terminerProposition, listMyGigs } from '../controllers/gig.controller';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', listGigs);
router.get('/filter-options', gigFilterOptions);
router.get('/mine', authenticate, listMyGigs);
router.post('/:id/signalements', authenticate, createGigReport);
router.get('/:id', optionalAuthenticate, getGig);
router.post('/', authenticate, publishGig);
router.patch('/reponses/:id/accepter', authenticate, accepterProposition); 
router.patch('/reponses/:id/terminer', authenticate, terminerProposition);
router.post('/:id/propositions', authenticate, createPropositionHandler);

export default router;
