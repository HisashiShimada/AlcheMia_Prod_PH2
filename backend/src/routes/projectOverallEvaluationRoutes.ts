/**
 * projectOverallEvaluationRoutes.ts
 *
 * プロジェクト全体評価 API のルーティング定義
 *
 * @module projectOverallEvaluationRoutes
 * @version 1.1.0
 */

import { Router } from 'express';
import { body, param } from 'express-validator';
import * as projectOverallEvaluationController from '../controllers/projectOverallEvaluationController';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantIsolation } from '../middleware/tenantIsolation';
import { handleValidationErrors } from '../middleware/validationMiddleware';
import { SubEvaluationScopeValues } from '../enums/aggregationRule.enum';

const router = Router();

/**
 * 階層別サマリーのプレビュー取得（未登録の動的算出）
 * GET /api/v1/project-overall-evaluations/:projectId/summary
 * ※ /:projectId より先に登録すること（具体パスを優先させるため）
 */
router.get(
  '/:projectId/summary',
  authMiddleware,
  tenantIsolation,
  [
    param('projectId').notEmpty().withMessage('projectId is required').isString(),
  ],
  handleValidationErrors,
  projectOverallEvaluationController.getSummary
);

/**
 * 下位評価一覧取得
 * GET /api/v1/project-overall-evaluations/:projectId/sub-evaluations
 * ※ /:projectId より先に登録すること（具体パスを優先させるため）
 */
router.get(
  '/:projectId/sub-evaluations',
  authMiddleware,
  tenantIsolation,
  [
    param('projectId').notEmpty().withMessage('projectId is required').isString(),
  ],
  handleValidationErrors,
  projectOverallEvaluationController.getSubEvaluations
);

/**
 * 品質評価データを MAiML ファイルの <eventLog> に書き込む
 * POST /api/v1/project-overall-evaluations/:projectId/export-to-maiml
 * ※ /:projectId より先に登録すること（具体パスを優先させるため）
 */
router.post(
  '/:projectId/export-to-maiml',
  authMiddleware,
  tenantIsolation,
  [
    param('projectId').notEmpty().withMessage('projectId is required').isString(),
  ],
  handleValidationErrors,
  projectOverallEvaluationController.exportToMaiml
);

/**
 * 下位評価を一括保存
 * POST /api/v1/project-overall-evaluations/:projectId/sub-evaluations
 * ※ /:projectId より先に登録すること（具体パスを優先させるため）
 */
router.post(
  '/:projectId/sub-evaluations',
  authMiddleware,
  tenantIsolation,
  [
    param('projectId').notEmpty().withMessage('projectId is required').isString(),
    body('evaluations').isArray({ min: 1 }).withMessage('evaluations must be a non-empty array'),
    body('evaluations.*.evaluationScope')
      .notEmpty()
      .withMessage('evaluationScope is required')
      .isIn(Object.values(SubEvaluationScopeValues))
      .withMessage('evaluationScope must be METHOD/TASK/TRANSITION_METHOD/TRANSITION_TASK'),
    body('evaluations.*.evaluationValue')
      .optional()
      .isIn(['良好', '要確認', '不良'])
      .withMessage('evaluationValue must be 良好/要確認/不良'),
  ],
  handleValidationErrors,
  projectOverallEvaluationController.saveSubEvaluations
);

/**
 * 全体評価を登録（断面を凍結して保存）
 * POST /api/v1/project-overall-evaluations
 */
router.post(
  '/',
  authMiddleware,
  tenantIsolation,
  [
    body('projectId').notEmpty().withMessage('projectId is required').isString(),
    body('overallDigital').optional().isIn(['良好', '要確認', '不良']).withMessage('overallDigital must be 良好/要確認/不良'),
    body('overallScore').optional().isInt({ min: 0, max: 100 }).withMessage('overallScore must be 0-100'),
    body('overallAnalog').optional().isString(),
  ],
  handleValidationErrors,
  projectOverallEvaluationController.createOverallEvaluation
);

/**
 * プロジェクトの全体評価一覧取得（最新順）
 * GET /api/v1/project-overall-evaluations/:projectId
 * ※ 具体パス（/summary, /sub-evaluations 等）の後に登録すること
 */
router.get(
  '/:projectId',
  authMiddleware,
  tenantIsolation,
  [
    param('projectId').notEmpty().withMessage('projectId is required').isString(),
  ],
  handleValidationErrors,
  projectOverallEvaluationController.getByProject
);

export default router;
