import { Router } from 'express';
import { createGigReport, getGig, gigFilterOptions, listGigs, publishGig } from '../controllers/gig.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/', listGigs);
router.get('/filter-options', gigFilterOptions);
router.post('/:id/signalements', createGigReport);
router.get('/:id', getGig);
router.post('/', publishGig);

export default router;
