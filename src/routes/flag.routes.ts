import { Router } from 'express';
import {
    updateFeatureFlag,
    createFeatureFlag,
    getAllFeatureFlags,
    getFeatureFlagById,
} from '../controllers/flag.controller.js';

const router = Router();
router.post('/', createFeatureFlag);
router.patch('/:id', updateFeatureFlag);
router.get('/', getAllFeatureFlags);
router.get('/:id', getFeatureFlagById);

export default router;
