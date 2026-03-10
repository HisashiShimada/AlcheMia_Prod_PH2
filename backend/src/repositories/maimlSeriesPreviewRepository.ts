/**
 * maiml_publish.maiml_series_preview Repository
 *
 * @description maiml_publish.maiml_series_preview テーブルの CRUD 操作
 * @reference docs/MaiML_OpenData_Pipeline/MaiML_OpenData_Pipeline_BasicDesign_v1.3.md § 5.4
 * DDL: backend/migrations/20260310_create_maiml_opendata_tables.sql
 * スキーマ: maiml_publish（公開DB専用スキーマ）
 */

import type { PoolClient } from 'pg';
import { getPool } from '../database/db';
import type { MaimlSeriesPreview } from '../types/maimlOpenData';

/**
 * maiml_publish.maiml_series_preview を一括 INSERT する
 */
export async function bulkInsert(
  rows: MaimlSeriesPreview[],
  client?: PoolClient,
): Promise<void> {
  if (rows.length === 0) return;
  const conn = client ?? getPool();

  const values: unknown[] = [];
  const placeholders: string[] = [];
  let p = 1;

  for (const r of rows) {
    placeholders.push(
      `($${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++})`,
    );
    values.push(
      r.asset_id,
      r.instruction_id ?? null,
      r.template_id    ?? null,
      r.result_id      ?? null,
      r.result_name    ?? null,
      r.content_id     ?? null,
      r.content_size   ?? null,
      r.series_type,
      r.x_label,
      r.y_label,
      r.mode,
      JSON.stringify(r.params),
      r.original_points,
      r.preview_points,
      r.x,
      r.y,
      r.x_min ?? null,
      r.x_max ?? null,
      r.y_min ?? null,
      r.y_max ?? null,
      r.quality ? JSON.stringify(r.quality) : null,
    );
  }

  const query = `
    INSERT INTO maiml_publish.maiml_series_preview (
      asset_id, instruction_id, template_id,
      result_id, result_name, content_id, content_size,
      series_type, x_label, y_label,
      mode, params, original_points, preview_points,
      x, y, x_min, x_max, y_min, y_max, quality
    ) VALUES ${placeholders.join(',')}
  `;
  await conn.query(query, values);
}

/**
 * asset_id の maiml_publish.maiml_series_preview を全削除する
 */
export async function deleteByAssetId(
  assetId: number,
  client?: PoolClient,
): Promise<void> {
  const conn = client ?? getPool();
  await conn.query(
    `DELETE FROM maiml_publish.maiml_series_preview WHERE asset_id = $1`,
    [assetId],
  );
}
