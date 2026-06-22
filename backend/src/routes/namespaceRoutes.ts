/**
 * namespace 関連ルート
 *
 * @remarks
 * 主キーが (organization_id, prefix, local_name) の複合キーのため、
 * PUT / DELETE は /:prefix/:localName をパラメータとして使用する。
 *
 * @module namespaceRoutes
 * @version 2.0.0
 */

import { Router } from 'express';
import * as namespaceController from '../controllers/namespaceController';

const router = Router();

/**
 * 用語一覧取得
 * GET /api/v1/namespaces/terms
 *
 * @remarks 開発中は認証なしで全件取得可能。organizationId クエリパラメータで絞り込み可。
 */
router.get(
  '/terms',
  namespaceController.getTerms
);

/**
 * 用語新規登録
 * POST /api/v1/namespaces/terms
 *
 * @body { organizationId, prefix, localName, displayName?, description?, typeHint?, unitHint? }
 */
router.post(
  '/terms',
  namespaceController.createTerm
);

/**
 * 用語更新
 * PUT /api/v1/namespaces/terms/:prefix/:localName
 *
 * @remarks prefix と localName で対象を特定する（organizationId はミドルウェアまたはクエリから取得）
 */
router.put(
  '/terms/:prefix/:localName',
  namespaceController.updateTerm
);

/**
 * 用語削除
 * DELETE /api/v1/namespaces/terms/:prefix/:localName
 *
 * @remarks prefix と localName で対象を特定する（organizationId はミドルウェアまたはクエリから取得）
 */
router.delete(
  '/terms/:prefix/:localName',
  namespaceController.deleteTerm
);

export default router;
