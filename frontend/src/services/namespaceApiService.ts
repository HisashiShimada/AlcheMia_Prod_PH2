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

    const response = await client.get<ServiceApiResponse<NamespaceDeclarationsResponse>>(
      '/namespaces/declarations'
    );

    return response.data?.data?.namespaces ?? [];
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
