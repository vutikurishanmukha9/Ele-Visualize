import { Router } from 'express';
import {
    getSessionById,
    getSessions,
    postSession,
    putSession,
    removeSession,
} from '../controllers/session.controller.js';

const router = Router();

router.get('/api/sessions', getSessions);
router.post('/api/sessions', postSession);
router.get('/api/sessions/:id', getSessionById);
router.put('/api/sessions/:id', putSession);
router.delete('/api/sessions/:id', removeSession);

export default router;
