/**
 * uncertainty_criteria 関連ルート
 *
 * @remarks
 * 不確かさ基準管理APIのルーティング定義。
 *
 * @module uncertaintyCriteriaRoutes
 * @version 1.0.0
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import * as uncertaintyCriteriaController from '../controllers/uncertaintyCriteriaController';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantIsolation } from '../middleware/tenantIsolation';
import { handleValidationErrors } from '../middleware/validationMiddleware';

const router = Router();

/**
 * 不確かさ基準一覧取得
 * GET /api/v1/uncertainty-criteria
 *
 * @remarks
 * authMiddleware  → セッション検証・req.user に認証情報をセット
 * tenantIsolation → req.user.organizationId を req.organizationId にセット
 */
router.get(
  '/',
  authMiddleware,
  tenantIsolation,
  handleValidationErrors,
  uncertaintyCriteriaController.getList
);

/**
 * 不確かさ基準セレクター用一覧取得
 * GET /api/v1/uncertainty-criteria/for-selector
 *
 * @remarks
 * /:uncertaintyKey より前に定義しないとパスが衝突するため注意。
 * 有効（is_Invalid = FALSE）なレコードのみ返す。定性評価の選択肢も含む。
 */
router.get(
  '/for-selector',
  authMiddleware,
  tenantIsolation,
  handleValidationErrors,
  uncertaintyCriteriaController.getForSelector
);

/**
 * 不確かさ基準 新バージョン保存
 * POST /api/v1/uncertainty-criteria
 *
 * @remarks
 * リクエストボディの uncertaintyKey + nameSpaceId をキーに、
 * MAX(version)+1 で uncertainty_criteria に新規 INSERT する。
 * 定性評価の場合は intuition_selector にも選択肢を INSERT する。
 */
router.post(
  '/',
  authMiddleware,
  tenantIsolation,
  [
    body('nameSpaceId')
      .notEmpty()
      .withMessage('nameSpaceId is required'),
    body('uncertaintyKey')
      .notEmpty()
      .withMessage('uncertaintyKey is required'),
    body('evaluationMethod')
      .notEmpty()
      .withMessage('evaluationMethod is required')
      .isInt({ min: 1, max: 2 })
      .withMessage('evaluationMethod must be 1 (quantitative) or 2 (qualitative)'),
    body('uncertaintyName')
      .optional()
      .isString()
      .withMessage('uncertaintyName must be a string'),
    body('isInvalid')
      .optional()
      .isBoolean()
      .withMessage('isInvalid must be a boolean'),
    body('qualitativeOptions')
      .optional()
      .isArray()
      .withMessage('qualitativeOptions must be an array'),
  ],
  handleValidationErrors,
  uncertaintyCriteriaController.createNewVersion
);

/**
 * 不確かさ基準詳細取得
 * GET /api/v1/uncertainty-criteria/:uncertaintyKey?version=:version
 *
 * @remarks
 * uncertainty_key + version で1件取得。定性評価の場合は intuition_selector も含む。
 */
router.get(
  '/:uncertaintyKey',
  authMiddleware,
  tenantIsolation,
  [
    param('uncertaintyKey')
      .notEmpty()
      .withMessage('uncertaintyKey is required'),
    query('version')
      .notEmpty()
      .withMessage('version (integer) is required')
      .isInt({ min: 1 })
      .withMessage('version must be an integer of 1 or more'),
  ],
  handleValidationErrors,
  uncertaintyCriteriaController.getDetail
);

export default router;
