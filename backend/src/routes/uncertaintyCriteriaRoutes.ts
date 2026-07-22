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
import * as uncertaintyCriteriaController from '../controllers/uncertaintyCriteriaController';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantIsolation } from '../middleware/tenantIsolation';

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
  uncertaintyCriteriaController.getDetail
);

export default router;
