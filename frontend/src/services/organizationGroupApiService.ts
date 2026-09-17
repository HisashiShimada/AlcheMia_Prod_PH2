/**
 * organization_group（グループ管理）API Service
 *
 * @remarks
 * グループ管理機能専用のAPIサービス。
 * 名前空間管理（namespaceApiService）とは独立して管理する。
 *
 * @module organizationGroupApiService
 */

import { createApiClient } from '@/utils/authUtils';
import { setTokenPair } from '@/utils/tokenStorage';
import type {
  OrganizationGroupRow,
  CreateOrganizationGroupRequest,
  UpdateOrganizationGroupRequest,
  OrgUser,
} from '@/types/group';

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
 * @param options.memberOf - true の場合、ログインユーザーが所属するグループ＋祖先グループを返す（?memberOf=true）
 * @returns 組織階層グループ行の配列
 */
export const getOrganizationGroups = async (
  search?: string,
  options?: { memberOf?: boolean }
): Promise<OrganizationGroupRow[]> => {
  const client = createApiClient();

  try {
    console.log('🏢 [organizationGroupApiService] 組織階層グループ一覧取得', options);

    const params: Record<string, string> = {};
    if (search) params.search = search;
    // memberOf=true を渡すとログインユーザーが所属するグループ＋全祖先グループを返す
    if (options?.memberOf) params.memberOf = 'true';

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
 * ログインユーザーが閲覧可能な組織グループ一覧を取得する
 *
 * @remarks
 * バックエンドの GET /api/v1/organization-groups?visibleOnly=true を呼び出す。
 * 非アクティブチームの権限ルールを反映した閲覧可能グループ一覧を返す。
 *
 * @returns 閲覧可能な組織グループ一覧（cd, name, isActive）
 */
export const getVisibleOrganizationGroups = async (): Promise<
  Array<{ cd: string; name: string; isActive: boolean }>
> => {
  const client = createApiClient();

  try {
    console.log('🏢 [organizationGroupApiService] 閲覧可能グループ一覧取得');

    const response = await client.get<{
      success: boolean;
      data: { groups: Array<{ cd: string; name: string; isActive: boolean }> };
    }>('/organization-groups', { params: { visibleOnly: 'true' } });

    return response.data?.data?.groups ?? [];
  } catch (error) {
    console.warn('⚠️ [organizationGroupApiService] 閲覧可能グループ一覧の取得に失敗しました:', error);
    return [];
  }
};

/**
 * 組織階層グループを新規作成する
 *
 * @remarks
 * バックエンドの POST /api/v1/organization-groups を呼び出す。
 * 作成成功後、バックエンドから最新の organizationGroupCds を含む新しいアクセストークンが
 * レスポンスに含まれる場合は localStorage の sessionToken と userInfo を更新する。
 * これにより、プロジェクト一覧取得などで新しいグループが即時反映される。
 *
 * @param data - 作成するグループデータ
 * @returns 作成された組織階層グループ行
 */
export const createOrganizationGroup = async (
  data: CreateOrganizationGroupRequest
): Promise<OrganizationGroupRow> => {
  const client = createApiClient();

  console.log('🏢 [organizationGroupApiService] 組織階層グループ作成:', data.organization_group_cd);

  const response = await client.post<{
    success: boolean;
    data: OrganizationGroupRow;
    accessToken?: string;
    organizationGroupCds?: string[];
  }>(
    '/organization-groups',
    data
  );

  // グループ作成後にバックエンドから新しいアクセストークンと最新グループCDが返された場合、
  // localStorage を更新して次のリクエストから新しいグループが反映されるようにする
  const { accessToken, organizationGroupCds } = response.data;
  if (accessToken) {
    setTokenPair(accessToken);
    if (organizationGroupCds && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('userInfo');
        if (raw) {
          const userInfo = JSON.parse(raw) as Record<string, unknown>;
          userInfo.organizationGroupCds = organizationGroupCds;
          localStorage.setItem('userInfo', JSON.stringify(userInfo));
        }
      } catch {
        // userInfo 更新失敗はログのみ（グループ作成自体は成功）
        console.warn('[organizationGroupApiService] userInfo 更新失敗');
      }
    }
  }

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
 * 組織階層グループのアクティブ状態を更新する（論理削除 / 有効化 共用）
 *
 * @remarks
 * バックエンドの PATCH /api/v1/organization-groups/:groupCd/status を呼び出す。
 * isActive = false: 無効化（論理削除）。メンバーを物理削除する。
 * isActive = true:  有効化。
 *
 * @param groupCd - 対象の組織階層グループCD
 * @param isActive - true: 有効化 / false: 無効化（論理削除）
 * @returns 更新後の組織階層グループ行
 */
export const updateOrganizationGroupStatus = async (
  groupCd: string,
  isActive: boolean
): Promise<OrganizationGroupRow> => {
  const client = createApiClient();

  console.log('🏢 [organizationGroupApiService] 組織階層グループ状態更新:', groupCd, isActive ? '有効化' : '無効化（論理削除）');

  const response = await client.patch<{ success: boolean; data: OrganizationGroupRow }>(
    `/organization-groups/${encodeURIComponent(groupCd)}/status`,
    { isActive }
  );

  return response.data.data;
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
