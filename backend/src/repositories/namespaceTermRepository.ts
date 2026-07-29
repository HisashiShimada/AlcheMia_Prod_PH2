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

import { getPool } from '../database/db';

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
  const pool = getPool();

  const query = `
    SELECT
      t.prefix || ':' || t.localname  AS qname
      , t.prefix                       AS prefix
      , t.localname                    AS "localName"
      , COALESCE(t.display_name, '')   AS "displayName"
      , COALESCE(t.description, '')    AS description
      , COALESCE(t.xsi_type, 'stringType') AS type
      , COALESCE(t.units, '')          AS "unitHint"
    FROM namespace_term t
    WHERE t.organization_id = $1
      AND t.is_active = TRUE
    ORDER BY t.prefix ASC, t.localname ASC
  `;

  const result = await pool.query(query, [organizationId]);
  return result.rows;
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
  const pool = getPool();

  const query = `
    SELECT uri
    FROM namespace
    WHERE organization_id = $1
    LIMIT 1
  `;

  const result = await pool.query<{ uri: string }>(query, [organizationId]);
  return result.rows[0]?.uri ?? null;
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
  const pool = getPool();

  const query = `
    SELECT 1 FROM prefix
    WHERE organization_id = $1 AND prefix = $2
    LIMIT 1
  `;

  const result = await pool.query(query, [organizationId, prefix]);
  return result.rowCount !== null && result.rowCount > 0;
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
  const pool = getPool();

  // prefix に対応する namespace_id を取得
  const prefixRow = await pool.query<{ namespace_id: string }>(
    `SELECT namespace_id FROM prefix WHERE organization_id = $1 AND prefix = $2 LIMIT 1`,
    [data.organizationId, data.prefix]
  );
  if (prefixRow.rows.length === 0) {
    throw new Error(`prefix "${data.prefix}" に対応する namespace_id が見つかりません`);
  }
  const namespaceId = prefixRow.rows[0].namespace_id;

  const insertQuery = `
    INSERT INTO namespace_term (
      organization_id
      , namespace_id
      , prefix
      , localname
      , display_name
      , description
      , xsi_type
      , units
      , is_active
      , create_at
      , update_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, TRUE
      , CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `;

  await pool.query(insertQuery, [
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
  const selectQuery = `
    SELECT
      t.prefix || ':' || t.localname  AS qname
      , t.prefix                       AS prefix
      , t.localname                    AS "localName"
      , COALESCE(t.display_name, '')   AS "displayName"
      , COALESCE(t.description, '')    AS description
      , COALESCE(t.xsi_type, 'stringType') AS type
      , COALESCE(t.units, '')          AS "unitHint"
    FROM namespace_term t
    WHERE t.organization_id = $1
      AND t.prefix = $2
      AND t.localname = $3
  `;

  const result = await pool.query(selectQuery, [
    data.organizationId,
    data.prefix,
    data.localName,
  ]);
  return result.rows[0];
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
  const pool = getPool();

  const updateQuery = `
    UPDATE namespace_term SET
      display_name  = $4
      , description = $5
      , xsi_type    = $6
      , units       = $7
      , update_at   = CURRENT_TIMESTAMP
    WHERE organization_id = $1
      AND prefix = $2
      AND localname = $3
  `;

  const result = await pool.query(updateQuery, [
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
  const selectQuery = `
    SELECT
      t.prefix || ':' || t.localname  AS qname
      , t.prefix                       AS prefix
      , t.localname                    AS "localName"
      , COALESCE(t.display_name, '')   AS "displayName"
      , COALESCE(t.description, '')    AS description
      , COALESCE(t.xsi_type, 'stringType') AS type
      , COALESCE(t.units, '')          AS "unitHint"
    FROM namespace_term t
    WHERE t.organization_id = $1
      AND t.prefix = $2
      AND t.localname = $3
  `;

  const updated = await pool.query(selectQuery, [organizationId, prefix, localName]);
  return updated.rows[0] ?? null;
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
  const pool = getPool();

  const query = `
    DELETE FROM namespace_term
    WHERE organization_id = $1
      AND prefix = $2
      AND localname = $3
  `;
  const result = await pool.query(query, [organizationId, prefix, localName]);
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
  const pool = getPool();

  // namespace_id を採番: 組織内の最大連番+1 (NS0001 形式)
  const seqResult = await pool.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(namespace_id FROM 3) AS INTEGER)), 0) + 1 AS next_seq
     FROM namespace
     WHERE organization_id = $1`,
    [data.organizationId]
  );
  const seq: number = seqResult.rows[0].next_seq;
  const namespaceId = `NS${String(seq).padStart(4, '0')}`;

  // namespace テーブルに INSERT（URI のみ）
  const insertNamespaceQuery = `
    INSERT INTO namespace (
      organization_id
      , namespace_id
      , uri
      , global_flg
      , scope_key
      , create_user_id
      , create_at
      , update_user_id
      , update_at
    ) VALUES (
      $1, $2, $3, FALSE, NULL, $4, CURRENT_TIMESTAMP, $4, CURRENT_TIMESTAMP
    )
    ON CONFLICT (organization_id, namespace_id) DO NOTHING
  `;

  await pool.query(insertNamespaceQuery, [
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
  const pool = getPool();

  const result = await pool.query<{ uri: string }>(
    `SELECT uri FROM namespace WHERE organization_id = $1`,
    [organizationId]
  );
  return result.rows.map(r => r.uri);
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
  const pool = getPool();

  // namespace_id を採番: 組織内の最大連番+1 (NS0001 形式)
  const seqResult = await pool.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(namespace_id FROM 3) AS INTEGER)), 0) + 1 AS next_seq
     FROM namespace
     WHERE organization_id = $1`,
    [data.organizationId]
  );
  const seq: number = seqResult.rows[0].next_seq;
  const namespaceId = `NS${String(seq).padStart(4, '0')}`;

  // 1. namespace テーブルに INSERT
  const insertNamespaceQuery = `
    INSERT INTO namespace (
      organization_id
      , namespace_id
      , uri
      , global_flg
      , scope_key
      , create_user_id
      , create_at
      , update_user_id
      , update_at
    ) VALUES (
      $1, $2, $3, FALSE, $4, $5, CURRENT_TIMESTAMP, $5, CURRENT_TIMESTAMP
    )
    ON CONFLICT (organization_id, namespace_id) DO NOTHING
  `;

  await pool.query(insertNamespaceQuery, [
    data.organizationId,
    namespaceId,
    data.uri,
    data.scopeKey ?? null,
    data.userId,
  ]);

  // 2. prefix テーブルに INSERT
  const insertPrefixQuery = `
    INSERT INTO prefix (
      organization_id
      , namespace_id
      , prefix
      , description
      , is_active
      , create_user_id
      , create_at
      , update_user_id
      , update_at
    ) VALUES (
      $1, $2, $3, $4, TRUE, $5, CURRENT_TIMESTAMP, $5, CURRENT_TIMESTAMP
    )
    ON CONFLICT (organization_id, namespace_id, prefix) DO NOTHING
  `;

  await pool.query(insertPrefixQuery, [
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
  const pool = getPool();

  const query = `
    SELECT
      p.prefix
      , n.uri
    FROM prefix p
    INNER JOIN namespace n
      ON p.organization_id = n.organization_id
      AND p.namespace_id = n.namespace_id
    WHERE p.organization_id = $1
      AND p.is_active = TRUE
    ORDER BY p.prefix ASC
  `;

  const result = await pool.query<{ prefix: string; uri: string }>(query, [organizationId]);
  return result.rows;
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
  const pool = getPool();

  const query = `
    DELETE FROM prefix
    WHERE organization_id = $1
      AND prefix = $2
  `;
  const result = await pool.query(query, [organizationId, prefix]);
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
  const pool = getPool();

  const query = `
    SELECT
      p.prefix
      , n.uri
      , COALESCE(n.global_flg, FALSE) AS "globalFlg"
    FROM prefix p
    INNER JOIN namespace n
      ON p.organization_id = n.organization_id
      AND p.namespace_id = n.namespace_id
    WHERE p.organization_id = $1
      AND p.is_active = TRUE
      AND (
            n.global_flg = TRUE
            OR ($2::VARCHAR IS NULL)
            OR n.scope_key = $2
          )
    ORDER BY p.prefix ASC
  `;

  const result = await pool.query(query, [organizationId, orgGroupCd]);
  return result.rows;
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
  const pool = getPool();

  const query = `
    SELECT
      n.namespace_id
      , n.uri
      , n.scope_key
      , COALESCE(n.global_flg, FALSE) AS global_flg
      , ou.user_name
    FROM namespace n
    LEFT JOIN organization_user ou
      ON n.organization_id = ou.organization_id
      AND n.scope_key = ou.user_id
    WHERE n.organization_id = $1
      AND n.scope_key = $2
    ORDER BY n.namespace_id ASC
  `;

  const result = await pool.query(query, [organizationId, scopeKey]);
  return result.rows;
}

/**
 * 全組織の全用語を取得（認証なし用・開発時のみ使用）
 *
 * @returns 用語一覧（フロントエンド用に整形済み）
 */
export async function findAll(): Promise<NamespaceTermRow[]> {
  const pool = getPool();

  const query = `
    SELECT
      t.prefix || ':' || t.localname  AS qname
      , t.prefix                       AS prefix
      , t.localname                    AS "localName"
      , COALESCE(t.display_name, '')   AS "displayName"
      , COALESCE(t.description, '')    AS description
      , COALESCE(t.xsi_type, 'stringType') AS type
      , COALESCE(t.units, '')          AS "unitHint"
    FROM namespace_term t
    WHERE t.is_active = TRUE
    ORDER BY t.prefix ASC, t.localname ASC
  `;

  const result = await pool.query(query);
  return result.rows;
}
