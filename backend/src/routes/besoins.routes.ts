import { Router } from 'express';
import * as besoins from '../controllers/besoins.controller';

const router = Router();

router.get('/', besoins.list);

export default router;