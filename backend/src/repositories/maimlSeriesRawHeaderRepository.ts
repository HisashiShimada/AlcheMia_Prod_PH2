/**
 * maiml_publish.maiml_series_raw_header / maiml_publish.maiml_series_raw_chunk Repository
 *
 * @description 生データヘッダー・チャンクテーブルの CRUD 操作
 * @reference docs/MaiML_OpenData_Pipeline/MaiML_OpenData_Pipeline_BasicDesign_v1.3.md § 6
 * DDL: backend/migrations/20260310_create_maiml_opendata_tables.sql
 * スキーマ: maiml_publish（公開DB専用スキーマ）
 */

import type { PoolClient } from 'pg';
import { getPool } from '../database/db';
import type { MaimlSeriesRawHeader, MaimlSeriesRawChunk } from '../types/maimlOpenData';

/**
 * maiml_publish.maiml_series_raw_header を INSERT する
 */
export async function insertHeader(
  data: MaimlSeriesRawHeader,
  client?: PoolClient,
): Promise<MaimlSeriesRawHeader> {
  const conn = client ?? getPool();
  const query = `
    INSERT INTO maiml_publish.maiml_series_raw_header (
      asset_id, instruction_id, template_id,
      result_id, result_name, content_id, content_size,
      x_label, y_label, x_unit, y_unit,
      points_total, chunk_count, storage_format, compression, checksum_sha256
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    RETURNING *
  `;
  const result = await conn.query(query, [
    data.asset_id,
    data.instruction_id  ?? null,
    data.template_id     ?? null,
    data.result_id       ?? null,
    data.result_name     ?? null,
    data.content_id,
    data.content_size    ?? null,
    data.x_label         ?? null,
    data.y_label         ?? null,
    data.x_unit          ?? null,
    data.y_unit          ?? null,
    data.points_total,
    data.chunk_count,
    data.storage_format,
    data.compression,
    data.checksum_sha256 ?? null,
  ]);
  return result.rows[0] as MaimlSeriesRawHeader;
}

/**
 * maiml_publish.maiml_series_raw_chunk (Array方式) を一括 INSERT する
 */
export async function bulkInsertChunks(
  rows: MaimlSeriesRawChunk[],
  client?: PoolClient,
): Promise<void> {
  if (rows.length === 0) return;
  const conn = client ?? getPool();

  const values: unknown[] = [];
  const placeholders: string[] = [];
  let p = 1;

  for (const r of rows) {
    placeholders.push(
      `($${p++},$${p++},$${p++},$${p++},$${p++},$${p++})`,
    );
    values.push(
      r.raw_id,
      r.chunk_index,
      r.point_offset,
      r.point_count,
      r.x_chunk,
      r.y_chunk,
    );
  }

  const query = `
    INSERT INTO maiml_publish.maiml_series_raw_chunk (
      raw_id, chunk_index, point_offset, point_count, x_chunk, y_chunk
    ) VALUES ${placeholders.join(',')}
  `;
  await conn.query(query, values);
}

/**
 * asset_id の生データ（header + chunk）を全削除する
 * chunk は header の CASCADE DELETE で削除される
 */
export async function deleteByAssetId(
  assetId: number,
  client?: PoolClient,
): Promise<void> {
  const conn = client ?? getPool();
  await conn.query(
    `DELETE FROM maiml_publish.maiml_series_raw_header WHERE asset_id = $1`,
    [assetId],
  );
}
