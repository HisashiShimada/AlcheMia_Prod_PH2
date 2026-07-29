/**
 * organizationGroup Service
 *
 * 組織階層グループ管理のビジネスロジックを提供
 *
 * @module organizationGroupService
 * @version 1.0.0
 */

import * as organizationGroupRepository from '../repositories/organizationGroupRepository';
import type { OrganizationGroupRow, OrganizationGroupFilters } from '../repositories/organizationGroupRepository';
import { E6001, E7001 } from '../enums/errorCodes';

/**
 * 組織グループ一覧取得
 *
 * @param organizationId - 組織ID
 * @param filters - 検索フィルタ
 * @returns 組織グループ一覧
 */
export async function getOrganizationGroups(
  organizationId: string,
  filters?: OrganizationGroupFilters
): Promise<OrganizationGroupRow[]> {
  return organizationGroupRepository.findAll(organizationId, filters);
}

/**
 * 組織グループ単件取得
 *
 * @param organizationId - 組織ID
 * @param groupCd - 組織グループCD
 * @returns 組織グループ
 * @throws 存在しない場合は E6001（リソース不存在）エラー
 */
export async function getOrganizationGroupById(
  organizationId: string,
  groupCd: string
): Promise<OrganizationGroupRow> {
  const group = await organizationGroupRepository.findById(organizationId, groupCd);
  if (!group) {
    const error = new Error('組織グループが見つかりません') as Error & { code: string; statusCode: number };
    error.code = E6001;
    error.statusCode = 404;
    throw error;
  }
  return group;
}

/**
 * 組織グループ新規作成
 *
 * @param organizationId - 組織ID
 * @param data - 作成データ
 * @param userId - 作成者ユーザーID
 * @returns 作成された組織グループ
 * @throws グループCDが重複している場合は E7001（重複）エラー
 */
export async function createOrganizationGroup(
  organizationId: string,
  data: {
    organization_group_cd: string;
    organization_group_name: string;
    chief_user_id: string;
    parent_group_cd?: string | null;
    layer?: string | null;
  },
  userId?: string | null
): Promise<OrganizationGroupRow> {
  // 重複チェック
  const alreadyExists = await organizationGroupRepository.existsById(
    organizationId,
    data.organization_group_cd
  );
  if (alreadyExists) {
    const error = new Error('指定されたグループCDは既に使用されています') as Error & { code: string; statusCode: number };
    error.code = E7001;
    error.statusCode = 409;
    throw error;
  }

  return organizationGroupRepository.create({
    organization_id: organizationId,
    organization_group_cd: data.organization_group_cd,
    organization_group_name: data.organization_group_name,
    chief_user_id: data.chief_user_id,
    parent_group_cd: data.parent_group_cd ?? null,
    layer: data.layer ?? null,
    create_user_id: userId ?? null,
  });
}

/**
 * 組織グループ更新
 *
 * @param organizationId - 組織ID
 * @param groupCd - 組織グループCD
 * @param data - 更新データ（未指定フィールドは既存値を維持）
 * @param userId - 更新者ユーザーID
 * @returns 更新された組織グループ
 * @throws 存在しない場合は E6001（リソース不存在）エラー
 *
 * @remarks
 * chief_user_id はフロントエンドから送信されない。
 * 既存レコードの chief_user_id を自動維持する。
 */
export async function updateOrganizationGroup(
  organizationId: string,
  groupCd: string,
  data: {
    organization_group_name?: string;
    parent_group_cd?: string | null;
    layer?: string | null;
  },
  userId?: string | null
): Promise<OrganizationGroupRow> {
  // 既存レコード取得（chief_user_id の維持＋存在確認を兼ねる）
  const existing = await organizationGroupRepository.findById(organizationId, groupCd);
  if (!existing) {
    const error = new Error('組織グループが見つかりません') as Error & { code: string; statusCode: number };
    error.code = E6001;
    error.statusCode = 404;
    throw error;
  }

  const updated = await organizationGroupRepository.update({
    organization_id: organizationId,
    organization_group_cd: groupCd,
    organization_group_name: data.organization_group_name ?? existing.organization_group_name,
    chief_user_id: existing.chief_user_id,  // 既存値を維持
    parent_group_cd: data.parent_group_cd !== undefined ? data.parent_group_cd : existing.parent_group_cd,
    layer: data.layer !== undefined ? data.layer : existing.layer,
    update_user_id: userId ?? null,
  });

  if (!updated) {
    const error = new Error('組織グループが見つかりません') as Error & { code: string; statusCode: number };
    error.code = E6001;
    error.statusCode = 404;
    throw error;
  }

  return updated;
}

/**
 * 組織グループ削除
 *
 * @param organizationId - 組織ID
 * @param groupCd - 組織グループCD
 * @throws 存在しない場合は E6001（リソース不存在）エラー
 */
export async function deleteOrganizationGroup(
  organizationId: string,
  groupCd: string
): Promise<void> {
  // 存在確認
  const exists = await organizationGroupRepository.existsById(organizationId, groupCd);
  if (!exists) {
    const error = new Error('組織グループが見つかりません') as Error & { code: string; statusCode: number };
    error.code = E6001;
    error.statusCode = 404;
    throw error;
  }

  await organizationGroupRepository.deleteById(organizationId, groupCd);
}
