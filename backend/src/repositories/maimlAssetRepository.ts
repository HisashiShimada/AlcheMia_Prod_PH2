/**
 * MaiML Asset Repository
 *
 * @description 組織スキーマ内の maiml_asset 関連テーブルの操作
 * @reference docs/MaiML_OpenData_Pipeline/db.md §4
 */

import * as fs from 'fs';
import * as path from 'path';
import { getPgp } from '../database/db';
import {
  MaimlAsset,
  MaimlInstance,
  MaimlElement,
  MaimlElementValue,
  MaimlInsertion,
  MaimlTemplate,
  MaimlTemplateElement,
  MaimlTemplateElementValue,
  MaimlTemplateInsertion,
  MaimlEvent,
  MaimlEventElement,
  MaimlEventElementValue,
} from '../types/maimlOpenData';

// ============================================================
// ユーティリティ
// ============================================================

/**
 * organization_id を PostgreSQL スキーマ名に変換する
 * ハイフンをアンダースコアに置換するだけ
 */
export function toSchemaName(organizationId: string): string {
  return organizationId.replace(/-/g, '_');
}

/**
 * スキーマ名の安全チェック（SQL インジェクション対策）
 * UUID ハイフンを _ に変換した文字列のみ許可
 */
function validateSchemaName(schemaName: string): void {
  if (!/^[0-9a-f_]+$/i.test(schemaName)) {
    throw new Error(`不正なスキーマ名: ${schemaName}`);
  }
}

// ============================================================
// スキーマ・テーブル管理
// ============================================================

/**
 * 組織スキーマが存在しない場合は作成する
 *
 * @param organizationId - 組織 ID
 * @param organizationCd - スキーマ COMMENT に設定する組織コード
 */
export async function createSchemaIfNotExists(
  organizationId: string,
  organizationCd: string
): Promise<void> {
  const pgp = getPgp();
  const schemaName = toSchemaName(organizationId);
  validateSchemaName(schemaName);

  await pgp.none(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
  await pgp.none(
    `COMMENT ON SCHEMA "${schemaName}" IS $1`,
    [organizationCd]
  );
}

/**
 * 組織スキーマ内に maiml_* テーブル群を作成する
 *
 * @param organizationId - 組織 ID
 */
export async function createSchemaTables(organizationId: string): Promise<void> {
  const schemaName = toSchemaName(organizationId);
  validateSchemaName(schemaName);

  // DDL テンプレートを読み込んでスキーマ名を置換
  const ddlPath = path.resolve(
    __dirname,
    '../sql/ddl/org_schema_tables.sql'
  );
  const ddlTemplate = fs.readFileSync(ddlPath, 'utf-8');
  const ddl = ddlTemplate.replace(/\{\{SCHEMA_NAME\}\}/g, schemaName);

  const pgp = getPgp();
  await pgp.none(ddl);
}

/**
 * 組織スキーマが存在するか確認する
 *
 * @param organizationId - 組織 ID
 * @returns スキーマが存在すれば true
 */
export async function schemaExists(organizationId: string): Promise<boolean> {
  const pgp = getPgp();
  const schemaName = toSchemaName(organizationId);
  validateSchemaName(schemaName);

  const row = await pgp.oneOrNone<{ exists: boolean }>(
    `SELECT 1 as exists FROM information_schema.schemata WHERE schema_name = $1`,
    [schemaName]
  );
  return row !== null;
}

// ============================================================
// maiml_asset
// ============================================================

/**
 * プロジェクト名（file_uri の接頭辞）で公開済みアセットを検索する
 *
 * @param organizationId - 組織 ID
 * @param projectName - プロジェクト名
 * @returns 最初に見つかったアセット（なければ null）
 */
export async function findByProject(
  organizationId: string,
  projectName:    string
): Promise<MaimlAsset | null> {
  const pgp = getPgp();
  const schemaName = toSchemaName(organizationId);
  validateSchemaName(schemaName);

  return await pgp.oneOrNone<MaimlAsset>(
    `SELECT * FROM "${schemaName}".maiml_asset WHERE file_uri LIKE $1 LIMIT 1`,
    [`projects/${projectName}/%`]
  );
}

/**
 * maiml_asset を INSERT する
 *
 * @param organizationId - 組織 ID
 * @param data - 挿入データ（asset_id は自動採番）
 * @returns INSERT されたレコード
 */
export async function insertAsset(
  organizationId: string,
  data: Omit<MaimlAsset, 'asset_id' | 'created_at' | 'updated_at'>
): Promise<MaimlAsset> {
  const pgp = getPgp();
  const schemaName = toSchemaName(organizationId);
  validateSchemaName(schemaName);

  return await pgp.one<MaimlAsset>(
    `INSERT INTO "${schemaName}".maiml_asset (file_uri, doc_name, retention_until)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [data.file_uri, data.doc_name ?? null, data.retention_until]
  );
}

/**
 * maiml_asset を CASCADE DELETE する
 *
 * @param organizationId - 組織 ID
 * @param assetId - 削除対象の asset_id
 */
export async function deleteAsset(
  organizationId: string,
  assetId:        bigint
): Promise<void> {
  const pgp = getPgp();
  const schemaName = toSchemaName(organizationId);
  validateSchemaName(schemaName);

  await pgp.none(
    `DELETE FROM "${schemaName}".maiml_asset WHERE asset_id = $1`,
    [assetId]
  );
}

// ============================================================
// maiml_instance
// ============================================================

/**
 * maiml_instance を INSERT する
 */
export async function insertInstance(
  organizationId: string,
  data: Omit<MaimlInstance, 'instance_id'>
): Promise<MaimlInstance> {
  const pgp = getPgp();
  const schemaName = toSchemaName(organizationId);
  validateSchemaName(schemaName);

  return await pgp.one<MaimlInstance>(
    `INSERT INTO "${schemaName}".maiml_instance
       (asset_id, instance_type, instance_key, template_ref,
        instance_uuid, instance_name, instance_line_no)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      data.asset_id,
      data.instance_type,
      data.instance_key,
      data.template_ref ?? null,
      data.instance_uuid ?? null,
      data.instance_name ?? null,
      data.instance_line_no ?? null,
    ]
  );
}

// ============================================================
// maiml_element
// ============================================================

/**
 * maiml_element を INSERT する
 */
export async function insertElement(
  organizationId: string,
  data: Omit<MaimlElement, 'element_id'>
): Promise<MaimlElement> {
  const pgp = getPgp();
  const schemaName = toSchemaName(organizationId);
  validateSchemaName(schemaName);

  return await pgp.one<MaimlElement>(
    `INSERT INTO "${schemaName}".maiml_element
       (instance_id, parent_element_id, hierarchy, element_type,
        description, element_data, hash_method, xsi_type, key,
        format_string, units, scale_factor, axis, size_value,
        element_id_attr, element_ref, maiml_line_no)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     RETURNING *`,
    [
      data.instance_id,
      data.parent_element_id ?? null,
      data.hierarchy,
      data.element_type,
      data.description ?? null,
      data.element_data ?? null,
      data.hash_method ?? null,
      data.xsi_type ?? null,
      data.key ?? null,
      data.format_string ?? null,
      data.units ?? null,
      data.scale_factor ?? null,
      data.axis ?? null,
      data.size_value ?? null,
      data.element_id_attr ?? null,
      data.element_ref ?? null,
      data.maiml_line_no ?? null,
    ]
  );
}

// ============================================================
// maiml_element_value
// ============================================================

/**
 * maiml_element_value を INSERT する
 */
export async function insertElementValue(
  organizationId: string,
  data: Omit<MaimlElementValue, 'value_id'>
): Promise<MaimlElementValue> {
  const pgp = getPgp();
  const schemaName = toSchemaName(organizationId);
  validateSchemaName(schemaName);

  return await pgp.one<MaimlElementValue>(
    `INSERT INTO "${schemaName}".maiml_element_value
       (element_id, value_idx, value, value_array)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      data.element_id,
      data.value_idx,
      data.value ?? null,
      data.value_array ?? null,
    ]
  );
}

// ============================================================
// maiml_insertion
// ============================================================

/**
 * maiml_insertion を INSERT する
 */
export async function insertInsertion(
  organizationId: string,
  data: Omit<MaimlInsertion, 'insertion_id'>
): Promise<MaimlInsertion> {
  const pgp = getPgp();
  const schemaName = toSchemaName(organizationId);
  validateSchemaName(schemaName);

  return await pgp.one<MaimlInsertion>(
    `INSERT INTO "${schemaName}".maiml_insertion
       (instance_id, uri, hash_value, hash_method, file_uuid, mime_format, maiml_line_no)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      data.instance_id,
      data.uri,
      data.hash_value ?? null,
      data.hash_method ?? null,
      data.file_uuid ?? null,
      data.mime_format ?? null,
      data.maiml_line_no ?? null,
    ]
  );
}

// ============================================================
// maiml_template
// ============================================================

/**
 * maiml_template を INSERT する
 */
export async function insertTemplate(
  organizationId: string,
  data: Omit<MaimlTemplate, 'template_id'>
): Promise<MaimlTemplate> {
  const pgp = getPgp();
  const schemaName = toSchemaName(organizationId);
  validateSchemaName(schemaName);

  return await pgp.one<MaimlTemplate>(
    `INSERT INTO "${schemaName}".maiml_template
       (asset_id, template_type, template_key, template_uuid,
        template_name, template_line_no)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.asset_id,
      data.template_type,
      data.template_key,
      data.template_uuid ?? null,
      data.template_name ?? null,
      data.template_line_no ?? null,
    ]
  );
}

// ============================================================
// maiml_template_element
// ============================================================

/**
 * maiml_template_element を INSERT する
 */
export async function insertTemplateElement(
  organizationId: string,
  data: Omit<MaimlTemplateElement, 'element_id'>
): Promise<MaimlTemplateElement> {
  const pgp = getPgp();
  const schemaName = toSchemaName(organizationId);
  validateSchemaName(schemaName);

  return await pgp.one<MaimlTemplateElement>(
    `INSERT INTO "${schemaName}".maiml_template_element
       (template_id, parent_element_id, hierarchy, element_type,
        description, element_data, hash_method, xsi_type, key,
        format_string, units, scale_factor, axis, size_value,
        element_id_attr, element_ref, maiml_line_no)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     RETURNING *`,
    [
      data.template_id,
      data.parent_element_id ?? null,
      data.hierarchy,
      data.element_type,
      data.description ?? null,
      data.element_data ?? null,
      data.hash_method ?? null,
      data.xsi_type ?? null,
      data.key ?? null,
      data.format_string ?? null,
      data.units ?? null,
      data.scale_factor ?? null,
      data.axis ?? null,
      data.size_value ?? null,
      data.element_id_attr ?? null,
      data.element_ref ?? null,
      data.maiml_line_no ?? null,
    ]
  );
}

// ============================================================
// maiml_template_element_value
// ============================================================

/**
 * maiml_template_element_value を INSERT する
 */
export async function insertTemplateElementValue(
  organizationId: string,
  data: Omit<MaimlTemplateElementValue, 'value_id'>
): Promise<MaimlTemplateElementValue> {
  const pgp = getPgp();
  const schemaName = toSchemaName(organizationId);
  validateSchemaName(schemaName);

  return await pgp.one<MaimlTemplateElementValue>(
    `INSERT INTO "${schemaName}".maiml_template_element_value
       (element_id, value_idx, value, value_array)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      data.element_id,
      data.value_idx,
      data.value ?? null,
      data.value_array ?? null,
    ]
  );
}

// ============================================================
// maiml_template_insertion
// ============================================================

/**
 * maiml_template_insertion を INSERT する
 */
export async function insertTemplateInsertion(
  organizationId: string,
  data: Omit<MaimlTemplateInsertion, 'insertion_id'>
): Promise<MaimlTemplateInsertion> {
  const pgp = getPgp();
  const schemaName = toSchemaName(organizationId);
  validateSchemaName(schemaName);

  return await pgp.one<MaimlTemplateInsertion>(
    `INSERT INTO "${schemaName}".maiml_template_insertion
       (template_id, uri, hash_value, hash_method, file_uuid, mime_format, maiml_line_no)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      data.template_id,
      data.uri,
      data.hash_value ?? null,
      data.hash_method ?? null,
      data.file_uuid ?? null,
      data.mime_format ?? null,
      data.maiml_line_no ?? null,
    ]
  );
}

// ============================================================
// maiml_event（eventLog 層）
// ============================================================

/**
 * maiml_event を INSERT する
 *
 * @reference docs/MaiML_OpenData_Pipeline/db.md §7.2
 */
export async function insertEvent(
  organizationId: string,
  data: Omit<MaimlEvent, 'event_id'>
): Promise<MaimlEvent> {
  const pgp = getPgp();
  const schemaName = toSchemaName(organizationId);
  validateSchemaName(schemaName);

  return await pgp.one<MaimlEvent>(
    `INSERT INTO "${schemaName}".maiml_event
       (asset_id, event_key, results_ref, instruction_ref,
        event_uuid, event_name, description, annotation, maiml_line_no)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      data.asset_id,
      data.event_key       ?? null,
      data.results_ref     ?? null,
      data.instruction_ref ?? null,
      data.event_uuid      ?? null,
      data.event_name      ?? null,
      data.description     ?? null,
      data.annotation      ?? null,
      data.maiml_line_no   ?? null,
    ]
  );
}

// ============================================================
// maiml_event_element（eventLog 層）
// ============================================================

/**
 * maiml_event_element を INSERT する
 */
export async function insertEventElement(
  organizationId: string,
  data: Omit<MaimlEventElement, 'event_element_id'>
): Promise<MaimlEventElement> {
  const pgp = getPgp();
  const schemaName = toSchemaName(organizationId);
  validateSchemaName(schemaName);

  return await pgp.one<MaimlEventElement>(
    `INSERT INTO "${schemaName}".maiml_event_element
       (event_id, hierarchy, element_type,
        description, xsi_type, key, format_string, units, scale_factor,
        axis, size_value, element_id_attr, element_ref, maiml_line_no)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      data.event_id,
      data.hierarchy,
      data.element_type,
      data.description    ?? null,
      data.xsi_type       ?? null,
      data.key            ?? null,
      data.format_string  ?? null,
      data.units          ?? null,
      data.scale_factor   ?? null,
      data.axis           ?? null,
      data.size_value     ?? null,
      data.element_id_attr ?? null,
      data.element_ref    ?? null,
      data.maiml_line_no  ?? null,
    ]
  );
}

// ============================================================
// maiml_event_element_value（eventLog 層）
// ============================================================

/**
 * maiml_event_element_value を INSERT する
 */
export async function insertEventElementValue(
  organizationId: string,
  data: Omit<MaimlEventElementValue, 'value_id'>
): Promise<MaimlEventElementValue> {
  const pgp = getPgp();
  const schemaName = toSchemaName(organizationId);
  validateSchemaName(schemaName);

  return await pgp.one<MaimlEventElementValue>(
    `INSERT INTO "${schemaName}".maiml_event_element_value
       (event_element_id, value_idx, value, value_array)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      data.event_element_id,
      data.value_idx,
      data.value       ?? null,
      data.value_array ?? null,
    ]
  );
}

// ============================================================
// Scanner Worker 用: 期限切れアセット一覧取得
// ============================================================

/**
 * 組織スキーマから retention_until を持つ全アセットを取得する
 *
 * @param organizationId - 組織 ID
 * @returns アセット一覧（retention_until 付き）
 */
export async function findAllWithRetention(
  organizationId: string
): Promise<MaimlAsset[]> {
  const pgp = getPgp();
  const schemaName = toSchemaName(organizationId);
  validateSchemaName(schemaName);

  return await pgp.any<MaimlAsset>(
    `SELECT * FROM "${schemaName}".maiml_asset WHERE retention_until IS NOT NULL`
  );
}

/**
 * 全組織スキーマを横断して retention_until IS NOT NULL のアセットを返す
 *
 * @description
 *   pg_catalog.pg_namespace から組織スキーマ（nspname が UUID 形式）を検索し、
 *   各スキーマの maiml_asset テーブルを動的クエリで横断する。
 *
 * @returns { organization_id, asset_id, retention_until }[] の配列
 */
export async function findAllWithRetentionUntil(): Promise<
  { organization_id: string; asset_id: bigint; retention_until: Date }[]
> {
  const pgp = getPgp();

  // UUID をアンダースコア区切りに変換したスキーマ名を持つ全スキーマを取得
  // スキーマ名パターン: xxxxxxxx_xxxx_xxxx_xxxx_xxxxxxxxxxxx （UUID の - を _ に変換）
  const schemas = await pgp.any<{ nspname: string }>(
    `SELECT nspname
     FROM pg_catalog.pg_namespace
     WHERE nspname ~ '^[0-9a-f]{8}_[0-9a-f]{4}_[0-9a-f]{4}_[0-9a-f]{4}_[0-9a-f]{12}$'`
  );

  const result: { organization_id: string; asset_id: bigint; retention_until: Date }[] = [];

  for (const { nspname } of schemas) {
    // スキーマ名を安全チェック
    if (!/^[0-9a-f_]+$/i.test(nspname)) continue;

    // maiml_asset テーブルが存在するかチェック
    const tableExists = await pgp.oneOrNone<{ exists: boolean }>(
      `SELECT 1 AS exists
       FROM information_schema.tables
       WHERE table_schema = $1
         AND table_name   = 'maiml_asset'`,
      [nspname]
    );
    if (!tableExists) continue;

    // スキーマ名から organization_id（UUID 形式）を復元
    const organizationId = nspname.replace(/_/g, '-');

    const rows = await pgp.any<{ asset_id: bigint; retention_until: Date }>(
      `SELECT asset_id, retention_until
       FROM "${nspname}".maiml_asset
       WHERE retention_until IS NOT NULL`
    );

    for (const row of rows) {
      result.push({
        organization_id: organizationId,
        asset_id:        row.asset_id,
        retention_until: row.retention_until,
      });
    }
  }

  return result;
}
