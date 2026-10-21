import { Router } from 'express';
import { paymentProviders, startPayment } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);
router.get('/providers', paymentProviders);
router.post('/intents', startPayment);

export default router;
