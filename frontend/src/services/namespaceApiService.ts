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
  GlobalNamespaceEntry,
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
  scopeKey?: string;
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
 * PATCH /api/v1/namespaces/:prefix のリクエストボディ型
 */
export interface UpdateNamespaceRequest {
  uri: string;
}

/**
 * PATCH /api/v1/namespaces/:prefix のレスポンスボディ型
 */
export interface UpdateNamespaceResponse {
  namespaceId: string;
  prefix: string;
  uri: string;
  scopeKey: string | null;
}

/**
 * GET /api/v1/namespaces/terms の用語行型
 */
export interface NamespaceTermRow {
  /** 名前空間ID（rowKey の一部として使用） */
  namespaceId: string;
  id?: string;
  qname: string;
  prefix: string;
  localName: string;
  displayName: string;
  description: string;
  type: string;
  unitHint: string;
  isActive: boolean;
}

/**
 * POST/PUT /api/v1/namespaces/terms のリクエストボディ型
 */
export interface TermUpsertRequest {
  prefix: string;
  localName: string;
  /** 日本語表示名（バックエンドが受け付けるフィールド名） */
  displayNameJa?: string;
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
 * @param options.scopeKeys - フィルタリングする scopeKey 配列（省略時は全件取得）
 * @returns 名前空間エントリ一覧（{prefix, uri, scopeKey?}[]）
 */
export const getNamespaceList = async (options?: {
  scopeKeys?: string[];
}): Promise<NamespaceEntry[]> => {
  const client = createApiClient();

  try {
    console.log('🔖 [namespaceApiService] Prefix一覧取得', options);

    const params: Record<string, string> = {};
    if (options?.scopeKeys && options.scopeKeys.length > 0) {
      params.scopeKey = options.scopeKeys[0];
    }

    const response = await client.get<NamespaceListResponse>('/namespaces', { params });

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
 * @returns 個人名前空間一覧（{namespace_id, uri, scope_key, user_name}[]）
 */
export const getPersonalNamespaces = async (
  userId: string
): Promise<Array<{ namespace_id: string; uri: string; scope_key: string; user_name: string | null }>> => {
  const client = createApiClient();

  try {
    console.log('👤 [namespaceApiService] 個人名前空間一覧取得:', userId);

    const response = await client.get<{
      namespaces: Array<{
        namespace_id: string;
        uri: string;
        scope_key: string;
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
 * 名前空間（Prefix の URI）を更新する
 *
 * @remarks
 * バックエンドの PATCH /api/v1/namespaces/:prefix を呼び出す。
 *
 * @param prefix - 更新対象の Prefix
 * @param data - 更新データ
 * @returns 更新後の名前空間レコード
 */
export const updateNamespace = async (
  prefix: string,
  data: UpdateNamespaceRequest
): Promise<UpdateNamespaceResponse> => {
  const client = createApiClient();

  console.log('🔖 [namespaceApiService] Prefix URI更新:', prefix);

  const response = await client.patch<UpdateNamespaceResponse>(
    `/namespaces/${encodeURIComponent(prefix)}`,
    data
  );

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
 * @param options.scopeKey  - フィルタリングする scopeKey（単数）。指定時はそのスコープの用語を返す
 * @param options.scopeKeys - フィルタリングする scopeKey 配列（後方互換用・省略時は全件取得）
 * @returns 用語一覧
 */
export const getTerms = async (options?: {
  scopeKey?: string;
  scopeKeys?: string[];
}): Promise<NamespaceTermRow[]> => {
  const client = createApiClient();

  try {
    console.log('🔖 [namespaceApiService] 用語一覧取得', options);

    const params: Record<string, string> = {};
    // scopeKey（単数）が指定されている場合はそちらを優先
    if (options?.scopeKey) {
      params.scopeKey = options.scopeKey;
    } else if (options?.scopeKeys && options.scopeKeys.length > 0) {
      params.scopeKeys = options.scopeKeys.join(',');
    }

    const response = await client.get<NamespaceTermRow[]>('/namespaces/terms', { params });

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

/**
 * 用語のアクティブ/非アクティブを切り替える
 *
 * @remarks
 * バックエンドの PATCH /api/v1/namespaces/terms/:prefix/:localName/active を呼び出す。
 *
 * @param prefix - 名前空間の接頭辞
 * @param localName - ローカル名
 * @param isActive - 設定するアクティブ状態
 * @returns 更新された用語
 */
export const toggleTermActive = async (
  prefix: string,
  localName: string,
  isActive: boolean
): Promise<NamespaceTermRow> => {
  const client = createApiClient();

  console.log('🔖 [namespaceApiService] 用語アクティブ切替:', `${prefix}:${localName}`, isActive);

  const response = await client.patch<NamespaceTermRow>(
    `/namespaces/terms/${encodeURIComponent(prefix)}/${encodeURIComponent(localName)}/active`,
    { isActive }
  );

  return response.data;
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

// ============================================================================
// API 関数 — 属性マスター
// ============================================================================

/**
 * 属性マスター行の型定義
 */
export interface AttributeMaster {
  attributeValue: string;
  isActive: boolean;
}

/**
 * 属性マスター一覧を取得する（単位フィルター用）
 *
 * @remarks
 * バックエンドの GET /api/v1/master/attribute を呼び出す。
 * 用語管理画面の単位フィルタープルダウンに使用する。
 *
 * @returns アクティブな属性マスター一覧
 */
export const getAttributeMaster = async (): Promise<AttributeMaster[]> => {
  const client = createApiClient();

  try {
    console.log('🔖 [namespaceApiService] 属性マスター一覧取得');

    const response = await client.get<{ success: boolean; data: AttributeMaster[] }>(
      '/master/attribute'
    );

    return response.data?.data ?? [];
  } catch (error) {
    console.warn('⚠️ [namespaceApiService] 属性マスター一覧の取得に失敗しました:', error);
    return [];
  }
};

/**
 * ログインユーザーの所属グループ＋全祖先グループの CD 一覧を取得する
 *
 * @remarks
 * バックエンドの GET /api/v1/organization-groups/ancestors を呼び出す。
 * WITH RECURSIVE クエリで直接所属グループから parent_group_cd を辿り、
 * 全祖先グループの CD を返す。
 * 用語重複チェックで「上位層グループに登録された同一 prefix の名前空間」を
 * 警告対象として特定するために使用する。
 *
 * @returns 所属グループ + 全祖先グループの organization_group_cd 配列
 */
export const getAncestorGroupCds = async (): Promise<string[]> => {
  const client = createApiClient();

  console.log('🏢 [namespaceApiService] 所属グループ＋祖先グループ CD 一覧取得');

  const response = await client.get<{ success: boolean; data: string[] }>(
    '/organization-groups/ancestors'
  );

  return response.data.data;
};

/**
 * 組織の表示名を取得する
 *
 * @remarks
 * GET /api/v1/provider/organization/:organizationId を呼び出し、
 * organizationDisplayName を返す。名前空間ツリーの company ノードラベルに使用。
 *
 * @param organizationId - 取得対象の組織 ID（UUID）
 * @returns 組織表示名。取得できない場合は空文字列
 */
export const getOrganizationDisplayName = async (organizationId: string): Promise<string> => {
  const client = createApiClient();

  const response = await client.get<{ organizationDisplayName: string }>(
    `/provider/organization/${organizationId}`
  );

  return response.data.organizationDisplayName ?? '';
};

// ─── グローバル名前空間宣言（ファイルサーバ管理）────────────────────────────────

/**
 * グローバル名前空間宣言一覧を取得する
 *
 * @remarks
 * GET /api/v1/namespaces/global-declarations を呼び出す。
 * ファイルサーバ（system/namespaces/global-declarations.csv）から読み込まれる。
 *
 * @returns グローバル名前空間宣言エントリ一覧
 */
export const getGlobalDeclarations = async (): Promise<GlobalNamespaceEntry[]> => {
  const client = createApiClient();

  try {
    console.log('🌐 [namespaceApiService] グローバル名前空間宣言一覧取得');
    const response = await client.get<{ declarations: GlobalNamespaceEntry[] }>(
      '/namespaces/global-declarations'
    );
    return response.data?.declarations ?? [];
  } catch (error) {
    console.warn('⚠️ [namespaceApiService] グローバル名前空間宣言の取得に失敗しました:', error);
    return [];
  }
};

/**
 * グローバル名前空間宣言 CSV をインポートする（ファイルサーバへ上書き）
 *
 * @remarks
 * POST /api/v1/namespaces/global-declarations/import を呼び出す。
 * multipart/form-data で CSV ファイルを送信する。
 *
 * @param file - アップロードする CSV ファイル
 */
export const importGlobalDeclarations = async (file: File): Promise<void> => {
  const client = createApiClient();

  console.log('🌐 [namespaceApiService] グローバル名前空間宣言インポート:', file.name);

  const formData = new FormData();
  formData.append('file', file);

  await client.post('/namespaces/global-declarations/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/**
 * グローバル名前空間宣言 CSV をエクスポートする（ブラウザでダウンロード）
 *
 * @remarks
 * GET /api/v1/namespaces/global-declarations/export を呼び出し、
 * レスポンスを CSV ファイルとしてブラウザでダウンロードする。
 */
export const exportGlobalDeclarations = async (): Promise<void> => {
  const client = createApiClient();

  console.log('🌐 [namespaceApiService] グローバル名前空間宣言エクスポート');

  const response = await client.get('/namespaces/global-declarations/export', {
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'global-declarations.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

