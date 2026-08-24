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
import { UpdatePrefixRow } from '../types/database';

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
  /** ツリーバッジ計算用: namespace.scope_key の値（グローバル用語は null） */
  scopeKey?: string | null;
}

// ─── URI自動生成用 ──────────────────────────────────────────────────────────

/**
 * 組織CDを取得（URI自動生成用）
 */
export async function findOrganizationCd(
  organizationId: string
): Promise<string | null> {
  const pgp = getPgp();
  const query = await loadSqlFile('organizations/findById.sql');
  const row = await pgp.oneOrNone<{ organization_cd: string }>(query, [organizationId]);
  return row?.organization_cd ?? null;
}

/**
 * 組織階層グループの先祖パスを取得（URI生成用）
 * @returns ルートから指定グループCDまでの順序付きCD配列
 */
export async function findOrgGroupAncestors(
  organizationId: string,
  groupCd: string
): Promise<string[]> {
  const pgp = getPgp();
  const query = await loadSqlFile('namespace_terms/findOrgGroupAncestors.sql');
  const rows = await pgp.any<{ organization_group_cd: string }>(query, [organizationId, groupCd]);
  return rows.map((r) => r.organization_group_cd);
}

/**
 * ユーザーのメールアドレスを取得（URI個人パス生成用）
 */
export async function findUserMailAddress(
  organizationId: string,
  userId: string
): Promise<string | null> {
  const pgp = getPgp();
  const query = `
    SELECT mail_address
    FROM organization_user
    WHERE organization_id = $1 AND user_id = $2
  `;
  const row = await pgp.oneOrNone<{ mail_address: string }>(query, [organizationId, userId]);
  return row?.mail_address ?? null;
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
 * 複数の scopeKey（organization_group_cd または user_id）に紐づく用語を一括取得
 *
 * company ノード選択時など、ツリーに表示されている全グループの
 * 用語をまとめて返す。
 *
 * @param organizationId - 組織ID
 * @param scopeKeys - 選択したグループの organization_group_cd 配列
 * @returns 用語一覧（フロントエンド用に整形済み）
 */
export async function findAllByScopeKeys(
  organizationId: string,
  scopeKeys: string[]
): Promise<NamespaceTermRow[]> {
  if (scopeKeys.length === 0) return [];
  const pgp = getPgp();
  const query = await loadSqlFile('namespace_terms/findAllByScopeKeys.sql');
  return pgp.any<NamespaceTermRow>(query, [organizationId, scopeKeys]);
}

/**
 * scopeKey（organization_group_cd）とその祖先グループに紐づく用語を取得
 *
 * WITH RECURSIVE で先祖グループCDを全列挙し、それらの scope_key を持つ
 * namespace に登録された用語を返す。
 * 階層ツリーでグループノードを選択した際に、そのグループ＋上位グループの
 * 用語をまとめて表示するために使用する。
 *
 * @param organizationId - 組織ID
 * @param scopeKey - 選択したグループの organization_group_cd
 * @returns 用語一覧（フロントエンド用に整形済み）
 */
export async function findAllByScopeKeyWithAncestors(
  organizationId: string,
  scopeKey: string
): Promise<NamespaceTermRow[]> {
  const pgp = getPgp();
  const query = await loadSqlFile('namespace_terms/findAllByScopeKeyWithAncestors.sql');
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
 * prefix テーブルの prefix と description を更新する
 *
 * prefix が変更される場合は、FK 制約のため以下の順序でトランザクション内で実行する:
 *   1. namespace_term.prefix を新しい prefix に UPDATE（updateTermPrefix.sql）
 *   2. prefix.prefix / prefix.description を UPDATE（updatePrefix.sql）
 *
 * description のみ変更する場合（newPrefix が undefined または現在の prefix と同一）は
 * namespace_term の UPDATE はスキップしてもよいが、一貫性のため常にトランザクションを使用する。
 *
 * @param data - 更新データ
 * @param data.organizationId - 組織ID
 * @param data.prefix - 現在の prefix（変更前）
 * @param data.newPrefix - 変更後の prefix（省略時は現在の prefix を維持）
 * @param data.description - 変更後の description（省略時は null に更新）
 * @returns 更新後のレコード（見つからない場合は null）
 */
export async function updateNamespace(data: {
  organizationId: string;
  prefix: string;
  newPrefix?: string;
  description?: string;
}): Promise<{ namespaceId: string; prefix: string; uri: string; scopeKey: string | null } | null> {
  const pgp = getPgp();

  const targetPrefix = data.newPrefix ?? data.prefix;
  const description = data.description ?? null;

  // SQL ファイルを事前に読み込む（task 内で loadSqlFile を呼ぶと非同期の問題が起きる可能性があるため外で取得）
  const updateTermPrefixQuery = await loadSqlFile('namespace_terms/updateTermPrefix.sql');
  const updatePrefixQuery = await loadSqlFile('namespace_terms/updatePrefix.sql');

  return (pgp.task(async (t: ITask<unknown>) => {
    // 1. prefix が変更される場合、先に namespace_term.prefix を UPDATE（FK 制約のため）
    if (targetPrefix !== data.prefix) {
      await t.none(updateTermPrefixQuery, [targetPrefix, data.organizationId, data.prefix]);
    }

    // 2. prefix テーブルの prefix と description を UPDATE
    const row = await t.oneOrNone<UpdatePrefixRow>(updatePrefixQuery, [targetPrefix, description, data.organizationId, data.prefix]);

    if (!row) return null;

    return {
      namespaceId: row.namespace_id,
      prefix: row.prefix,
      uri: row.uri,
      scopeKey: row.scope_key,
    };
  }) as Promise<{ namespaceId: string; prefix: string; uri: string; scopeKey: string | null } | null>);
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
 * scope_key に紐づく namespace_id を取得する（Prefix 追加時の namespace 紐づけ用）
 *
 * @remarks
 * Prefix 新規追加時に namespace テーブルの既存レコードを参照するために使用する。
 * namespace レコードはユーザー作成・チーム作成時に自動登録済みのため、
 * Prefix 追加時はこの関数で namespace_id を取得して prefix テーブルのみ INSERT する。
 *
 * @param organizationId - 組織ID
 * @param scopeKey - namespace.scope_key（userId または organization_group_cd）
 * @returns namespace_id（存在しない場合は null）
 */
export async function findNamespaceIdByScopeKey(
  organizationId: string,
  scopeKey: string
): Promise<string | null> {
  const pgp = getPgp();
  const query = await loadSqlFile('namespace_terms/findNamespaceIdByScopeKey.sql');
  const row = await pgp.oneOrNone<{ namespace_id: string }>(query, [organizationId, scopeKey]);
  return row?.namespace_id ?? null;
}

/**
 * prefix テーブルのみに1件 INSERT する（Prefix 新規追加用）
 *
 * @remarks
 * namespace テーブルへの INSERT は行わない。
 * namespace レコードはユーザー作成・チーム作成時に自動登録済みであり、
 * Prefix 追加時はこの関数を使用して既存 namespace への紐づけのみ行う。
 *
 * @param data - 登録する Prefix データ
 */
export async function createPrefixOnly(data: {
  organizationId: string;
  namespaceId: string;
  prefix: string;
  description?: string;
  userId: string;
}): Promise<void> {
  const pgp = getPgp();
  const query = await loadSqlFile('namespace_terms/createPrefix.sql');
  await pgp.none(query, [
    data.organizationId,
    data.namespaceId,
    data.prefix,
    data.description ?? null,
    data.userId,
  ]);
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
 * 複数の scopeKey（organization_group_cd または user_id）に紐づく名前空間（Prefix）を一括取得
 *
 * company ノード選択時など、ツリーに表示されている全グループの
 * Prefix をまとめて返す。
 *
 * @param organizationId - 組織ID
 * @param scopeKeys - organization_group_cd 配列
 * @returns prefix / uri / scopeKey / scopeName の配列
 */
export async function findNamespacesByScopeKeys(
  organizationId: string,
  scopeKeys: string[]
): Promise<Array<{ prefix: string; uri: string; scopeKey?: string; scopeName?: string }>> {
  if (scopeKeys.length === 0) return [];
  const pgp = getPgp();
  const query = await loadSqlFile('namespace_terms/findNamespacesByScopeKeys.sql');
  return pgp.any<{ prefix: string; uri: string; scopeKey?: string; scopeName?: string }>(
    query,
    [organizationId, scopeKeys]
  );
}

/**
 * scopeKey（organization_group_cd）とその祖先グループに紐づく名前空間（Prefix）一覧を取得
 *
 * WITH RECURSIVE で先祖グループCDを全列挙し、それらの scope_key を持つ
 * namespace レコードを返す。
 * 階層ツリーでグループノードを選択した際に、そのグループ＋上位グループの
 * Prefix をまとめて表示するために使用する。
 *
 * @param organizationId - 組織ID
 * @param scopeKey - 選択したグループの organization_group_cd
 * @returns prefix / uri / scopeKey / scopeName の配列
 */
export async function findNamespacesByScopeKeyWithAncestors(
  organizationId: string,
  scopeKey: string
): Promise<Array<{ prefix: string; uri: string; scopeKey?: string; scopeName?: string }>> {
  const pgp = getPgp();
  const query = await loadSqlFile('namespace_terms/findNamespacesByScopeKeyWithAncestors.sql');
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
 * Prefix の is_active を切り替える
 *
 * @param organizationId - 組織ID
 * @param prefix - 対象の prefix 文字列
 * @param isActive - 設定するアクティブ状態
 * @returns 更新件数（0 = 対象なし）
 */
export async function toggleActivePrefix(
  organizationId: string,
  prefix: string,
  isActive: boolean
): Promise<number> {
  const pgp = getPgp();
  const query = await loadSqlFile('namespace_terms/toggleActivePrefix.sql');
  const result = await pgp.result(query, [organizationId, prefix, isActive]);
  return result.rowCount;
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
