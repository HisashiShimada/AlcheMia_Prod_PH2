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
 * namespace テーブルに URI のみ INSERT する（組織・ユーザー作成時の自動登録用）
 *
 * prefix テーブルへの登録は行わない。
 * Prefix は実験管理者が Prefix 管理画面から手動登録する。
 *
 * @param data - 登録する名前空間データ
 * @returns 登録された namespace_id
 */
export async function createNamespaceUri(data: {
  organizationId: string;
  uri: string;
  userId: string;
}): Promise<string> {
  const pgp = getPgp();

  // namespace_id を採番: 組織内の最大連番+1 (NS0001 形式)
  const seqQuery = await loadSqlFile('namespace_terms/findNextNamespaceSeq.sql');
  const seqRow = await pgp.one<{ next_seq: number }>(seqQuery, [data.organizationId]);
  const namespaceId = `NS${String(seqRow.next_seq).padStart(4, '0')}`;

  // namespace テーブルに INSERT（URI のみ）
  const insertQuery = await loadSqlFile('namespace_terms/createNamespaceUri.sql');
  await pgp.none(insertQuery, [
    data.organizationId,
    namespaceId,
    data.uri,
    data.userId,
  ]);

  return namespaceId;
}

/**
 * 組織に紐づく namespace の URI 一覧を取得（URI重複チェック用）
 *
 * @param organizationId - 組織ID
 * @returns URI の配列
 */
export async function findUrisByOrganization(
  organizationId: string
): Promise<string[]> {
  const pgp = getPgp();
  const query = await loadSqlFile('namespace_terms/findUrisByOrganization.sql');
  const rows = await pgp.any<{ uri: string }>(query, [organizationId]);
  return rows.map(r => r.uri);
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
 * @returns prefix と uri の配列（prefix 昇順）
 */
export async function findNamespacesByOrganization(
  organizationId: string
): Promise<Array<{ prefix: string; uri: string }>> {
  const pgp = getPgp();
  const query = await loadSqlFile('namespace_terms/findNamespacesByOrganization.sql');
  return pgp.any<{ prefix: string; uri: string }>(query, [organizationId]);
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
): Promise<Array<{ prefix: string; uri: string; globalFlg: boolean }>> {
  const pgp = getPgp();
  const query = await loadSqlFile('namespace_terms/findDeclarationsByProjectScope.sql');
  return pgp.any<{ prefix: string; uri: string; globalFlg: boolean }>(
    query,
    [organizationId, orgGroupCd]
  );
}

/**
 * scope_key（ユーザーID）に紐づく名前空間一覧を取得
 *
 * Personal ノード表示用。organization_user テーブルと JOIN して user_name を返す。
 *
 * @param organizationId - 組織ID
 * @param scopeKey - namespace.scope_key（= user_id）
 * @returns namespace_id / uri / scope_key / global_flg / user_name の配列
 */
export async function findNamespacesByScopeKey(
  organizationId: string,
  scopeKey: string
): Promise<Array<{ namespace_id: string; uri: string; scope_key: string; global_flg: boolean; user_name: string | null }>> {
  const pgp = getPgp();
  const query = await loadSqlFile('namespace_terms/findNamespacesByScopeKey.sql');
  return pgp.any<{ namespace_id: string; uri: string; scope_key: string; global_flg: boolean; user_name: string | null }>(
    query,
    [organizationId, scopeKey]
  );
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
