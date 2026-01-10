import { Router } from 'express';
import {
    getAllElements,
    getElementById,
    getCategories,
    getHealth,
    getRoot
} from '../controllers/element.controller.js';

const router = Router();

router.get('/', getRoot);
router.get('/api/health', getHealth);
router.get('/api/elements', getAllElements);
router.get('/api/elements/:atomicNumber', getElementById);
router.get('/api/categories', getCategories);

export default router;
