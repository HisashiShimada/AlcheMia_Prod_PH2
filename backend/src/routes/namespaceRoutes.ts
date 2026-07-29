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
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantIsolation } from '../middleware/tenantIsolation';
import * as namespaceController from '../controllers/namespaceController';

const router = Router();

// 全エンドポイントに認証・テナント分離ミドルウェアを適用
router.use(authMiddleware, tenantIsolation);

/**
 * 名前空間（Prefix）一覧取得
 * GET /api/v1/namespaces
 */
router.get(
  '/',
  namespaceController.getNamespaces
);

/**
 * 名前空間（Prefix）新規登録
 * POST /api/v1/namespaces
 *
 * @body { organizationId, prefix, uri, displayName?, description?, departmentCd? }
 */
router.post(
  '/',
  namespaceController.createNamespace
);

/**
 * 名前空間（Prefix）削除
 * DELETE /api/v1/namespaces/:prefix
 */
router.delete(
  '/:prefix',
  namespaceController.deleteNamespace
);

/**
 * 名前空間宣言一覧取得（prefix + uri）
 * GET /api/v1/namespaces/declarations
 *
 * @remarks MAIML XML ビュー表示・保存前の xmlns 注入に使用する。
 *          organizationId クエリパラメータまたは認証ミドルウェアから取得。
 */
router.get(
  '/declarations',
  namespaceController.getDeclarations
);

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

/**
 * プロジェクトスコープ絞り込み名前空間宣言一覧
 * GET /api/v1/namespaces/project-declarations?projectId=xxx
 */
router.get(
  '/project-declarations',
  namespaceController.getDeclarationsByProject
);

export default router;
