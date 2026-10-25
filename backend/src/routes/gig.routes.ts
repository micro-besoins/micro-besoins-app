import { Router } from 'express';
import { getGig, gigFilterOptions, listGigs, publishGig } from '../controllers/gig.controller';
import { authenticate } from '../middleware/auth.middleware';
import { createProposal, decision, getProposals, getPublicProfile } from '../controllers/proposal.controller';

const router = Router();

router.use(authenticate);
router.get('/', listGigs);
router.get('/filter-options', gigFilterOptions);
router.get('/profiles/:providerId', getPublicProfile);
router.get('/:id/proposals', getProposals);
router.post('/:id/proposals', createProposal);
router.patch('/:id/proposals/:proposalId', decision);
router.get('/:id', getGig);
router.post('/', publishGig);

export default router;
