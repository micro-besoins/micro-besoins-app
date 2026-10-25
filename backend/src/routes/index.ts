import { Router } from 'express';
import adminRoutes from './admin.routes';
import healthRoutes from './health.routes';
import notificationRoutes from './notification.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);

export default router;
