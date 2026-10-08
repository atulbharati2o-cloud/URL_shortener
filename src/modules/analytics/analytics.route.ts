import { Router } from 'express';
import { getAnalytics } from './analytics.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();


router.get(
    '/url/:id',
    authenticate,
    getAnalytics
)

export default router;