/**
 * namespace Service
 *
 * 名前空間・用語管理のビジネスロジック層
 *
 * @remarks
 * Controller → Service → Repository の依存方向を維持する。
 * Controller は本ファイルのみを import し、Repository を直接参照しない。
 *
 * @module namespaceService
 */

import * as namespaceTermRepository from '../repositories/namespaceTermRepository';
import type { NamespaceTermRow } from '../repositories/namespaceTermRepository';

// ─── 型定義 ──────────────────────────────────────────────────────────────────

/** createNamespace の入力型 */
export interface CreateNamespaceInput {
  organizationId: string;
  prefix: string;
  uri: string;
  userId: string;
  scopeKey?: string;
  description?: string;
}

/** createNamespace の戻り値型 */
export interface CreateNamespaceResult {
  namespaceId: string;
  prefix: string;
  uri: string;
}

/** createTerm の入力型 */
export interface CreateTermInput {
  organizationId: string;
  prefix: string;
  localName: string;
  displayName?: string;
  description?: string;
  typeHint?: string;
  unitHint?: string;
}

/** updateTerm の入力型 */
export interface UpdateTermInput {
  displayName?: string;
  description?: string;
  typeHint?: string;
  unitHint?: string;
}

/** getDeclarationsByProject の戻り値型 */
export interface ProjectScopeDeclaration {
  prefix: string;
  uri: string;
  globalFlg: boolean;
}

// ─── 名前空間（Prefix）操作 ───────────────────────────────────────────────────

/**
 * 名前空間（Prefix）を新規登録する
 *
 * @param input - 登録する名前空間データ
 * @returns 登録された namespaceId / prefix / uri
 */
export async function createNamespace(
  input: CreateNamespaceInput
): Promise<CreateNamespaceResult> {
  const namespaceId = await namespaceTermRepository.createNamespace({
    organizationId: input.organizationId,
    prefix: input.prefix,
    uri: input.uri,
    userId: input.userId,
    scopeKey: input.scopeKey,
    description: input.description,
  });

  return { namespaceId, prefix: input.prefix, uri: input.uri };
}

/**
 * 名前空間（prefix + uri）の一覧を取得する
 *
 * @param organizationId - 組織ID
 * @returns prefix と uri の配列
 */
export async function getNamespaces(
  organizationId: string
): Promise<Array<{ prefix: string; uri: string }>> {
  return namespaceTermRepository.findNamespacesByOrganization(organizationId);
}

/**
 * scope_key（ユーザーID）に紐づく名前空間一覧を取得する
 *
 * @param organizationId - 組織ID
 * @param scopeKey - namespace.scope_key（= user_id）
 * @returns namespace の配列
 */
export async function getNamespacesByScopeKey(
  organizationId: string,
  scopeKey: string
): Promise<Array<{ namespace_id: string; uri: string; scope_key: string; global_flg: boolean; user_name: string | null }>> {
  return namespaceTermRepository.findNamespacesByScopeKey(organizationId, scopeKey);
}

/**
 * 名前空間（Prefix）を削除する
 *
 * @param organizationId - 組織ID
 * @param prefix - 削除対象の prefix
 * @returns 削除件数（0 = 対象なし）
 */
export async function deleteNamespace(
  organizationId: string,
  prefix: string
): Promise<number> {
  return namespaceTermRepository.removeNamespace(organizationId, prefix);
}

// ─── 用語操作 ─────────────────────────────────────────────────────────────────

/**
 * 用語を新規登録する
 *
 * prefix に対応する名前空間が存在しない場合は null を返す。
 *
 * @param input - 登録する用語データ
 * @returns 登録された用語、または null（名前空間が存在しない場合）
 */
export async function createTerm(
  input: CreateTermInput
): Promise<NamespaceTermRow | null> {
  const exists = await namespaceTermRepository.existsNamespace(
    input.organizationId,
    input.prefix
  );
  if (!exists) return null;

  return namespaceTermRepository.create({
    organizationId: input.organizationId,
    prefix: input.prefix,
    localName: input.localName,
    displayName: input.displayName,
    description: input.description,
    typeHint: input.typeHint,
    unitHint: input.unitHint,
  });
}

/**
 * 用語を更新する
 *
 * @param organizationId - 組織ID
 * @param prefix - 名前空間の接頭辞
 * @param localName - ローカル名
 * @param input - 更新するフィールド
 * @returns 更新後の用語、または null（対象なし）
 */
export async function updateTerm(
  organizationId: string,
  prefix: string,
  localName: string,
  input: UpdateTermInput
): Promise<NamespaceTermRow | null> {
  return namespaceTermRepository.update(organizationId, prefix, localName, {
    displayName: input.displayName,
    description: input.description,
    typeHint: input.typeHint,
    unitHint: input.unitHint,
  });
}

/**
 * 用語を削除する
 *
 * @param organizationId - 組織ID
 * @param prefix - 名前空間の接頭辞
 * @param localName - ローカル名
 * @returns 削除件数（0 = 対象なし）
 */
export async function deleteTerm(
  organizationId: string,
  prefix: string,
  localName: string
): Promise<number> {
  return namespaceTermRepository.remove(organizationId, prefix, localName);
}

/**
 * 組織の全用語を取得する
 *
 * @param organizationId - 組織ID（指定なしの場合は全件取得）
 * @returns 用語一覧
 */
export async function getTerms(
  organizationId?: string
): Promise<NamespaceTermRow[]> {
  if (organizationId) {
    return namespaceTermRepository.findAllByOrganization(organizationId);
  }
  return namespaceTermRepository.findAll();
}

/**
 * 用語のアクティブ/非アクティブを切り替える
 *
 * @param organizationId - 組織ID
 * @param prefix - 名前空間の接頭辞
 * @param localName - ローカル名
 * @param isActive - 設定するアクティブ状態
 * @returns 更新後の用語、または null（対象なし）
 */
export async function toggleTermActive(
  organizationId: string,
  prefix: string,
  localName: string,
  isActive: boolean
): Promise<NamespaceTermRow | null> {
  return namespaceTermRepository.toggleActive(organizationId, prefix, localName, isActive);
}

// ─── 名前空間宣言 ─────────────────────────────────────────────────────────────

/**
 * 組織の名前空間宣言（URI）を1件取得する
 *
 * XML ビューの xmlns 注入用。
 *
 * @param organizationId - 組織ID
 * @returns URI、または null（存在しない場合）
 */
export async function getDeclarations(
  organizationId: string
): Promise<string | null> {
  return namespaceTermRepository.findDeclarationsByOrganization(organizationId);
}

/**
 * プロジェクトスコープで絞り込んだ名前空間宣言一覧を取得する
 *
 * @remarks
 * - project テーブルから organization_group_cd を取得
 * - global_flg = TRUE の名前空間は常に含める
 * - organization_group_cd が指定されている場合は scope_key が一致する名前空間も含める
 * - organization_group_cd が NULL の場合は全件返す
 *
 * @param organizationId - 組織ID
 * @param projectId - プロジェクトID
 * @returns prefix / uri / globalFlg の配列、または null（プロジェクトが見つからない場合）
 */
export async function getDeclarationsByProject(
  organizationId: string,
  projectId: string
): Promise<ProjectScopeDeclaration[] | null> {
  // project テーブルから organization_group_cd を取得
  const projectRow = await namespaceTermRepository.findProjectGroupCd(organizationId, projectId);

  if (!projectRow) return null;

  const orgGroupCd: string | null = projectRow.organization_group_cd ?? null;

  return namespaceTermRepository.findDeclarationsByProjectScope(organizationId, orgGroupCd);
}
