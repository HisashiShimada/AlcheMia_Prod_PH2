/**
 * 名前空間管理 API Service
 *
 * namespace / namespace_term テーブルへのアクセスを提供するフロントエンドサービス。
 *
 * @module namespaceApiService
 */

import { createApiClient } from '@/utils/authUtils';
import type { NamespaceEntry } from '@/utils/namespaceInjector';
import type { ServiceApiResponse } from '@/types/api';
import type {
  OrganizationGroupRow,
  CreateOrganizationGroupRequest,
  UpdateOrganizationGroupRequest,
} from '@/types/namespace';

// ============================================================================
// 型定義
// ============================================================================

/**
 * GET /api/v1/namespaces/declarations のレスポンスボディ型
 */
export interface NamespaceDeclarationsResponse {
  namespaces: NamespaceEntry[];
}

/**
 * GET /api/v1/namespaces のレスポンスボディ型
 */
export interface NamespaceListResponse {
  namespaces: NamespaceEntry[];
}

/**
 * POST /api/v1/namespaces のリクエストボディ型
 */
export interface CreateNamespaceRequest {
  prefix: string;
  uri: string;
  displayName?: string;
  description?: string;
  departmentCd?: string;
}

/**
 * POST /api/v1/namespaces のレスポンスボディ型
 */
export interface CreateNamespaceResponse {
  namespaceId: string;
  prefix: string;
  uri: string;
}

/**
 * GET /api/v1/namespaces/terms の用語行型
 */
export interface NamespaceTermRow {
  qname: string;
  prefix: string;
  localName: string;
  displayName: string;
  description: string;
  type: string;
  unitHint: string;
}

/**
 * POST/PUT /api/v1/namespaces/terms のリクエストボディ型
 */
export interface TermUpsertRequest {
  prefix: string;
  localName: string;
  displayName?: string;
  description?: string;
  typeHint?: string;
  unitHint?: string;
}

// ============================================================================
// API 関数 — Namespace (Prefix)
// ============================================================================

/**
 * 組織に紐づく名前空間宣言一覧を取得する（XMLビュー注入用）
 *
 * @remarks
 * バックエンドの GET /api/v1/namespaces/declarations を呼び出す。
 *
 * @returns 名前空間エントリ一覧（{prefix, uri}[]）
 */
export const getOrganizationNamespaces = async (): Promise<NamespaceEntry[]> => {
  const client = createApiClient();

  try {
    console.log('🔖 [namespaceApiService] 名前空間宣言一覧取得');

    const response = await client.get<{ uri?: string }>(
      '/namespaces/declarations'
    );

    const uri = response.data?.uri;
    return uri ? [{ prefix: '', uri }] : [];
  } catch (error) {
    // 名前空間取得失敗はエディタの操作を止めない（空配列を返して継続）
    console.warn('⚠️ [namespaceApiService] 名前空間宣言の取得に失敗しました:', error);
    return [];
  }
};

/**
 * 組織に紐づく名前空間（Prefix）一覧を取得する
 *
 * @remarks
 * バックエンドの GET /api/v1/namespaces を呼び出す。
 * 名前空間管理画面のPrefix一覧表示に使用する。
 *
 * @returns 名前空間エントリ一覧（{prefix, uri}[]）
 */
export const getNamespaceList = async (): Promise<NamespaceEntry[]> => {
  const client = createApiClient();

  try {
    console.log('🔖 [namespaceApiService] Prefix一覧取得');

    const response = await client.get<NamespaceListResponse>('/namespaces');

    return response.data?.namespaces ?? [];
  } catch (error) {
    console.warn('⚠️ [namespaceApiService] Prefix一覧の取得に失敗しました:', error);
    return [];
  }
};

/**
 * ログインユーザーの個人名前空間一覧を取得する（Personal ノード表示用）
 *
 * @remarks
 * バックエンドの GET /api/v1/namespaces?scopeKey={userId} を呼び出す。
 * レスポンスに user_name が含まれる。
 *
 * @param userId - ログインユーザーのユーザーID（namespace.scope_key と一致する値）
 * @returns 個人名前空間一覧（{namespace_id, uri, scope_key, global_flg, user_name}[]）
 */
export const getPersonalNamespaces = async (
  userId: string
): Promise<Array<{ namespace_id: string; uri: string; scope_key: string; global_flg: boolean; user_name: string | null }>> => {
  const client = createApiClient();

  try {
    console.log('👤 [namespaceApiService] 個人名前空間一覧取得:', userId);

    const response = await client.get<{
      namespaces: Array<{
        namespace_id: string;
        uri: string;
        scope_key: string;
        global_flg: boolean;
        user_name: string | null;
      }>;
    }>('/namespaces', { params: { scopeKey: userId } });

    return response.data?.namespaces ?? [];
  } catch (error) {
    console.warn('⚠️ [namespaceApiService] 個人名前空間一覧の取得に失敗しました:', error);
    return [];
  }
};

/**
 * 名前空間（Prefix）を新規登録する
 *
 * @remarks
 * バックエンドの POST /api/v1/namespaces を呼び出す。
 *
 * @param data - 登録する名前空間データ
 * @returns 登録結果（namespaceId, prefix, uri）
 */
export const createNamespace = async (
  data: CreateNamespaceRequest
): Promise<CreateNamespaceResponse> => {
  const client = createApiClient();

  console.log('🔖 [namespaceApiService] Prefix新規登録:', data.prefix);

  const response = await client.post<CreateNamespaceResponse>('/namespaces', data);

  return response.data;
};

/**
 * 名前空間（Prefix）を削除する
 *
 * @remarks
 * バックエンドの DELETE /api/v1/namespaces/:prefix を呼び出す。
 *
 * @param prefix - 削除するPrefix
 */
export const deleteNamespace = async (prefix: string): Promise<void> => {
  const client = createApiClient();

  console.log('🔖 [namespaceApiService] Prefix削除:', prefix);

  await client.delete(`/namespaces/${encodeURIComponent(prefix)}`);
};

// ============================================================================
// API 関数 — 用語 (Term)
// ============================================================================

/**
 * 組織に紐づく用語一覧を取得する
 *
 * @remarks
 * バックエンドの GET /api/v1/namespaces/terms を呼び出す。
 *
 * @returns 用語一覧
 */
export const getTerms = async (): Promise<NamespaceTermRow[]> => {
  const client = createApiClient();

  try {
    console.log('🔖 [namespaceApiService] 用語一覧取得');

    const response = await client.get<NamespaceTermRow[]>('/namespaces/terms');

    return response.data ?? [];
  } catch (error) {
    console.warn('⚠️ [namespaceApiService] 用語一覧の取得に失敗しました:', error);
    return [];
  }
};

/**
 * 用語を新規登録する
 *
 * @remarks
 * バックエンドの POST /api/v1/namespaces/terms を呼び出す。
 *
 * @param data - 登録する用語データ
 * @returns 登録された用語
 */
export const createTerm = async (data: TermUpsertRequest): Promise<NamespaceTermRow> => {
  const client = createApiClient();

  console.log('🔖 [namespaceApiService] 用語新規登録:', `${data.prefix}:${data.localName}`);

  const response = await client.post<NamespaceTermRow>('/namespaces/terms', data);

  return response.data;
};

/**
 * 用語を更新する
 *
 * @remarks
 * バックエンドの PUT /api/v1/namespaces/terms/:prefix/:localName を呼び出す。
 *
 * @param prefix - 名前空間の接頭辞
 * @param localName - ローカル名
 * @param data - 更新するフィールド
 * @returns 更新された用語
 */
export const updateTerm = async (
  prefix: string,
  localName: string,
  data: Partial<TermUpsertRequest>
): Promise<NamespaceTermRow> => {
  const client = createApiClient();

  console.log('🔖 [namespaceApiService] 用語更新:', `${prefix}:${localName}`);

  const response = await client.put<NamespaceTermRow>(
    `/namespaces/terms/${encodeURIComponent(prefix)}/${encodeURIComponent(localName)}`,
    data
  );

  return response.data;
};

/**
 * 用語を削除する
 *
 * @remarks
 * バックエンドの DELETE /api/v1/namespaces/terms/:prefix/:localName を呼び出す。
 *
 * @param prefix - 名前空間の接頭辞
 * @param localName - ローカル名
 */
export const deleteTerm = async (prefix: string, localName: string): Promise<void> => {
  const client = createApiClient();

  console.log('🔖 [namespaceApiService] 用語削除:', `${prefix}:${localName}`);

  await client.delete(
    `/namespaces/terms/${encodeURIComponent(prefix)}/${encodeURIComponent(localName)}`
  );
};

// ============================================================================
// API 関数 — 組織ユーザー（Personal ツリーノード用）
// ============================================================================

/**
 * 組織に所属するユーザー一覧を取得する（Personal ノード表示用）
 *
 * @remarks
 * バックエンドの GET /api/v1/systemManagement/user を呼び出す。
 * Personal ツリーノードの children にユーザーを一覧表示するために使用する。
 *
 * @returns ユーザー一覧（{userId, userName}[]）
 */
export interface OrgUserSimple {
  userId: string;
  userName: string;
}

export const getOrganizationUsers = async (): Promise<OrgUserSimple[]> => {
  const client = createApiClient();

  try {
    console.log('👤 [namespaceApiService] 組織ユーザー一覧取得（Personal ノード用）');

    const response = await client.get<{
      success: boolean;
      data: Array<{ userId: string; userName: string }>;
    }>('/systemManagement/user');

    return (response.data?.data ?? []).map((u) => ({
      userId: u.userId,
      userName: u.userName,
    }));
  } catch (error) {
    console.warn('⚠️ [namespaceApiService] 組織ユーザー一覧の取得に失敗しました:', error);
    return [];
  }
};

// ============================================================================
// API 関数 — organization_group（部署管理タブ）
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
    console.log('🏢 [namespaceApiService] 組織階層グループ一覧取得');

    const params: Record<string, string> = {};
    if (search) params.search = search;

    const response = await client.get<{ success: boolean; data: OrganizationGroupRow[] }>(
      '/organization-groups',
      { params }
    );

    return response.data?.data ?? [];
  } catch (error) {
    console.warn('⚠️ [namespaceApiService] 組織階層グループ一覧の取得に失敗しました:', error);
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

  console.log('🏢 [namespaceApiService] 組織階層グループ作成:', data.organization_group_cd);

  const response = await client.post<{ success: boolean; data: OrganizationGroupRow }>('/organization-groups', data);

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

  console.log('🏢 [namespaceApiService] 組織階層グループ更新:', groupCd);

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

  console.log('🏢 [namespaceApiService] 組織階層グループ削除:', groupCd);

  await client.delete(`/organization-groups/${encodeURIComponent(groupCd)}`);
};

