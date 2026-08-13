/**
 * organizationGroup ルート定義
 *
 * 組織階層グループ管理のAPIエンドポイント
 *
 * @remarks
 * バリデーションは express-validator のルール + handleValidationErrors で実施する。
 * Controller 内にはバリデーションロジックを記述しない。
 *
 * @module organizationGroupRoutes
 * @version 2.0.0
 */

import { Router } from 'express';
import { body, param } from 'express-validator';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantIsolation } from '../middleware/tenantIsolation';
import { handleValidationErrors } from '../middleware/validationMiddleware';
import * as organizationGroupController from '../controllers/organizationGroupController';

const router = Router();

// 全エンドポイントに認証・テナント分離ミドルウェアを適用
router.use(authMiddleware, tenantIsolation);

/**
 * 組織グループ一覧取得
 * GET /api/v1/organization-groups
 *
 * @query search - グループCDまたはグループ名による部分一致検索（任意）
 */
router.get('/', organizationGroupController.getOrganizationGroups);

/**
 * 組織グループ新規作成
 * POST /api/v1/organization-groups
 *
 * @body organization_group_cd - グループCD（必須）
 * @body organization_group_name - グループ名（必須）
 * @body parent_group_cd - 親グループCD（任意）
 *
 * @remarks
 * layer は parent_group_cd から自動算出されるため送信不要。
 */
router.post(
  '/',
  [
    body('organization_group_cd')
      .notEmpty()
      .withMessage('organization_group_cd は必須です')
      .isString()
      .withMessage('organization_group_cd は文字列で指定してください')
      .trim(),
    body('organization_group_name')
      .notEmpty()
      .withMessage('organization_group_name は必須です')
      .isString()
      .withMessage('organization_group_name は文字列で指定してください')
      .trim(),
  ],
  handleValidationErrors,
  organizationGroupController.createOrganizationGroup
);

/**
 * ログインユーザーの所属グループ＋全祖先グループの CD 一覧取得
 * GET /api/v1/organization-groups/ancestors
 *
 * @remarks
 * /:groupCd より前に定義しないとルートが競合するため注意。
 * 用語重複チェックで上位層グループの名前空間を特定するために使用。
 */
router.get(
  '/ancestors',
  authMiddleware,
  tenantIsolation,
  organizationGroupController.getAncestorGroupCds
);

/**
 * 組織内ユーザー一覧取得（グループメンバー選択用）
 * GET /api/v1/organization-groups/users
 *
 * @remarks /:groupCd より前に定義する必要がある（ルーティング競合回避）
 */
router.get('/users', organizationGroupController.getOrgUsers);

/**
 * グループメンバー一覧取得
 * GET /api/v1/organization-groups/:groupCd/members
 */
router.get(
  '/:groupCd/members',
  [
    param('groupCd').notEmpty().withMessage('groupCd は必須です'),
  ],
  handleValidationErrors,
  organizationGroupController.getOrganizationGroupMembers
);

/**
 * グループメンバー一括更新
 * PUT /api/v1/organization-groups/:groupCd/members
 *
 * @body userIds - 設定するユーザーIDの配列
 */
router.put(
  '/:groupCd/members',
  [
    param('groupCd').notEmpty().withMessage('groupCd は必須です'),
    body('userIds')
      .isArray()
      .withMessage('userIds は配列で指定してください'),
  ],
  handleValidationErrors,
  organizationGroupController.setOrganizationGroupMembers
);

/**
 * グループ代表者変更
 * PUT /api/v1/organization-groups/:groupCd/chief
 *
 * @body chiefUserId - 新しい代表者ユーザーID
 */
router.put(
  '/:groupCd/chief',
  [
    param('groupCd').notEmpty().withMessage('groupCd は必須です'),
    body('chiefUserId')
      .notEmpty()
      .withMessage('chiefUserId は必須です')
      .isString()
      .withMessage('chiefUserId は文字列で指定してください')
      .trim(),
  ],
  handleValidationErrors,
  organizationGroupController.updateOrganizationGroupChief
);

/**
 * 組織グループ単件取得
 * GET /api/v1/organization-groups/:groupCd
 */
router.get(
  '/:groupCd',
  [
    param('groupCd').notEmpty().withMessage('groupCd は必須です'),
  ],
  handleValidationErrors,
  organizationGroupController.getOrganizationGroupById
);

/**
 * 組織グループ更新
 * PUT /api/v1/organization-groups/:groupCd
 *
 * @body organization_group_name - グループ名（任意）
 * @body parent_group_cd - 親グループCD（任意）
 * @body layer - レイヤー（任意）
 */
router.put(
  '/:groupCd',
  [
    param('groupCd').notEmpty().withMessage('groupCd は必須です'),
    body('organization_group_name')
      .optional()
      .notEmpty()
      .withMessage('organization_group_name を指定する場合は空文字列にできません')
      .isString()
      .withMessage('organization_group_name は文字列で指定してください')
      .trim(),
  ],
  handleValidationErrors,
  organizationGroupController.updateOrganizationGroup
);

/**
 * 組織グループ アクティブ状態更新（論理削除 / 有効化 共用）
 * PATCH /api/v1/organization-groups/:groupCd/status
 *
 * @body isActive - 設定するアクティブ状態（boolean, 必須）
 *
 * @remarks
 * isActive = false: 無効化（論理削除）。メンバーを物理削除する。
 * isActive = true: 有効化。
 */
router.patch(
  '/:groupCd/status',
  [
    param('groupCd').notEmpty().withMessage('groupCd は必須です'),
    body('isActive')
      .isBoolean()
      .withMessage('isActive は boolean で指定してください'),
  ],
  handleValidationErrors,
  organizationGroupController.updateOrganizationGroupStatus
);

export default router;
