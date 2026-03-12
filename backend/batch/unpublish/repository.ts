/**
 * DBアクセス層（非公開バッチ専用）
 *
 * backend/src/ には依存せず、このバッチ内で完結する独立実装。
 * スキーマ: maiml_publish
 * DDL: backend/migrations/20260310_create_maiml_opendata_tables.sql
 */

import type { Pool, PoolClient } from 'pg';

// ============================================================
// 型定義
// ============================================================

/** maiml_publish_registry の必要カラムのみ */
export interface DueAsset {
  registry_id:           number;
  asset_id:              number;
  keep_raw_on_unpublish: boolean;
}

/** maiml_publish_registry の必要カラムのみ */
export interface RegistryRow {
  registry_id:           number;
  asset_id:              number;
  status:                string;
  keep_raw_on_unpublish: boolean;
}

// ============================================================
// 参照系
// ============================================================

/**
 * retention_until が現在日時以前かつ status='published' のアセットを返す
 *
 * @param pool - pg.Pool
 * @returns 期限切れアセットの一覧
 */
export async function findDueAssets(pool: Pool): Promise<DueAsset[]> {
  const result = await pool.query<DueAsset>(`
    SELECT
      registry_id,
      asset_id,
      keep_raw_on_unpublish
    FROM maiml_publish.maiml_publish_registry
    WHERE status = 'published'
      AND retention_until IS NOT NULL
      AND retention_until <= now()
    ORDER BY registry_id ASC
  `);
  return result.rows;
}

/**
 * asset_id で maiml_publish_registry を取得する
 *
 * @param pool - pg.Pool
 * @param assetId - 対象 asset_id
 */
export async function findRegistryByAssetId(
  pool: Pool,
  assetId: number,
): Promise<RegistryRow | null> {
  const result = await pool.query<RegistryRow>(`
    SELECT registry_id, asset_id, status, keep_raw_on_unpublish
    FROM maiml_publish.maiml_publish_registry
    WHERE asset_id = $1
    ORDER BY registry_id DESC
    LIMIT 1
  `, [assetId]);
  return result.rows[0] ?? null;
}

// ============================================================
// 削除系（keep_meta モード用）
// ============================================================

/**
 * maiml_condition_kv を asset_id で削除する
 */
export async function deleteConditionKv(
  client: PoolClient,
  assetId: number,
): Promise<void> {
  await client.query(
    `DELETE FROM maiml_publish.maiml_condition_kv WHERE asset_id = $1`,
    [assetId],
  );
}

/**
 * maiml_material_kv を asset_id で削除する
 */
export async function deleteMaterialKv(
  client: PoolClient,
  assetId: number,
): Promise<void> {
  await client.query(
    `DELETE FROM maiml_publish.maiml_material_kv WHERE asset_id = $1`,
    [assetId],
  );
}

/**
 * maiml_series_preview を asset_id で削除する
 */
export async function deletePreview(
  client: PoolClient,
  assetId: number,
): Promise<void> {
  await client.query(
    `DELETE FROM maiml_publish.maiml_series_preview WHERE asset_id = $1`,
    [assetId],
  );
}

/**
 * maiml_series_raw_header を asset_id で削除する
 * （CASCADE DELETE により maiml_series_raw_chunk / maiml_series_raw_chunk_bin も削除される）
 */
export async function deleteRawHeader(
  client: PoolClient,
  assetId: number,
): Promise<void> {
  await client.query(
    `DELETE FROM maiml_publish.maiml_series_raw_header WHERE asset_id = $1`,
    [assetId],
  );
}

/**
 * maiml_publish_registry の status を更新する
 */
export async function updateRegistryStatus(
  client: PoolClient,
  registryId: number,
  status: 'unpublished',
): Promise<void> {
  await client.query(
    `UPDATE maiml_publish.maiml_publish_registry
     SET status = $1, updated_at = now()
     WHERE registry_id = $2`,
    [status, registryId],
  );
}

// ============================================================
// 削除系（full_delete モード用）
// ============================================================

/**
 * maiml_asset を asset_id で削除する
 * （CASCADE DELETE により全関連テーブルも削除される）
 */
export async function deleteAsset(
  client: PoolClient,
  assetId: number,
): Promise<void> {
  await client.query(
    `DELETE FROM maiml_publish.maiml_asset WHERE asset_id = $1`,
    [assetId],
  );
}
