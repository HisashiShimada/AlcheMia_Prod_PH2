/**
 * experiment_evaluation 関連ルート
 *
 * @remarks
 * 実験評価APIのルーティング定義。
 * 承認処理ダイアログの定性評価保存・取得に使用する。
 *
 * @module experimentEvaluationRoutes
 * @version 1.0.0
 */

import { Router } from 'express';
import { body, param } from 'express-validator';
import * as experimentEvaluationController from '../controllers/experimentEvaluationController';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantIsolation } from '../middleware/tenantIsolation';
import { handleValidationErrors } from '../middleware/validationMiddleware';

const router = Router();

/**
 * プロジェクトの評価結果一覧取得
 * GET /api/v1/experiment-evaluations/:projectId
 */
router.get(
  '/:projectId',
  authMiddleware,
  tenantIsolation,
  [
    param('projectId')
      .notEmpty()
      .withMessage('projectId is required')
      .isString()
      .withMessage('projectId must be a string'),
  ],
  handleValidationErrors,
  experimentEvaluationController.getByProject
);

/**
 * 評価結果を一括UPSERT（保存）
 * POST /api/v1/experiment-evaluations
 */
router.post(
  '/',
  authMiddleware,
  tenantIsolation,
  [
    body('projectId')
      .notEmpty()
      .withMessage('projectId is required')
      .isString()
      .withMessage('projectId must be a string'),
    body('evaluations')
      .isArray({ min: 1 })
      .withMessage('evaluations must be an array with at least 1 item'),
    body('evaluations.*.evaluationUnit')
      .notEmpty()
      .withMessage('evaluationUnit is required'),
    body('evaluations.*.nameSpaceId')
      .notEmpty()
      .withMessage('nameSpaceId is required'),
    body('evaluations.*.uncertaintyKey')
      .notEmpty()
      .withMessage('uncertaintyKey is required'),
    body('evaluations.*.ucVersion')
      .isInt({ min: 1 })
      .withMessage('ucVersion must be an integer of 1 or more'),
  ],
  handleValidationErrors,
  experimentEvaluationController.saveEvaluations
);

/**
 * DBの評価データを MAiML ファイルへ一括書き込み（プロジェクト完了処理）
 * POST /api/v1/experiment-evaluations/:projectId/export-to-maiml
 */
router.post(
  '/:projectId/export-to-maiml',
  authMiddleware,
  tenantIsolation,
  [
    param('projectId')
      .notEmpty()
      .withMessage('projectId is required')
      .isString()
      .withMessage('projectId must be a string'),
  ],
  handleValidationErrors,
  experimentEvaluationController.exportToMaiml
);

export default router;
