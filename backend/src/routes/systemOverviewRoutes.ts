/**
 * システム概要ルーター
 *
 * GET /api/v1/systemManagement/system-overview
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantIsolation } from '../middleware/tenantIsolation';
import { getOverview } from '../controllers/systemOverviewController';

const router = Router();

/**
 * システム概要統計取得
 * GET /api/v1/systemManagement/system-overview
 */
router.get(
  '/system-overview',
  authMiddleware,
  tenantIsolation,
  getOverview
);

export default router;
