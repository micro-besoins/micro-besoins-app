import { Router } from 'express';
import { createConversation, getConversations, getMessages, postMessage } from '../controllers/conversation.controller';
import { authenticate } from '../middleware/auth.middleware';
import { createMessageReport } from '../controllers/message-report.controller';

const router = Router();
router.use(authenticate);
router.get('/', getConversations);
router.post('/', createConversation);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', postMessage);
router.post('/:id/signalements', createMessageReport);

export default router;
