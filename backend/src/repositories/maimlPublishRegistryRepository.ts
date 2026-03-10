/**
 * maiml_publish.maiml_publish_registry Repository
 *
 * @description maiml_publish.maiml_publish_registry テーブルの CRUD 操作
 * @reference docs/MaiML_OpenData_Pipeline/MaiML_OpenData_Pipeline_BasicDesign_v1.3.md
 * DDL: backend/migrations/20260310_create_maiml_opendata_tables.sql
 * スキーマ: maiml_publish（公開DB専用スキーマ）
 */

import type { PoolClient } from 'pg';
import { getPool } from '../database/db';
import type { MaimlPublishRegistry } from '../types/maimlOpenData';

/**
 * maiml_publish.maiml_publish_registry を INSERT する
 */
export async function insert(
  data: MaimlPublishRegistry,
  client?: PoolClient,
): Promise<MaimlPublishRegistry> {
  const conn = client ?? getPool();
  const query = `
    INSERT INTO maiml_publish.maiml_publish_registry (
      asset_id, file_uri, status,
      template_only, store_raw_series, store_raw_raster,
      raw_chunk_size, raw_compression, keep_raw_on_unpublish,
      retention_until
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *
  `;
  const result = await conn.query(query, [
    data.asset_id,
    data.file_uri,
    data.status,
    data.template_only,
    data.store_raw_series,
    data.store_raw_raster,
    data.raw_chunk_size,
    data.raw_compression,
    data.keep_raw_on_unpublish,
    data.retention_until ?? null,
  ]);
  return result.rows[0] as MaimlPublishRegistry;
}

/**
 * registry の status を更新する
 */
export async function updateStatus(
  registryId: number,
  status: MaimlPublishRegistry['status'],
  client?: PoolClient,
): Promise<void> {
  const conn = client ?? getPool();
  await conn.query(
    `UPDATE maiml_publish.maiml_publish_registry
     SET status = $1, updated_at = now()
     WHERE registry_id = $2`,
    [status, registryId],
  );
}

/**
 * asset_id で最新の maiml_publish.maiml_publish_registry を取得する
 */
export async function findByAssetId(
  assetId: number,
  client?: PoolClient,
): Promise<MaimlPublishRegistry | null> {
  const conn = client ?? getPool();
  const result = await conn.query(
    `SELECT * FROM maiml_publish.maiml_publish_registry
     WHERE asset_id = $1
     ORDER BY registry_id DESC
     LIMIT 1`,
    [assetId],
  );
  return (result.rows[0] as MaimlPublishRegistry) ?? null;
}

