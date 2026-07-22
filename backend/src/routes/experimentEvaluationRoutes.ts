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
import * as experimentEvaluationController from '../controllers/experimentEvaluationController';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantIsolation } from '../middleware/tenantIsolation';

const router = Router();

/**
 * プロジェクトの評価結果一覧取得
 * GET /api/v1/experiment-evaluations/:projectId
 */
router.get(
  '/:projectId',
  authMiddleware,
  tenantIsolation,
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
  experimentEvaluationController.exportToMaiml
);

export default router;
