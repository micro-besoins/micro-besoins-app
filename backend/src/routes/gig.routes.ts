import { Router } from 'express';
import { gigFilterOptions, listGigs, publishGig } from '../controllers/gig.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/', listGigs);
router.get('/filter-options', gigFilterOptions);
router.post('/', publishGig);

export default router;
