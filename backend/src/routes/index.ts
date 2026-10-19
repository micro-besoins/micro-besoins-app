import { Router } from 'express';
import adminRoutes from './admin.routes';
import besoinsRoutes from './besoins.routes';
import healthRoutes from './health.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/besoins', besoinsRoutes);
router.use('/admin', adminRoutes);

export default router;