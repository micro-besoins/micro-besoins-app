import { Router } from 'express';
import { getGig, gigFilterOptions, listGigs, publishGig } from '../controllers/gig.controller';
import { authenticate } from '../middleware/auth.middleware';
import { submitProposal } from '../controllers/proposal.controller';

const router = Router();

router.use(authenticate);
router.get('/', listGigs);
router.get('/filter-options', gigFilterOptions);
router.get('/:id', getGig);
router.post('/', publishGig);
router.post('/:id/proposals', submitProposal);

export default router;
