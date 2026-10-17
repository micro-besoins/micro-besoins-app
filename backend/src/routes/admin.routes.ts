import { Router } from 'express';
import * as paiements from '../controllers/paiements.controller';
import * as publications from '../controllers/publications.controller';
import * as signalements from '../controllers/signalements.controller';
import * as stats from '../controllers/stats.controller';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.use(requireAdmin);

router.get('/stats', stats.getStats);
router.get('/stats/publications-a-valider', stats.getPublicationsToValidateCount);
router.get('/stats/paiements-echoues', stats.getFailedPaymentsCount);
router.get('/stats/signalements-ouverts', stats.getOpenReportsCount);

router.get('/publications', publications.list);
router.patch('/publications/:id/accepter', publications.accept);
router.patch('/publications/:id/refuser', publications.refuse);

router.get('/paiements', paiements.list);

router.get('/signalements', signalements.list);
router.patch('/signalements/:id/traiter', signalements.process);

export default router;