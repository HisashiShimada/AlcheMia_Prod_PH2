/**
 * maiml_publish.maiml_material_kv Repository
 *
 * @description maiml_publish.maiml_material_kv テーブルの CRUD 操作
 * @reference docs/MaiML_OpenData_Pipeline/MaiML_OpenData_Pipeline_BasicDesign_v1.3.md § 4.2
 * DDL: backend/migrations/20260310_create_maiml_opendata_tables.sql
 * スキーマ: maiml_publish（公開DB専用スキーマ）
 */

import type { PoolClient } from 'pg';
import { getPool } from '../database/db';
import type { MaimlMaterialKv } from '../types/maimlOpenData';

/**
 * maiml_publish.maiml_material_kv を一括 INSERT する（ON CONFLICT DO NOTHING）
 */
export async function bulkInsert(
  rows: MaimlMaterialKv[],
  client?: PoolClient,
): Promise<void> {
  if (rows.length === 0) return;
  const conn = client ?? getPool();

  const values: unknown[] = [];
  const placeholders: string[] = [];
  let p = 1;

  for (const r of rows) {
    placeholders.push(
      `($${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++})`,
    );
    values.push(
      r.asset_id,
      r.template_id    ?? null,
      r.instruction_id ?? '',   // NOT NULL DEFAULT '' のため null は空文字列に変換
      r.source_section,
      r.path,
      r.key,
      r.idx,
      r.value_text    ?? null,
      r.value_num     ?? null,
      r.unit          ?? null,
      r.value_type    ?? null,
      r.format_string ?? null,
      r.scale_factor  ?? null,
    );
  }

  const query = `
    INSERT INTO maiml_publish.maiml_material_kv (
      asset_id, template_id, instruction_id,
      source_section, path, key, idx,
      value_text, value_num, unit, value_type, format_string, scale_factor
    ) VALUES ${placeholders.join(',')}
    ON CONFLICT DO NOTHING
  `;
  await conn.query(query, values);
}

/**
 * asset_id の maiml_publish.maiml_material_kv を全削除する
 */
export async function deleteByAssetId(
  assetId: number,
  client?: PoolClient,
): Promise<void> {
  const conn = client ?? getPool();
  await conn.query(
    `DELETE FROM maiml_publish.maiml_material_kv WHERE asset_id = $1`,
    [assetId],
  );
}
