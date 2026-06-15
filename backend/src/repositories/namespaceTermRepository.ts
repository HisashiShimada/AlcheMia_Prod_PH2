/**
 * namespace_term Repository
 *
 * namespace_termテーブルへのデータアクセスを提供
 *
 * @module namespaceTermRepository
 * @version 1.0.0
 */

import { getPool } from '../database/db';

/**
 * namespace_term テーブルの型定義
 *
 * @remarks
 * DDL: docs/design/db/ddl/namespace_term.sql
 * 主キー: id (UUID)
 */
export interface NamespaceTerm {
  id: string;
  namespace_id: string;
  local_name: string;
  display_name_ja: string | null;
  display_name_en: string | null;
  description: string | null;
  type_hint: string | null;
  unit_hint: string | null;
  create_at: Date | null;
  update_at: Date | null;
}

/**
 * API レスポンス用の用語型（フロントエンドの Term 型に対応）
 */
export interface NamespaceTermRow {
  id: string;
  qname: string;
  prefix: string;
  localName: string;
  displayName: string;
  displayNameEn: string;
  description: string;
  type: string;
  unitHint: string;
}

/**
 * 組織に紐づく全用語を namespace テーブルと JOIN して取得
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
      t.id
      , n.prefix || ':' || t.local_name AS qname
      , n.prefix                         AS prefix
      , t.local_name                     AS "localName"
      , COALESCE(t.display_name_ja, '')  AS "displayName"
      , COALESCE(t.display_name_en, '')  AS "displayNameEn"
      , COALESCE(t.description, '')      AS description
      , COALESCE(t.type_hint, 'stringType') AS type
      , COALESCE(t.unit_hint, '')        AS "unitHint"
    FROM namespace_term t
    INNER JOIN namespace n ON t.namespace_id = n.id
    WHERE n.organization_id = $1
    ORDER BY n.prefix ASC, t.local_name ASC
  `;

  const result = await pool.query(query, [organizationId]);
  return result.rows;
}

/**
 * prefix から namespace.id を取得
 *
 * @param prefix - 名前空間の接頭辞
 * @returns namespace の id（UUID）、見つからない場合は null
 */
export async function findNamespaceIdByPrefix(
  prefix: string
): Promise<string | null> {
  const pool = getPool();

  const query = `
    SELECT id FROM namespace WHERE prefix = $1 LIMIT 1
  `;

  const result = await pool.query(query, [prefix]);
  return result.rows[0]?.id ?? null;
}

/**
 * namespace_term に1件 INSERT
 *
 * @param data - 登録する用語データ
 * @returns 登録された用語（フロントエンド用に整形済み）
 */
export async function create(data: {
  namespaceId: string;
  localName: string;
  displayNameJa?: string;
  displayNameEn?: string;
  description?: string;
  typeHint?: string;
  unitHint?: string;
}): Promise<NamespaceTermRow> {
  const pool = getPool();

  const insertQuery = `
    INSERT INTO namespace_term (
      id
      , namespace_id
      , local_name
      , display_name_ja
      , display_name_en
      , description
      , type_hint
      , unit_hint
      , create_at
      , update_at
    ) VALUES (
      gen_random_uuid()
      , $1, $2, $3, $4, $5, $6, $7
      , CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    RETURNING id, namespace_id
  `;

  const inserted = await pool.query(insertQuery, [
    data.namespaceId,
    data.localName,
    data.displayNameJa ?? null,
    data.displayNameEn ?? null,
    data.description ?? null,
    data.typeHint ?? null,
    data.unitHint ?? null,
  ]);

  const { id } = inserted.rows[0];

  // 登録後、JOIN してフロントエンド用フォーマットで返す
  const selectQuery = `
    SELECT
      t.id
      , n.prefix || ':' || t.local_name AS qname
      , n.prefix                         AS prefix
      , t.local_name                     AS "localName"
      , COALESCE(t.display_name_ja, '')  AS "displayName"
      , COALESCE(t.display_name_en, '')  AS "displayNameEn"
      , COALESCE(t.description, '')      AS description
      , COALESCE(t.type_hint, 'stringType') AS type
      , COALESCE(t.unit_hint, '')        AS "unitHint"
    FROM namespace_term t
    INNER JOIN namespace n ON t.namespace_id = n.id
    WHERE t.id = $1
  `;

  const result = await pool.query(selectQuery, [id]);
  return result.rows[0];
}

/**
 * namespace_term を更新（UPDATE）
 *
 * @param id - 対象の用語ID
 * @param data - 更新するフィールド
 * @returns 更新後の用語（フロントエンド用に整形済み）
 */
export async function update(
  id: string,
  data: {
    localName?: string;
    displayNameJa?: string;
    displayNameEn?: string;
    description?: string;
    typeHint?: string;
    unitHint?: string;
  }
): Promise<NamespaceTermRow | null> {
  const pool = getPool();

  const updateQuery = `
    UPDATE namespace_term SET
      local_name       = COALESCE($2, local_name)
      , display_name_ja = $3
      , display_name_en = $4
      , description     = $5
      , type_hint       = $6
      , unit_hint       = $7
      , update_at       = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id
  `;

  const result = await pool.query(updateQuery, [
    id,
    data.localName ?? null,
    data.displayNameJa ?? null,
    data.displayNameEn ?? null,
    data.description ?? null,
    data.typeHint ?? null,
    data.unitHint ?? null,
  ]);

  if (result.rowCount === 0) return null;

  // 更新後、JOIN してフロントエンド用フォーマットで返す
  const selectQuery = `
    SELECT
      t.id
      , n.prefix || ':' || t.local_name AS qname
      , n.prefix                         AS prefix
      , t.local_name                     AS "localName"
      , COALESCE(t.display_name_ja, '')  AS "displayName"
      , COALESCE(t.display_name_en, '')  AS "displayNameEn"
      , COALESCE(t.description, '')      AS description
      , COALESCE(t.type_hint, 'stringType') AS type
      , COALESCE(t.unit_hint, '')        AS "unitHint"
    FROM namespace_term t
    INNER JOIN namespace n ON t.namespace_id = n.id
    WHERE t.id = $1
  `;

  const updated = await pool.query(selectQuery, [id]);
  return updated.rows[0] ?? null;
}

/**
 * namespace_term を削除（DELETE）
 *
 * @param id - 対象の用語ID
 * @returns 削除件数（0 = 対象なし）
 */
export async function remove(id: string): Promise<number> {
  const pool = getPool();

  const query = `DELETE FROM namespace_term WHERE id = $1`;
  const result = await pool.query(query, [id]);
  return result.rowCount ?? 0;
}

/**
 * 全組織の全用語を namespace テーブルと JOIN して取得（認証なし用）
 *
 * @returns 用語一覧（フロントエンド用に整形済み）
 */
export async function findAll(): Promise<NamespaceTermRow[]> {
  const pool = getPool();

  const query = `
    SELECT
      t.id
      , n.prefix || ':' || t.local_name AS qname
      , n.prefix                         AS prefix
      , t.local_name                     AS "localName"
      , COALESCE(t.display_name_ja, '')  AS "displayName"
      , COALESCE(t.display_name_en, '')  AS "displayNameEn"
      , COALESCE(t.description, '')      AS description
      , COALESCE(t.type_hint, 'stringType') AS type
      , COALESCE(t.unit_hint, '')        AS "unitHint"
    FROM namespace_term t
    INNER JOIN namespace n ON t.namespace_id = n.id
    ORDER BY n.prefix ASC, t.local_name ASC
  `;

  const result = await pool.query(query);
  return result.rows;
}
