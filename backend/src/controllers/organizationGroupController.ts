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

/**
 * 組織グループ一覧取得
 * GET /api/v1/organization-groups
 *
 * @query search - グループCDまたはグループ名による部分一致検索（任意）
 */
export async function getOrganizationGroups(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = req.organizationId!;
    const search = req.query.search as string | undefined;

    const groups = await organizationGroupService.getOrganizationGroups(
      organizationId,
      { search }
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

    const group = await organizationGroupService.getOrganizationGroupById(organizationId, groupCd);

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
 * @body layer - レイヤー（任意）
 *
 * @remarks
 * chief_user_id はリクエストユーザー（req.user.userId）から自動セットされる。
 * フロントエンドからの送信は不要。
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
      layer,
    } = req.body as {
      organization_group_cd: string;
      organization_group_name: string;
      parent_group_cd?: string | null;
      layer?: string | null;
    };

    const created = await organizationGroupService.createOrganizationGroup(
      organizationId,
      {
        organization_group_cd: organization_group_cd.trim(),
        organization_group_name: organization_group_name.trim(),
        chief_user_id: userId,  // ログインユーザーを代表者として自動セット
        parent_group_cd: parent_group_cd ?? null,
        layer: layer ?? null,
      },
      userId
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
    } = req.body as {
      organization_group_name?: string;
      parent_group_cd?: string | null;
      layer?: string | null;
    };

    const updateData: {
      organization_group_name?: string;
      parent_group_cd?: string | null;
      layer?: string | null;
    } = {};

    if (organization_group_name !== undefined) {
      updateData.organization_group_name = organization_group_name.trim();
    }
    if (parent_group_cd !== undefined) updateData.parent_group_cd = parent_group_cd;
    if (layer !== undefined) updateData.layer = layer;

    const updated = await organizationGroupService.updateOrganizationGroup(
      organizationId,
      groupCd,
      updateData,
      userId
    );

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * 組織グループ削除
 * DELETE /api/v1/organization-groups/:groupCd
 */
export async function deleteOrganizationGroup(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = req.organizationId!;
    const { groupCd } = req.params;

    await organizationGroupService.deleteOrganizationGroup(organizationId, groupCd);

    res.json({ success: true });
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

    const members = await organizationGroupService.getOrganizationGroupMembers(organizationId, groupCd);

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
    const { userIds } = req.body as { userIds: string[] };

    await organizationGroupService.setOrganizationGroupMembers(organizationId, groupCd, userIds);

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
    const { chiefUserId } = req.body as { chiefUserId: string };

    const updated = await organizationGroupService.updateOrganizationGroupChief(
      organizationId,
      groupCd,
      chiefUserId.trim(),
      userId
    );

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}
