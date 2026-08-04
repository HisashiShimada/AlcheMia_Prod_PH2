/**
 * organization_group（チーム管理）API Service
 *
 * @remarks
 * チーム管理機能専用のAPIサービス。
 * 名前空間管理（namespaceApiService）とは独立して管理する。
 *
 * @module organizationGroupApiService
 */

import { createApiClient } from '@/utils/authUtils';
import type {
  OrganizationGroupRow,
  CreateOrganizationGroupRequest,
  UpdateOrganizationGroupRequest,
  OrgUser,
} from '@/types/team';

// ============================================================================
// API 関数 — グループ CRUD
// ============================================================================

/**
 * 組織階層グループ一覧を取得する
 *
 * @remarks
 * バックエンドの GET /api/v1/organization-groups を呼び出す。
 *
 * @param search - 検索キーワード（グループ名の部分一致）
 * @returns 組織階層グループ行の配列
 */
export const getOrganizationGroups = async (
  search?: string
): Promise<OrganizationGroupRow[]> => {
  const client = createApiClient();

  try {
    console.log('🏢 [organizationGroupApiService] 組織階層グループ一覧取得');

    const params: Record<string, string> = {};
    if (search) params.search = search;

    const response = await client.get<{ success: boolean; data: OrganizationGroupRow[] }>(
      '/organization-groups',
      { params }
    );

    return response.data?.data ?? [];
  } catch (error) {
    console.warn('⚠️ [organizationGroupApiService] 組織階層グループ一覧の取得に失敗しました:', error);
    return [];
  }
};

/**
 * 組織階層グループを新規作成する
 *
 * @remarks
 * バックエンドの POST /api/v1/organization-groups を呼び出す。
 *
 * @param data - 作成するグループデータ
 * @returns 作成された組織階層グループ行
 */
export const createOrganizationGroup = async (
  data: CreateOrganizationGroupRequest
): Promise<OrganizationGroupRow> => {
  const client = createApiClient();

  console.log('🏢 [organizationGroupApiService] 組織階層グループ作成:', data.organization_group_cd);

  const response = await client.post<{ success: boolean; data: OrganizationGroupRow }>(
    '/organization-groups',
    data
  );

  return response.data.data;
};

/**
 * 組織階層グループを更新する
 *
 * @remarks
 * バックエンドの PUT /api/v1/organization-groups/:groupCd を呼び出す。
 *
 * @param groupCd - 更新対象の組織階層グループCD
 * @param data - 更新するフィールド
 * @returns 更新された組織階層グループ行
 */
export const updateOrganizationGroup = async (
  groupCd: string,
  data: UpdateOrganizationGroupRequest
): Promise<OrganizationGroupRow> => {
  const client = createApiClient();

  console.log('🏢 [organizationGroupApiService] 組織階層グループ更新:', groupCd);

  const response = await client.put<{ success: boolean; data: OrganizationGroupRow }>(
    `/organization-groups/${encodeURIComponent(groupCd)}`,
    data
  );

  return response.data.data;
};

/**
 * 組織階層グループを削除する
 *
 * @remarks
 * バックエンドの DELETE /api/v1/organization-groups/:groupCd を呼び出す。
 *
 * @param groupCd - 削除対象の組織階層グループCD
 */
export const deleteOrganizationGroup = async (groupCd: string): Promise<void> => {
  const client = createApiClient();

  console.log('🏢 [organizationGroupApiService] 組織階層グループ削除:', groupCd);

  await client.delete(`/organization-groups/${encodeURIComponent(groupCd)}`);
};

// ============================================================================
// API 関数 — メンバー・ユーザー管理
// ============================================================================

/**
 * グループメンバー管理用ユーザー一覧を取得する
 *
 * @remarks
 * バックエンドの GET /api/v1/organization-groups/users を呼び出す。
 *
 * @returns 組織ユーザー一覧
 */
export const getOrgUsersForGroups = async (): Promise<OrgUser[]> => {
  const client = createApiClient();

  try {
    console.log('👤 [organizationGroupApiService] グループメンバー用ユーザー一覧取得');

    const response = await client.get<{
      success: boolean;
      data: Array<{ user_id: string; user_name: string; mail_address?: string }>;
    }>('/organization-groups/users');

    return (response.data?.data ?? []).map((u) => ({
      userId: u.user_id,
      userName: u.user_name,
      mailAddress: u.mail_address,
    }));
  } catch (error) {
    console.warn('⚠️ [organizationGroupApiService] グループメンバー用ユーザー一覧の取得に失敗しました:', error);
    return [];
  }
};

/**
 * 指定グループのメンバー一覧を取得する
 *
 * @remarks
 * バックエンドの GET /api/v1/organization-groups/:groupCd/members を呼び出す。
 *
 * @param groupCd - 対象グループCD
 * @returns メンバー一覧
 */
export const getGroupMembers = async (groupCd: string): Promise<OrgUser[]> => {
  const client = createApiClient();

  try {
    console.log('👥 [organizationGroupApiService] グループメンバー一覧取得:', groupCd);

    const response = await client.get<{
      success: boolean;
      data: Array<{ user_id: string; user_name: string; mail_address?: string }>;
    }>(`/organization-groups/${encodeURIComponent(groupCd)}/members`);

    return (response.data?.data ?? []).map((u) => ({
      userId: u.user_id,
      userName: u.user_name,
      mailAddress: u.mail_address,
    }));
  } catch (error) {
    console.warn('⚠️ [organizationGroupApiService] グループメンバー一覧の取得に失敗しました:', error);
    return [];
  }
};

/**
 * 指定グループのメンバーを一括更新する
 *
 * @remarks
 * バックエンドの PUT /api/v1/organization-groups/:groupCd/members を呼び出す。
 *
 * @param groupCd - 対象グループCD
 * @param userIds - 設定するユーザーID一覧
 */
export const updateGroupMembers = async (groupCd: string, userIds: string[]): Promise<void> => {
  const client = createApiClient();

  console.log('👥 [organizationGroupApiService] グループメンバー更新:', groupCd, userIds.length, '名');

  await client.put(`/organization-groups/${encodeURIComponent(groupCd)}/members`, { userIds });
};

/**
 * 指定グループの代表者（chief）を更新する
 *
 * @remarks
 * バックエンドの PUT /api/v1/organization-groups/:groupCd/chief を呼び出す。
 *
 * @param groupCd - 対象グループCD
 * @param chiefUserId - 新しい代表者のユーザーID
 */
export const updateGroupChief = async (groupCd: string, chiefUserId: string): Promise<void> => {
  const client = createApiClient();

  console.log('👑 [organizationGroupApiService] グループ代表者更新:', groupCd, '->', chiefUserId);

  await client.put(`/organization-groups/${encodeURIComponent(groupCd)}/chief`, { chiefUserId });
};
