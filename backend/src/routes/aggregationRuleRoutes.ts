/**
 * aggregationRuleRoutes.ts
 *
 * 集約ルール API のルーティング定義
 *
 * @module aggregationRuleRoutes
 * @version 1.0.0
 */

import { Router } from 'express';
import { body, param } from 'express-validator';
import * as aggregationRuleController from '../controllers/aggregationRuleController';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantIsolation } from '../middleware/tenantIsolation';
import { handleValidationErrors } from '../middleware/validationMiddleware';

const router = Router();

/**
 * テナントの ACTIVE ルールを取得
 * GET /api/v1/aggregation-rules/active
 */
router.get(
  '/active',
  authMiddleware,
  tenantIsolation,
  aggregationRuleController.getActive
);

/**
 * テナントのルール履歴一覧を取得
 * GET /api/v1/aggregation-rules
 */
router.get(
  '/',
  authMiddleware,
  tenantIsolation,
  aggregationRuleController.getAll
);

/**
 * 新版の集約ルールを作成して ACTIVE に設定（旧版は DEPRECATED）
 * POST /api/v1/aggregation-rules
 */
router.post(
  '/',
  authMiddleware,
  tenantIsolation,
  [
    body('score_good').optional().isInt({ min: 0, max: 100 }).withMessage('score_good must be 0-100'),
    body('score_caution').optional().isInt({ min: 0, max: 100 }).withMessage('score_caution must be 0-100'),
    body('score_bad').optional().isInt({ min: 0, max: 100 }).withMessage('score_bad must be 0-100'),
    body('target_rollup').optional().isIn(['WORST_CASE', 'MAJORITY', 'AVERAGE']),
    body('level_status_rule').optional().isIn(['WORST_CASE', 'MAJORITY']),
    body('level_score_rule').optional().isIn(['MEAN', 'MIN']),
    body('missing_handling').optional().isIn(['SEPARATE_COUNT', 'EXCLUDE_DENOMINATOR', 'TREAT_AS_GOOD']),
    body('transition_hierarchy').optional().isIn(['MERGE', 'SPLIT']),
  ],
  handleValidationErrors,
  aggregationRuleController.createRule
);

/**
 * 登録済みデータに対するプレビュー算出
 * POST /api/v1/aggregation-rules/preview
 */
router.post(
  '/preview',
  authMiddleware,
  tenantIsolation,
  [
    body('projectId').notEmpty().withMessage('projectId is required').isString(),
  ],
  handleValidationErrors,
  aggregationRuleController.previewSummary
);

export default router;
