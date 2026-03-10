/**
 * maiml_publish.maiml_asset Repository
 *
 * @description maiml_publish.maiml_asset テーブルの CRUD 操作
 * @reference docs/MaiML_OpenData_Pipeline/MaiML_OpenData_Pipeline_BasicDesign_v1.3.md
 * DDL: backend/migrations/20260310_create_maiml_opendata_tables.sql
 * スキーマ: maiml_publish（公開DB専用スキーマ）
 */

import type { PoolClient } from 'pg';
import { getPool } from '../database/db';
import type { MaimlAsset } from '../types/maimlOpenData';

/**
 * maiml_publish.maiml_asset を INSERT する
 */
export async function insert(
  data: MaimlAsset,
  client?: PoolClient,
): Promise<MaimlAsset> {
  const conn = client ?? getPool();
  const query = `
    INSERT INTO maiml_publish.maiml_asset (organization_id, file_uri, doc_name, template_only)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const result = await conn.query(query, [
    data.organization_id,
    data.file_uri,
    data.doc_name ?? null,
    data.template_only,
  ]);
  return result.rows[0] as MaimlAsset;
}

/**
 * maiml_publish.maiml_asset の doc_name を更新する
 */
export async function updateDocName(
  assetId: number,
  docName: string,
  client?: PoolClient,
): Promise<void> {
  const conn = client ?? getPool();
  await conn.query(
    `UPDATE maiml_publish.maiml_asset SET doc_name = $1, updated_at = now() WHERE asset_id = $2`,
    [docName, assetId],
  );
}

/**
 * asset_id で maiml_publish.maiml_asset を取得する
 */
export async function findById(
  assetId: number,
  client?: PoolClient,
): Promise<MaimlAsset | null> {
  const conn = client ?? getPool();
  const result = await conn.query(
    `SELECT * FROM maiml_publish.maiml_asset WHERE asset_id = $1`,
    [assetId],
  );
  return (result.rows[0] as MaimlAsset) ?? null;
}

/**
 * organization_id + file_uri で maiml_publish.maiml_asset を取得する
 */
export async function findByUri(
  organizationId: string,
  fileUri: string,
  client?: PoolClient,
): Promise<MaimlAsset | null> {
  const conn = client ?? getPool();
  const result = await conn.query(
    `SELECT * FROM maiml_publish.maiml_asset
     WHERE organization_id = $1 AND file_uri = $2
     LIMIT 1`,
    [organizationId, fileUri],
  );
  return (result.rows[0] as MaimlAsset) ?? null;
}

/**
 * maiml_publish.maiml_asset を削除する（CASCADE DELETE で関連テーブルも削除）
 */
export async function deleteById(
  assetId: number,
  client?: PoolClient,
): Promise<void> {
  const conn = client ?? getPool();
  await conn.query(
    `DELETE FROM maiml_publish.maiml_asset WHERE asset_id = $1`,
    [assetId],
  );
}
