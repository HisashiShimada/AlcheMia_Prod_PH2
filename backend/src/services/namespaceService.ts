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
  /** JWT の organizationGroupCds[0] をコントローラーから渡す */
  scopeKey?: string;
  description?: string;
}

/** createNamespace の戻り値型 */
export interface CreateNamespaceResult {
  namespaceId: string;
  prefix: string;
  uri: string;
}

/** updateNamespace の入力型 */
export interface UpdateNamespaceInput {
  organizationId: string;
  prefix: string;
  uri: string;
}

/** updateNamespace の戻り値型 */
export interface UpdateNamespaceResult {
  namespaceId: string;
  prefix: string;
  uri: string;
  scopeKey: string | null;
  globalFlg: boolean;
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

/** getNamespaces / getNamespacesByScopeKey の各要素型 */
export interface NamespaceListItem {
  prefix: string;
  uri: string;
  scopeKey?: string;
  scopeName?: string;
}

/** getNamespacesByScopeKey の各要素型（isGlobal 付き） */
export interface NamespaceScopeListItem {
  prefix: string;
  uri: string;
  scopeKey?: string;
  scopeName?: string;
  isGlobal?: boolean;
}

/** getTermsGlobal / getTermsByScopeKey の各要素型 */
export interface TermListItem {
  qname: string;
  prefix: string;
  localName: string;
  displayName: string;
  description: string;
  type: string;
  unitHint: string;
  isActive: boolean;
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
  // scopeKey はコントローラーで JWT の organizationGroupCds[0] から取得済み
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
 * @returns prefix / uri / scopeKey / scopeName の配列
 */
export async function getNamespaces(
  organizationId: string
): Promise<NamespaceListItem[]> {
  return namespaceTermRepository.findNamespacesByOrganization(organizationId);
}

/**
 * scope_key（ユーザーID または organization_group_cd）に紐づく名前空間一覧を取得する
 *
 * @param organizationId - 組織ID
 * @param scopeKey - namespace.scope_key（userId または organization_group_cd）
 * @returns prefix / uri / scopeKey / scopeName / isGlobal の配列
 */
export async function getNamespacesByScopeKey(
  organizationId: string,
  scopeKey: string
): Promise<NamespaceScopeListItem[]> {
  return namespaceTermRepository.findNamespacesByScopeKey(organizationId, scopeKey);
}

/**
 * global_flg=TRUE の名前空間に属する用語一覧を取得する
 *
 * @param organizationId - 組織ID
 * @returns 用語一覧
 */
export async function getTermsGlobal(
  organizationId: string
): Promise<TermListItem[]> {
  return namespaceTermRepository.findAllGlobal(organizationId);
}

/**
 * scopeKey（organization_group_cd または user_id）に紐づく用語一覧を取得する
 *
 * @param organizationId - 組織ID
 * @param scopeKey - namespace.scope_key の値
 * @returns 用語一覧
 */
export async function getTermsByScopeKey(
  organizationId: string,
  scopeKey: string
): Promise<TermListItem[]> {
  return namespaceTermRepository.findAllByScopeKey(organizationId, scopeKey);
}

/**
 * 名前空間（Prefix の URI）を更新する
 *
 * @param input - 更新データ
 * @returns 更新後のレコード、または null（対象なし）
 */
export async function updateNamespace(
  input: UpdateNamespaceInput
): Promise<UpdateNamespaceResult | null> {
  return namespaceTermRepository.updateNamespace({
    organizationId: input.organizationId,
    prefix: input.prefix,
    uri: input.uri,
  });
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

// ─── 個人・組織 URI 自動登録 ─────────────────────────────────────────────────

/** registerPersonalNamespaceUri の入力型 */
export interface RegisterNamespaceUriInput {
  organizationId: string;
  /** URI 候補（重複時は末尾に "1" を付与） */
  candidateUri: string;
  /** 登録者ユーザーID（scope_key にも使用） */
  userId: string;
}

/** registerPersonalNamespaceUri の戻り値型 */
export interface RegisterNamespaceUriResult {
  /** 実際に登録された URI */
  uri: string;
  /** 登録された namespace_id */
  namespaceId: string;
}

/**
 * 個人・組織 URI を namespace テーブルに自動登録する
 *
 * @remarks
 * - 既存 URI 一覧を取得して重複チェックを行う
 * - 重複する場合は candidateUri の末尾に "1" を付与した URI を使用する
 * - userService / organizationService から呼び出す（Repository を直接参照させない）
 *
 * @param input - 登録データ
 * @returns 登録された uri と namespace_id
 */
export async function registerPersonalNamespaceUri(
  input: RegisterNamespaceUriInput
): Promise<RegisterNamespaceUriResult> {
  const existingUris = await namespaceTermRepository.findUrisByOrganization(input.organizationId);
  const uniqueUri = existingUris.includes(input.candidateUri)
    ? `${input.candidateUri}1`
    : input.candidateUri;

  const namespaceId = await namespaceTermRepository.createNamespaceUri({
    organizationId: input.organizationId,
    uri: uniqueUri,
    userId: input.userId,
  });

  return { uri: uniqueUri, namespaceId };
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
