/**
 * namespace_term Repository
 *
 * namespace_termテーブルへのデータアクセスを提供
 *
 * @remarks
 * DDL: docs/design/db/ddl/namespace_term.sql
 * 主キー: (organization_id, prefix, local_name)
 * FK: (organization_id, prefix) → namespace(organization_id, prefix)
 *
 * @module namespaceTermRepository
 * @version 2.0.0
 */

import { getPool } from '../database/db';

/**
 * namespace_term テーブルの型定義
 *
 * @remarks
 * DDL: docs/design/db/ddl/namespace_term.sql
 * 主キー: (organization_id, prefix, local_name)
 */
export interface NamespaceTerm {
  organization_id: string;
  prefix: string;
  local_name: string;
  display_name: string | null;
  description: string | null;
  type_hint: string | null;
  unit_hint: string | null;
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
      t.prefix || ':' || t.local_name  AS qname
      , t.prefix                        AS prefix
      , t.local_name                    AS "localName"
      , COALESCE(t.display_name, '')    AS "displayName"
      , COALESCE(t.description, '')     AS description
      , COALESCE(t.type_hint, 'stringType') AS type
      , COALESCE(t.unit_hint, '')       AS "unitHint"
    FROM namespace_term t
    WHERE t.organization_id = $1
    ORDER BY t.prefix ASC, t.local_name ASC
  `;

  const result = await pool.query(query, [organizationId]);
  return result.rows;
}

/**
 * prefix に対応する namespace が存在するか確認
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
    SELECT 1 FROM namespace
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

  const insertQuery = `
    INSERT INTO namespace_term (
      organization_id
      , prefix
      , local_name
      , display_name
      , description
      , type_hint
      , unit_hint
      , create_at
      , update_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7
      , CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `;

  await pool.query(insertQuery, [
    data.organizationId,
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
      t.prefix || ':' || t.local_name  AS qname
      , t.prefix                        AS prefix
      , t.local_name                    AS "localName"
      , COALESCE(t.display_name, '')    AS "displayName"
      , COALESCE(t.description, '')     AS description
      , COALESCE(t.type_hint, 'stringType') AS type
      , COALESCE(t.unit_hint, '')       AS "unitHint"
    FROM namespace_term t
    WHERE t.organization_id = $1
      AND t.prefix = $2
      AND t.local_name = $3
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
      , type_hint   = $6
      , unit_hint   = $7
      , update_at   = CURRENT_TIMESTAMP
    WHERE organization_id = $1
      AND prefix = $2
      AND local_name = $3
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
      t.prefix || ':' || t.local_name  AS qname
      , t.prefix                        AS prefix
      , t.local_name                    AS "localName"
      , COALESCE(t.display_name, '')    AS "displayName"
      , COALESCE(t.description, '')     AS description
      , COALESCE(t.type_hint, 'stringType') AS type
      , COALESCE(t.unit_hint, '')       AS "unitHint"
    FROM namespace_term t
    WHERE t.organization_id = $1
      AND t.prefix = $2
      AND t.local_name = $3
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
      AND local_name = $3
  `;
  const result = await pool.query(query, [organizationId, prefix, localName]);
  return result.rowCount ?? 0;
}

/**
 * namespace テーブルに1件 INSERT（名前空間の新規登録）
 *
 * @param data - 登録する名前空間データ
 * @returns 登録された namespace_id
 */
export async function createNamespace(data: {
  organizationId: string;
  prefix: string;
  uri: string;
  userId: string;
  departmentCd?: string;
  displayName?: string;
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

  const insertQuery = `
    INSERT INTO namespace (
      organization_id
      , prefix
      , namespace_id
      , department_cd
      , user_id
      , uri
      , global_flg
      , display_name
      , description
      , create_user_id
      , create_at
      , update_user_id
      , update_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, FALSE, $7, $8, $5, CURRENT_TIMESTAMP, $5, CURRENT_TIMESTAMP
    )
    ON CONFLICT (organization_id, prefix) DO NOTHING
  `;

  await pool.query(insertQuery, [
    data.organizationId,
    data.prefix,
    namespaceId,
    data.departmentCd ?? null,
    data.userId,
    data.uri,
    data.displayName ?? null,
    data.description ?? null,
  ]);

  return namespaceId;
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
      t.prefix || ':' || t.local_name  AS qname
      , t.prefix                        AS prefix
      , t.local_name                    AS "localName"
      , COALESCE(t.display_name, '')    AS "displayName"
      , COALESCE(t.description, '')     AS description
      , COALESCE(t.type_hint, 'stringType') AS type
      , COALESCE(t.unit_hint, '')       AS "unitHint"
    FROM namespace_term t
    ORDER BY t.prefix ASC, t.local_name ASC
  `;

  const result = await pool.query(query);
  return result.rows;
}
