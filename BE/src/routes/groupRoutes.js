import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import * as groupController from '../controllers/groupController.js';

const router = Router();

router.use(requireAuth);

router.post('/', groupController.createGroup);
router.get('/', groupController.getUserGroups);
router.post('/join', groupController.joinGroupByCode);

export default router;