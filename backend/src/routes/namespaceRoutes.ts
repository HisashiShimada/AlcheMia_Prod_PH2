/**
 * namespace 関連ルート
 *
 * @module namespaceRoutes
 * @version 1.0.0
 */

import { Router } from 'express';
import * as namespaceController from '../controllers/namespaceController';
import { authMiddleware } from '../middleware/authMiddleware';

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
 * @remarks prefix から namespace.id を解決し namespace_term に INSERT する
 */
router.post(
  '/terms',
  namespaceController.createTerm
);

/**
 * 用語更新
 * PUT /api/v1/namespaces/terms/:id
 */
router.put(
  '/terms/:id',
  namespaceController.updateTerm
);

/**
 * 用語削除
 * DELETE /api/v1/namespaces/terms/:id
 */
router.delete(
  '/terms/:id',
  namespaceController.deleteTerm
);

export default router;
