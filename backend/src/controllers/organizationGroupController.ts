/**
 * organizationGroup Controller
 *
 * 組織階層グループ管理のAPIエンドポイント処理
 *
 * @remarks
 * - Controller は Service 層のみを呼び出す。Repository への直接参照は禁止。
 * - リクエストパラメータの検証は organizationGroupValidation.ts のミドルウェアで実施済み。
 *   Controller 内にバリデーションロジックを記述しない。
 * - organizationId / userId は authMiddleware・tenantIsolation で設定された
 *   req.user / req.organizationId から取得する。
 *
 * @module organizationGroupController
 * @version 2.0.0
 */

import { Request, Response, NextFunction } from 'express';
import * as organizationGroupService from '../services/organizationGroupService';
import type {
  CreateOrganizationGroupBody,
  UpdateOrganizationGroupBody,
  UpdateOrganizationGroupStatusBody,
  SetGroupMembersBody,
  UpdateGroupChiefBody,
} from '../types/api';

/**
 * 組織グループ一覧取得
 * GET /api/v1/organization-groups
 *
 * @query search - グループCDまたはグループ名による部分一致検索（任意）
 * @query visibleOnly - true の場合、ログインユーザーが閲覧可能なグループのみを返す
 *
 * @remarks
 * visibleOnly=true 以外の場合は、ログインユーザーが代表者（chief_user_id）のチームのみを返す。
 * visibleOnly=true の場合は、非アクティブチームの権限ルールを反映した閲覧可能グループ一覧を返す。
 */
export async function getOrganizationGroups(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = req.organizationId!;
    const visibleOnly = req.query.visibleOnly === 'true';

    if (visibleOnly) {
      const userGroupCds = req.user!.organizationGroupCds ?? [];
      const groups = await organizationGroupService.getVisibleOrganizationGroups(
        organizationId,
        userGroupCds
      );
      res.json({ success: true, data: { groups } });
      return;
    }

    const search = req.query.search as string | undefined;
    const chiefUserId = req.user!.userId;

    const groups = await organizationGroupService.getOrganizationGroups(
      organizationId,
      { search, chiefUserId }
    );

    res.json({ success: true, data: groups });
  } catch (error) {
    next(error);
  }
}

/**
 * 組織グループ単件取得
 * GET /api/v1/organization-groups/:groupCd
 */
export async function getOrganizationGroupById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = req.organizationId!;
    const { groupCd } = req.params;
    const lang = ((req.headers['accept-language'] as string) || 'ja').split(',')[0].split('-')[0];

    const group = await organizationGroupService.getOrganizationGroupById(organizationId, groupCd, lang);

    res.json({ success: true, data: group });
  } catch (error) {
    next(error);
  }
}

/**
 * 組織グループ新規作成
 * POST /api/v1/organization-groups
 *
 * @body organization_group_cd - グループCD（必須）
 * @body organization_group_name - グループ名（必須）
 * @body parent_group_cd - 親グループCD（任意）
 *
 * @remarks
 * chief_user_id はリクエストユーザー（req.user.userId）から自動セットされる。
 * layer は parent_group_cd から自動算出されるためフロントエンドからの送信は不要。
 * バリデーションは validateCreateOrganizationGroup ミドルウェアで実施済み。
 */
export async function createOrganizationGroup(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = req.organizationId!;
    const userId = req.user!.userId;

    const {
      organization_group_cd,
      organization_group_name,
      parent_group_cd,
    } = req.body as CreateOrganizationGroupBody;

    const lang = ((req.headers['accept-language'] as string) || 'ja').split(',')[0].split('-')[0];

    const created = await organizationGroupService.createOrganizationGroup(
      organizationId,
      {
        organization_group_cd: organization_group_cd.trim(),
        organization_group_name: organization_group_name.trim(),
        chief_user_id: userId,  // ログインユーザーを代表者として自動セット
        parent_group_cd: parent_group_cd ?? null,
      },
      userId,
      lang
    );

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
}

/**
 * 組織グループ更新
 * PUT /api/v1/organization-groups/:groupCd
 *
 * @body organization_group_name - グループ名（任意）
 * @body parent_group_cd - 親グループCD（任意）
 * @body layer - レイヤー（任意）
 *
 * @remarks
 * chief_user_id はフロントエンドから送信しない。
 * 既存の chief_user_id を維持する（サービス層で処理）。
 * バリデーションは validateUpdateOrganizationGroup ミドルウェアで実施済み。
 */
export async function updateOrganizationGroup(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = req.organizationId!;
    const userId = req.user!.userId;
    const { groupCd } = req.params;

    const {
      organization_group_name,
      parent_group_cd,
      layer,
    } = req.body as UpdateOrganizationGroupBody;

    const updateData: UpdateOrganizationGroupBody = {};

    if (organization_group_name !== undefined) {
      updateData.organization_group_name = organization_group_name.trim();
    }
    if (parent_group_cd !== undefined) updateData.parent_group_cd = parent_group_cd;
    if (layer !== undefined) updateData.layer = layer;

    const lang = ((req.headers['accept-language'] as string) || 'ja').split(',')[0].split('-')[0];

    const updated = await organizationGroupService.updateOrganizationGroup(
      organizationId,
      groupCd,
      updateData,
      userId,
      lang
    );

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * 組織グループ アクティブ状態更新（論理削除 / 有効化 共用）
 * PATCH /api/v1/organization-groups/:groupCd/status
 *
 * @body isActive - 設定するアクティブ状態（boolean）
 *
 * @remarks
 * isActive = false: 無効化（論理削除）。メンバーを物理削除する。
 * isActive = true: 有効化。メンバーは空のまま（再追加が必要）。
 * バリデーションは routes 側で実施済み。
 */
export async function updateOrganizationGroupStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = req.organizationId!;
    const userId = req.user!.userId;
    const { groupCd } = req.params;
    const { isActive } = req.body as UpdateOrganizationGroupStatusBody;
    
    const lang = ((req.headers['accept-language'] as string) || 'ja').split(',')[0].split('-')[0];

    const updated = await organizationGroupService.updateOrganizationGroupActiveStatus(
      organizationId,
      groupCd,
      isActive,
      userId,
      lang
    );

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * ログインユーザーの所属グループ＋全祖先グループの CD 一覧を返す
 * GET /api/v1/organization-groups/ancestors
 *
 * @remarks
 * 用語重複チェックで「上位層グループの名前空間」を特定するために使用する。
 * findByUser の WITH RECURSIVE クエリで自分の直接所属グループと
 * parent_group_cd を再帰的に辿った全祖先グループを取得する。
 */
export async function getAncestorGroupCds(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = req.organizationId!;
    const userId = req.userId!;

    // Service 経由で所属グループ + 全祖先グループの CD 一覧を取得
    const groupCds = await organizationGroupService.getAncestorGroupCds(organizationId, userId);

    res.json({ success: true, data: groupCds });
  } catch (error) {
    next(error);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 組織ユーザー一覧取得（グループメンバー選択用）
// ──────────────────────────────────────────────────────────────────────────

/**
 * 組織内のアクティブなユーザー一覧を取得
 * GET /api/v1/organization-groups/users
 *
 * @remarks
 * TeamAddDialog / TeamEditDialog のメンバー追加プルダウン用。
 * /:groupCd より前に定義すること（ルーティング競合回避）。
 */
export async function getOrgUsers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = req.organizationId!;

    const users = await organizationGroupService.getOrgUsersForGroups(organizationId);
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// メンバー管理
// ──────────────────────────────────────────────────────────────────────────

/**
 * グループメンバー一覧取得
 * GET /api/v1/organization-groups/:groupCd/members
 */
export async function getOrganizationGroupMembers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = req.organizationId!;
    const { groupCd } = req.params;
    const lang = ((req.headers['accept-language'] as string) || 'ja').split(',')[0].split('-')[0];

    const members = await organizationGroupService.getOrganizationGroupMembers(organizationId, groupCd, lang);

    res.json({ success: true, data: members });
  } catch (error) {
    next(error);
  }
}

/**
 * グループメンバー一括更新
 * PUT /api/v1/organization-groups/:groupCd/members
 *
 * @body userIds - 設定するユーザーIDの配列
 * @remarks バリデーションは validateSetOrganizationGroupMembers ミドルウェアで実施済み。
 */
export async function setOrganizationGroupMembers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = req.organizationId!;
    const { groupCd } = req.params;
    const { userIds } = req.body as SetGroupMembersBody;

    const lang = ((req.headers['accept-language'] as string) || 'ja').split(',')[0].split('-')[0];

    await organizationGroupService.setOrganizationGroupMembers(organizationId, groupCd, userIds, lang);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

/**
 * グループ代表者変更
 * PUT /api/v1/organization-groups/:groupCd/chief
 *
 * @body chiefUserId - 新しい代表者ユーザーID
 * @remarks バリデーションは validateUpdateOrganizationGroupChief ミドルウェアで実施済み。
 */
export async function updateOrganizationGroupChief(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = req.organizationId!;
    const userId = req.user!.userId;
    const { groupCd } = req.params;
    const { chiefUserId } = req.body as UpdateGroupChiefBody;

    const lang = ((req.headers['accept-language'] as string) || 'ja').split(',')[0].split('-')[0];

    const updated = await organizationGroupService.updateOrganizationGroupChief(
      organizationId,
      groupCd,
      chiefUserId.trim(),
      userId,
      lang
    );

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}
