/**
 * 組織統計情報ルート
 * GET /api/v1/systemManagement/organization_statistics
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import * as organizationStatisticsController from '../controllers/organizationStatisticsController';

const router = Router();

/**
 * 組織統計情報取得
 * GET /api/v1/systemManagement/organization_statistics
 */
router.get(
  '/organization_statistics',
  authMiddleware,
  organizationStatisticsController.getOrganizationStatistics
);

export default router;
