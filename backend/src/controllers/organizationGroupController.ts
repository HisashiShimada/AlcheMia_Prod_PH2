/**
 * organizationGroup Controller
 *
 * 組織階層グループ管理のAPIエンドポイント処理
 *
 * @module organizationGroupController
 * @version 1.0.0
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
    const organizationId = (req as any).organizationId as string | undefined;
    if (!organizationId) {
      res.status(400).json({ success: false, error: { code: 'E1003', message: 'organizationId が取得できません' } });
      return;
    }

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
    const organizationId = (req as any).organizationId as string | undefined;
    if (!organizationId) {
      res.status(400).json({ success: false, error: { code: 'E1003', message: 'organizationId が取得できません' } });
      return;
    }

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
 * chief_user_id はリクエストユーザー（req.userId）から自動セットされる。
 * フロントエンドからの送信は不要。
 */
export async function createOrganizationGroup(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = (req as any).organizationId as string | undefined;
    if (!organizationId) {
      res.status(400).json({ success: false, error: { code: 'E1003', message: 'organizationId が取得できません' } });
      return;
    }

    const userId = (req as any).userId as string | undefined;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'E5013', message: '認証情報が取得できません' } });
      return;
    }

    const {
      organization_group_cd,
      organization_group_name,
      parent_group_cd,
      layer,
    } = req.body as {
      organization_group_cd?: string;
      organization_group_name?: string;
      parent_group_cd?: string | null;
      layer?: string | null;
    };

    // 必須チェック
    if (!organization_group_cd?.trim()) {
      res.status(400).json({ success: false, error: { code: 'E1003', message: 'organization_group_cd は必須です' } });
      return;
    }
    if (!organization_group_name?.trim()) {
      res.status(400).json({ success: false, error: { code: 'E1003', message: 'organization_group_name は必須です' } });
      return;
    }

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
 */
export async function updateOrganizationGroup(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizationId = (req as any).organizationId as string | undefined;
    if (!organizationId) {
      res.status(400).json({ success: false, error: { code: 'E1003', message: 'organizationId が取得できません' } });
      return;
    }

    const userId = (req as any).userId as string | undefined;
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
      if (!organization_group_name.trim()) {
        res.status(400).json({ success: false, error: { code: 'E1003', message: 'organization_group_name は空にできません' } });
        return;
      }
      updateData.organization_group_name = organization_group_name.trim();
    }
    if (parent_group_cd !== undefined) updateData.parent_group_cd = parent_group_cd;
    if (layer !== undefined) updateData.layer = layer;

    const updated = await organizationGroupService.updateOrganizationGroup(
      organizationId,
      groupCd,
      updateData,
      userId ?? null
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
    const organizationId = (req as any).organizationId as string | undefined;
    if (!organizationId) {
      res.status(400).json({ success: false, error: { code: 'E1003', message: 'organizationId が取得できません' } });
      return;
    }

    const { groupCd } = req.params;
    await organizationGroupService.deleteOrganizationGroup(organizationId, groupCd);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
