/**
 * organizationGroup ルート定義
 *
 * 組織階層グループ管理のAPIエンドポイント
 *
 * @module organizationGroupRoutes
 * @version 1.0.0
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantIsolation } from '../middleware/tenantIsolation';
import * as organizationGroupController from '../controllers/organizationGroupController';

const router = Router();

/**
 * 組織グループ一覧取得
 * GET /api/v1/organization-groups
 *
 * @query search - グループCDまたはグループ名による部分一致検索（任意）
 * @roles authMiddleware のみ（ロール制限は将来チーム管理機能実装時に追加）
 */
router.get(
  '/',
  authMiddleware,
  tenantIsolation,
  organizationGroupController.getOrganizationGroups
);

/**
 * 組織グループ新規作成
 * POST /api/v1/organization-groups
 */
router.post(
  '/',
  authMiddleware,
  tenantIsolation,
  organizationGroupController.createOrganizationGroup
);

/**
 * 組織グループ単件取得
 * GET /api/v1/organization-groups/:groupCd
 */
router.get(
  '/:groupCd',
  authMiddleware,
  tenantIsolation,
  organizationGroupController.getOrganizationGroupById
);

/**
 * 組織グループ更新
 * PUT /api/v1/organization-groups/:groupCd
 */
router.put(
  '/:groupCd',
  authMiddleware,
  tenantIsolation,
  organizationGroupController.updateOrganizationGroup
);

/**
 * 組織グループ削除
 * DELETE /api/v1/organization-groups/:groupCd
 */
router.delete(
  '/:groupCd',
  authMiddleware,
  tenantIsolation,
  organizationGroupController.deleteOrganizationGroup
);

export default router;
