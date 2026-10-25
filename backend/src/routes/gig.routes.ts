import { Router } from 'express';
import { createGigReport, getGig, gigFilterOptions, listGigs, publishGig, submitProposal } from '../controllers/gig.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/', listGigs);
router.get('/filter-options', gigFilterOptions);
router.post('/:id/signalements', createGigReport);
router.post('/:id/proposals', submitProposal);
router.get('/:id', getGig);
router.post('/', publishGig);

export default router;
