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
      .withMessage('projectIdは必須です')
      .isString()
      .withMessage('projectIdは文字列である必要があります'),
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
      .withMessage('projectIdは必須です')
      .isString()
      .withMessage('projectIdは文字列である必要があります'),
    body('evaluations')
      .isArray({ min: 1 })
      .withMessage('evaluationsは1件以上の配列である必要があります'),
    body('evaluations.*.evaluationUnit')
      .notEmpty()
      .withMessage('evaluationUnitは必須です'),
    body('evaluations.*.nameSpaceId')
      .notEmpty()
      .withMessage('nameSpaceIdは必須です'),
    body('evaluations.*.uncertaintyKey')
      .notEmpty()
      .withMessage('uncertaintyKeyは必須です'),
    body('evaluations.*.ucVersion')
      .isInt({ min: 1 })
      .withMessage('ucVersionは1以上の整数である必要があります'),
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
      .withMessage('projectIdは必須です')
      .isString()
      .withMessage('projectIdは文字列である必要があります'),
  ],
  handleValidationErrors,
  experimentEvaluationController.exportToMaiml
);

export default router;
