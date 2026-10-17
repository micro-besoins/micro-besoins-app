import { Router } from 'express';
import adminRoutes from './admin.routes';
import healthRoutes from './health.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/admin', adminRoutes);

export default router;