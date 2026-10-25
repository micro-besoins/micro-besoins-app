import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { listMyProposals } from '../controllers/proposal.controller';

const router = Router();
router.use(authenticate);
router.get('/', listMyProposals);
export default router;
