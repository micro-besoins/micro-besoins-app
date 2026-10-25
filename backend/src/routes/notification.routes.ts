import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  readAllNotifications,
  readNotification,
} from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', readAllNotifications);
router.patch('/:id/read', readNotification);

export default router;
