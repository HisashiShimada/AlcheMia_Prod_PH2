/**
 * namespace_term Repository
 *
 * namespace / prefix / namespace_term テーブルへのデータアクセスを提供
 *
 * @remarks
 * DBテーブル構成（実DB準拠）:
 *   namespace     (organization_id, namespace_id)       ← URIを保持
 *       ↑FK
 *   prefix        (organization_id, namespace_id, prefix) ← prefix文字列を保持
 *       ↑FK
 *   namespace_term(organization_id, namespace_id, prefix, localname) ← 用語を保持
 *
 * DDL:
 *   docs/design/db/ddl/namespace.sql
 *   docs/design/db/ddl/prefix.sql
 *   docs/design/db/ddl/namespace_term.sql
 *
 * @module namespaceTermRepository
 * @version 3.0.0
 */

import { ITask } from 'pg-promise';
import { getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';

/**
 * namespace_term テーブルの型定義
 *
 * @remarks
 * DDL: docs/design/db/ddl/namespace_term.sql
 * 主キー: (organization_id, namespace_id, prefix, localname)
 */
export interface NamespaceTerm {
  organization_id: string;
  namespace_id: string;
  prefix: string;
  localname: string;
  units: string | null;
  xsi_type: string | null;
  is_active: boolean;
  display_name: string | null;
  description: string | null;
  has_directive_term: boolean;
  create_user_id: string | null;
  create_at: Date | null;
  update_user_id: string | null;
  update_at: Date | null;
}

/**
 * API レスポンス用の用語型（フロントエンドの Term 型に対応）
 */
export interface NamespaceTermRow {
  qname: string;
  prefix: string;
  localName: string;
  displayName: string;
  description: string;
  type: string;
  unitHint: string;
  isActive: boolean;
  hasDirectiveTerm: boolean;
}

/**
 * 組織に紐づく全用語を取得
 *
 * @param organizationId - 組織ID
 * @returns 用語一覧（フロントエンド用に整形済み）
 */
export async function findAllByOrganization(
  organizationId: string
): Promise<NamespaceTermRow[]> {
  const pgp = getPgp();
  const query = await loadSqlFile('namespace_terms/findAllByOrganization.sql');
  return pgp.any<NamespaceTermRow>(query, [organizationId]);
}

/**
 * scopeKey（organization_group_cd または user_id）に紐づく用語を取得
 * global_flg=TRUE の名前空間に属する用語も含む
 *
 * @param organizationId - 組織ID
 * @param scopeKey - namespace.scope_key の値
 * @returns 用語一覧（フロントエンド用に整形済み）
 */
export async function findAllByScopeKey(
  organizationId: string,
  scopeKey: string
): Promise<NamespaceTermRow[]> {
  const pgp = getPgp();
  const query = await loadSqlFile('namespace_terms/findAllByScopeKey.sql');
  return pgp.any<NamespaceTermRow>(query, [organizationId, scopeKey]);
}

/**
 * global_flg=TRUE の名前空間に属する用語を取得
 * グローバルノード選択時に使用する
 *
 * @param organizationId - 組織ID
 * @returns 用語一覧（フロントエンド用に整形済み）
 */
export async function findAllGlobal(
  organizationId: string
): Promise<NamespaceTermRow[]> {
  const pgp = getPgp();
  const query = await loadSqlFile('namespace_terms/findAllGlobal.sql');
  return pgp.any<NamespaceTermRow>(query, [organizationId]);
}

/**
 * 組織の名前空間宣言（uri）を取得
 *
 * XML ビューの xmlns 注入用。namespace テーブルから1件取得する。
 *
 * @param organizationId - 組織ID
 * @returns 名前空間の URI（存在しない場合は null）
 */
export async function findDeclarationsByOrganization(
  organizationId: string
): Promise<string | null> {
  const pgp = getPgp();
  const query = await loadSqlFile('namespace_terms/findDeclarationsByOrganization.sql');
  const row = await pgp.oneOrNone<{ uri: string }>(query, [organizationId]);
  return row?.uri ?? null;
}

/**
 * prefix に対応するレコードが prefix テーブルに存在するか確認
 *
 * @param organizationId - 組織ID
 * @param prefix - 名前空間の接頭辞
 * @returns 存在する場合 true
 */
export async function existsNamespace(
  organizationId: string,
  prefix: string
): Promise<boolean> {
  const pgp = getPgp();
  const query = await loadSqlFile('namespace_terms/existsNamespace.sql');
  const row = await pgp.oneOrNone(query, [organizationId, prefix]);
  return row !== null;
}

/**
 * namespace_term に1件 INSERT
 *
 * @param data - 登録する用語データ
 * @returns 登録された用語（フロントエンド用に整形済み）
 */
export async function create(data: {
  organizationId: string;
  prefix: string;
  localName: string;
  displayName?: string;
  description?: string;
  typeHint?: string;
  unitHint?: string;
  hasDirectiveTerm?: boolean;
}): Promise<NamespaceTermRow> {
  const pgp = getPgp();

  // prefix に対応する namespace_id を取得
  const findPrefixQuery = await loadSqlFile('namespace_terms/findPrefixNamespaceId.sql');
  const prefixRow = await pgp.oneOrNone<{ namespace_id: string }>(
    findPrefixQuery,
    [data.organizationId, data.prefix]
  );
  if (!prefixRow) {
    throw new Error(`prefix "${data.prefix}" に対応する namespace_id が見つかりません`);
  }
  const namespaceId = prefixRow.namespace_id;

  // 重複チェック: 同じ prefix:localName が既に存在する場合は 409 エラー
  const checkQuery = await loadSqlFile('namespace_terms/findTermByKey.sql');
  const existing = await pgp.oneOrNone<NamespaceTermRow>(checkQuery, [
    data.organizationId,
    data.prefix,
    data.localName,
  ]);
  if (existing) {
    // スコープ名（チーム名など）を取得してエラー詳細に付与
    const scopeNameQuery = await loadSqlFile('namespace_terms/findScopeNameByPrefix.sql');
    const scopeRow = await pgp.oneOrNone<{ scope_name: string }>(scopeNameQuery, [
      data.organizationId,
      data.prefix,
    ]);
    const scopeName = scopeRow?.scope_name ?? data.prefix;

    const err: Error & { statusCode?: number; code?: string; details?: { scopeName: string } } = new Error(
      `Term "${data.prefix}:${data.localName}" already exists`
    );
    err.statusCode = 409;
    err.code = 'E6005';
    err.details = { scopeName };
    throw err;
  }

  const insertQuery = await loadSqlFile('namespace_terms/createTerm.sql');
  await pgp.none(insertQuery, [
    data.organizationId,
    namespaceId,
    data.prefix,
    data.localName,
    data.displayName ?? null,
    data.description ?? null,
    data.typeHint ?? null,
    data.unitHint ?? null,
    data.hasDirectiveTerm ?? false,
  ]);

  // 登録後、フロントエンド用フォーマットで返す
  const selectQuery = await loadSqlFile('namespace_terms/findTermByKey.sql');
  return pgp.one<NamespaceTermRow>(selectQuery, [
    data.organizationId,
    data.prefix,
    data.localName,
  ]);
}

/**
 * namespace_term に1件 INSERT（トランザクション内専用）
 *
 * @param t - pg-promise トランザクションオブジェクト
 * @param data - 登録する用語データ
 * @returns 登録された用語（フロントエンド用に整形済み）
 */
export async function createInTx(
  t: ITask<unknown>,
  data: {
    organizationId: string;
    prefix: string;
    localName: string;
    displayName?: string;
    description?: string;
    typeHint?: string;
    unitHint?: string;
    hasDirectiveTerm?: boolean;
  }
): Promise<NamespaceTermRow> {
  // prefix に対応する namespace_id を取得
  const findPrefixQuery = await loadSqlFile('namespace_terms/findPrefixNamespaceId.sql');
  const prefixRow = await t.oneOrNone<{ namespace_id: string }>(
    findPrefixQuery,
    [data.organizationId, data.prefix]
  );
  if (!prefixRow) {
    throw new Error(`prefix "${data.prefix}" に対応する namespace_id が見つかりません`);
  }
  const namespaceId = prefixRow.namespace_id;

  // 重複チェック
  const checkQuery = await loadSqlFile('namespace_terms/findTermByKey.sql');
  const existing = await t.oneOrNone<NamespaceTermRow>(checkQuery, [
    data.organizationId,
    data.prefix,
    data.localName,
  ]);
  if (existing) {
    const scopeNameQuery = await loadSqlFile('namespace_terms/findScopeNameByPrefix.sql');
    const scopeRow = await t.oneOrNone<{ scope_name: string }>(scopeNameQuery, [
      data.organizationId,
      data.prefix,
    ]);
    const scopeName = scopeRow?.scope_name ?? data.prefix;

    const err: Error & { statusCode?: number; code?: string; details?: { scopeName: string } } = new Error(
      `Term "${data.prefix}:${data.localName}" already exists`
    );
    err.statusCode = 409;
    err.code = 'E6005';
    err.details = { scopeName };
    throw err;
  }

  const insertQuery = await loadSqlFile('namespace_terms/createTerm.sql');
  await t.none(insertQuery, [
    data.organizationId,
    namespaceId,
    data.prefix,
    data.localName,
    data.displayName ?? null,
    data.description ?? null,
    data.typeHint ?? null,
    data.unitHint ?? null,
    data.hasDirectiveTerm ?? false,
  ]);

  // 登録後、フロントエンド用フォーマットで返す
  const selectQuery = await loadSqlFile('namespace_terms/findTermByKey.sql');
  return t.one<NamespaceTermRow>(selectQuery, [
    data.organizationId,
    data.prefix,
    data.localName,
  ]);
}

/**
 * namespace_term を更新（UPDATE）
 *
 * @param organizationId - 組織ID
 * @param prefix - 名前空間の接頭辞
 * @param localName - ローカル名
 * @param data - 更新するフィールド
 * @returns 更新後の用語（フロントエンド用に整形済み）、対象なしの場合は null
 */
export async function update(
  organizationId: string,
  prefix: string,
  localName: string,
  data: {
    displayName?: string;
    description?: string;
    typeHint?: string;
    unitHint?: string;
    hasDirectiveTerm?: boolean;
  }
): Promise<NamespaceTermRow | null> {
  const pgp = getPgp();

  const updateQuery = await loadSqlFile('namespace_terms/updateTerm.sql');
  const result = await pgp.result(updateQuery, [
    organizationId,
    prefix,
    localName,
    data.displayName ?? null,
    data.description ?? null,
    data.typeHint ?? null,
    data.unitHint ?? null,
    data.hasDirectiveTerm ?? false,
  ]);

  if (result.rowCount === 0) return null;

  // 更新後、フロントエンド用フォーマットで返す
  const selectQuery = await loadSqlFile('namespace_terms/findTermByKey.sql');
  return pgp.oneOrNone<NamespaceTermRow>(selectQuery, [organizationId, prefix, localName]);
}

/**
 * namespace_term を削除（DELETE）
 *
 * @param organizationId - 組織ID
 * @param prefix - 名前空間の接頭辞
 * @param localName - ローカル名
 * @returns 削除件数（0 = 対象なし）
 */
export async function remove(
  organizationId: string,
  prefix: string,
  localName: string
): Promise<number> {
  const pgp = getPgp();
  const query = await loadSqlFile('namespace_terms/removeTerm.sql');
  const result = await pgp.result(query, [organizationId, prefix, localName]);
  return result.rowCount ?? 0;
}

/**
 * namespace テーブルの URI を更新する
 *
 * @param data - 更新データ（uri, organizationId, prefix）
 * @returns 更新後のレコード（見つからない場合は null）
 */
export async function updateNamespace(data: {
  organizationId: string;
  prefix: string;
  uri: string;
}): Promise<{ namespaceId: string; prefix: string; uri: string; scopeKey: string | null } | null> {
  const pgp = getPgp();
  const query = await loadSqlFile('namespace_terms/updateNamespace.sql');
  const row = await pgp.oneOrNone<{
    namespace_id: string;
    prefix: string;
    uri: string;
    scope_key: string | null;
  }>(query, [data.uri, data.organizationId, data.prefix]);
  if (!row) return null;
  return {
    namespaceId: row.namespace_id,
    prefix: row.prefix,
    uri: row.uri,
    scopeKey: row.scope_key,
  };
}

/**
 * namespace テーブルに URI のみ INSERT する（組織・ユーザー作成時の自動登録用）
 *
 * prefix テーブルへの登録は行わない。
 * Prefix は実験管理者が Prefix 管理画面から手動登録する。
 *
 * @param data - 登録する名前空間データ
 * @param t - pg-promise トランザクションオブジェクト（省略時はプール接続を使用）
 * @returns 登録された namespace_id
 *
 * @remarks
 * scopeKey を指定するとチームスコープの namespace として登録される（scope_key = organization_group_cd）。
 * 省略時は scope_key = NULL（組織/ユーザーレベル）で登録される。
 */
export async function createNamespaceUri(
  data: {
    organizationId: string;
    uri: string;
    userId: string;
    scopeKey?: string;
  },
  t?: ITask<unknown>
): Promise<string> {
  const conn = t ?? getPgp();

  // namespace_id を採番: 組織内の最大連番+1 (NS0001 形式)
  const seqQuery = await loadSqlFile('namespace_terms/findNextNamespaceSeq.sql');
  const seqRow = await conn.one<{ next_seq: number }>(seqQuery, [data.organizationId]);
  const namespaceId = `NS${String(seqRow.next_seq).padStart(4, '0')}`;

  // namespace テーブルに INSERT（URI のみ）
  // $5: scope_key（未指定の場合は NULL）
  const insertQuery = await loadSqlFile('namespace_terms/createNamespaceUri.sql');
  await conn.none(insertQuery, [
    data.organizationId,
    namespaceId,
    data.uri,
    data.userId,
    data.scopeKey ?? null,
  ]);

  return namespaceId;
}

/**
 * 指定した scope_key を持つ namespace レコードが存在するか確認する
 *
 * backfill スクリプトの冪等性チェックや、チーム作成時の二重登録防止に使用する。
 *
 * @param organizationId - 組織ID
 * @param scopeKey - namespace.scope_key の値（organization_group_cd など）
 * @param t - pg-promise トランザクションオブジェクト（省略時はプール接続を使用）
 * @returns 存在する場合 true
 */
export async function existsByScopeKey(
  organizationId: string,
  scopeKey: string,
  t?: ITask<unknown>
): Promise<boolean> {
  const conn = t ?? getPgp();
  const query = await loadSqlFile('namespace_terms/existsByScopeKey.sql');
  const row = await conn.oneOrNone<{ exists: boolean }>(query, [organizationId, scopeKey]);
  return row?.exists ?? false;
}

/**
 * 組織に紐づく namespace の URI 一覧を取得（URI重複チェック用）
 *
 * @param organizationId - 組織ID
 * @param t - pg-promise トランザクションオブジェクト（省略時はプール接続を使用）
 * @returns URI の配列
 */
export async function findUrisByOrganization(
  organizationId: string,
  t?: ITask<unknown>
): Promise<string[]> {
  const conn = t ?? getPgp();
  const query = await loadSqlFile('namespace_terms/findUrisByOrganization.sql');
  const rows = await conn.any<{ uri: string }>(query, [organizationId]);
  return rows.map(r => r.uri);
}

/**
 * ユーザーの所属 organization_group_cd（scopeKey）を取得する
 *
 * @remarks
 * organization_group_user テーブルから userId に紐づく organization_group_cd を返す。
 * 複数所属がある場合は create_at が最も古い1件を返す。
 * 未所属（sys_admin 等）の場合は null を返す。
 *
 * @param organizationId - 組織ID
 * @param userId - ユーザーID
 * @returns organization_group_cd または null
 */
export async function findUserOrgGroupCd(
  organizationId: string,
  userId: string
): Promise<string | null> {
  const pgp = getPgp();
  const query = await loadSqlFile('namespace_terms/findUserOrgGroupCd.sql');
  const row = await pgp.oneOrNone<{ organization_group_cd: string }>(
    query,
    [organizationId, userId]
  );
  return row?.organization_group_cd ?? null;
}

/**
 * namespace テーブルに1件 INSERT し、prefix テーブルにも INSERT する（名前空間の新規登録）
 *
 * @remarks
 * テーブル構成に従い、以下の2テーブルに登録する:
 *   1. namespace テーブル: uri / scope_key / global_flg を保持
 *   2. prefix テーブル: prefix文字列を保持（FK → namespace）
 *
 * @param data - 登録する名前空間データ
 * @returns 登録された namespace_id
 */
export async function createNamespace(data: {
  organizationId: string;
  prefix: string;
  uri: string;
  userId: string;
  scopeKey?: string;
  description?: string;
}): Promise<string> {
  const pgp = getPgp();

  // namespace_id を採番: 組織内の最大連番+1 (NS0001 形式)
  const seqQuery = await loadSqlFile('namespace_terms/findNextNamespaceSeq.sql');
  const seqRow = await pgp.one<{ next_seq: number }>(seqQuery, [data.organizationId]);
  const namespaceId = `NS${String(seqRow.next_seq).padStart(4, '0')}`;

  // 1. namespace テーブルに INSERT
  const insertNamespaceQuery = await loadSqlFile('namespace_terms/createNamespace.sql');
  await pgp.none(insertNamespaceQuery, [
    data.organizationId,
    namespaceId,
    data.uri,
    data.scopeKey ?? null,
    data.userId,
  ]);

  // 2. prefix テーブルに INSERT
  const insertPrefixQuery = await loadSqlFile('namespace_terms/createPrefix.sql');
  await pgp.none(insertPrefixQuery, [
    data.organizationId,
    namespaceId,
    data.prefix,
    data.description ?? null,
    data.userId,
  ]);

  return namespaceId;
}

/**
 * 組織に紐づく名前空間（prefix / uri）の一覧を取得
 *
 * MaiMLファイルへの名前空間宣言書き込みに使用する。
 * prefix テーブルと namespace テーブルを JOIN して取得する。
 *
 * @param organizationId - 組織ID
 * @returns prefix / uri / scopeKey / scopeName の配列（prefix 昇順）
 */
export async function findNamespacesByOrganization(
  organizationId: string
): Promise<Array<{ prefix: string; uri: string; scopeKey?: string; scopeName?: string }>> {
  const pgp = getPgp();
  const query = await loadSqlFile('namespace_terms/findNamespacesByOrganization.sql');
  return pgp.any<{ prefix: string; uri: string; scopeKey?: string; scopeName?: string }>(query, [organizationId]);
}

/**
 * namespace テーブルから1件 DELETE（名前空間の削除）
 *
 * prefix テーブルから対象の prefix を削除する。
 * namespace テーブルの孤立レコードは残す（他の prefix が参照している可能性があるため）。
 *
 * @param organizationId - 組織ID
 * @param prefix - 名前空間の接頭辞
 * @returns 削除件数（0 = 対象なし）
 */
export async function removeNamespace(
  organizationId: string,
  prefix: string
): Promise<number> {
  const pgp = getPgp();
  const query = await loadSqlFile('namespace_terms/removeNamespace.sql');
  const result = await pgp.result(query, [organizationId, prefix]);
  return result.rowCount ?? 0;
}

/**
 * プロジェクトスコープで絞り込んだ namespace 宣言一覧を取得する。
 *
 * - global_flg = TRUE の namespace に紐づく prefix は常に含める
 * - orgGroupCd が指定された場合は scope_key = orgGroupCd の namespace に紐づく prefix も含める
 * - orgGroupCd が NULL の場合は organization_id 配下の全件を返す（制限なし）
 *
 * @param organizationId - 組織ID
 * @param orgGroupCd - project.organization_group_cd の値（NULL可）
 * @returns prefix / uri / globalFlg の配列
 */
export async function findDeclarationsByProjectScope(
  organizationId: string,
  orgGroupCd: string | null
): Promise<Array<{ prefix: string; uri: string }>> {
  const pgp = getPgp();
  const query = await loadSqlFile('namespace_terms/findDeclarationsByProjectScope.sql');
  return pgp.any<{ prefix: string; uri: string }>(
    query,
    [organizationId, orgGroupCd]
  );
}

/**
 * scope_key（ユーザーID または organization_group_cd）に紐づく名前空間一覧を取得
 *
 * PrefixManagement / TermManagement 画面で使用する形式で返す。
 * SQL（findNamespacesByScopeKey.sql）は prefix / uri / scopeKey / scopeName / isGlobal を返す。
 *
 * @param organizationId - 組織ID
 * @param scopeKey - namespace.scope_key（userId または organization_group_cd）
 * @returns prefix / uri / scopeKey / scopeName / isGlobal の配列
 */
export async function findNamespacesByScopeKey(
  organizationId: string,
  scopeKey: string
): Promise<Array<{ prefix: string; uri: string; scopeKey?: string; scopeName?: string }>> {
  const pgp = getPgp();
  const query = await loadSqlFile('namespace_terms/findNamespacesByScopeKey.sql');
  return pgp.any<{ prefix: string; uri: string; scopeKey?: string; scopeName?: string }>(
    query,
    [organizationId, scopeKey]
  );
}

/**
 * project テーブルから organization_group_cd を取得する
 *
 * @param organizationId - 組織ID
 * @param projectId - プロジェクトID
 * @returns { organization_group_cd } のオブジェクト、または null（プロジェクトが見つからない場合）
 */
export async function findProjectGroupCd(
  organizationId: string,
  projectId: string
): Promise<{ organization_group_cd: string | null } | null> {
  const pgp = getPgp();
  const query = await loadSqlFile('namespace_terms/findProjectGroupCd.sql');
  return pgp.oneOrNone<{ organization_group_cd: string | null }>(query, [projectId, organizationId]);
}

/**
 * 全組織の全用語を取得（認証なし用・開発時のみ使用）
 *
 * @returns 用語一覧（フロントエンド用に整形済み）
 */
export async function findAll(): Promise<NamespaceTermRow[]> {
  const pgp = getPgp();
  const query = await loadSqlFile('namespace_terms/findAll.sql');
  return pgp.any<NamespaceTermRow>(query);
}

/**
 * 用語のアクティブ/非アクティブを切り替える
 *
 * @param organizationId - 組織ID
 * @param prefix - 名前空間の接頭辞
 * @param localName - ローカル名
 * @param isActive - 設定するアクティブ状態
 * @returns 更新後の用語（対象なしの場合は null）
 */
export async function toggleActive(
  organizationId: string,
  prefix: string,
  localName: string,
  isActive: boolean
): Promise<NamespaceTermRow | null> {
  const pgp = getPgp();

  const updateQuery = await loadSqlFile('namespace_terms/toggleActiveTerm.sql');
  const result = await pgp.result(updateQuery, [organizationId, prefix, localName, isActive]);
  if (result.rowCount === 0) return null;

  const selectQuery = await loadSqlFile('namespace_terms/findTermByKey.sql');
  return pgp.oneOrNone<NamespaceTermRow>(selectQuery, [organizationId, prefix, localName]);
}
