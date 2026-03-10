/**
 * MaiML Ingest Worker サービス
 *
 * @description
 *   1. ストレージから MaiML ファイルを取得
 *   2. KV 抽出・プレビュー生成
 *   3. DB に一括保存（トランザクション）
 *
 * @reference docs/MaiML_OpenData_Pipeline/MaiML_OpenData_Pipeline_BasicDesign_v1.3.md § 3
 */

import { getPool } from '../database/db';
import { getStorageService } from './storageService';
import { extractFromMaiml } from './maimlKvExtractorService';
import { generatePreviews } from './maimlPreviewService';
import * as maimlAssetRepo       from '../repositories/maimlAssetRepository';
import * as maimlRegistryRepo    from '../repositories/maimlPublishRegistryRepository';
import * as maimlConditionKvRepo from '../repositories/maimlConditionKvRepository';
import * as maimlMaterialKvRepo  from '../repositories/maimlMaterialKvRepository';
import * as maimlPreviewRepo     from '../repositories/maimlSeriesPreviewRepository';
import * as maimlRawHeaderRepo   from '../repositories/maimlSeriesRawHeaderRepository';
import type {
  MaimlAsset,
  MaimlPublishRegistry,
  PublishRequest,
  IngestResult,
  PreviewMode,
} from '../types/maimlOpenData';

// ============================================================
// 公開関数
// ============================================================

/**
 * MaiML ファイルを公開処理する
 *
 * 処理フロー:
 *   1. maiml_asset / maiml_publish_registry に行を INSERT
 *   2. ストレージから MaiML ファイルをダウンロード
 *   3. KV 抽出（condition / material）
 *   4. プレビュー生成（series）
 *   5. DB に一括保存（トランザクション）
 *
 * @param organizationId - 組織 ID
 * @param fileUri - ストレージ上の相対パス（organization_id なしの相対パス）
 * @param req - 公開リクエストオプション
 * @returns Ingest 結果サマリー
 */
export async function publishMaiml(
  organizationId: string,
  fileUri: string,
  req: PublishRequest,
): Promise<IngestResult> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── 1. maiml_asset 作成 ────────────────────────────────
    const assetRow: MaimlAsset = {
      organization_id: organizationId,
      file_uri:        fileUri,
      template_only:   req.template_only ?? false,
    };
    const asset = await maimlAssetRepo.insert(assetRow, client);
    const assetId = asset.asset_id!;

    // ── 2. maiml_publish_registry 作成 ─────────────────────
    const registryRow: MaimlPublishRegistry = {
      asset_id:              assetId,
      file_uri:              fileUri,
      status:                'processing',
      template_only:         req.template_only         ?? false,
      store_raw_series:      req.store_raw_series       ?? false,
      store_raw_raster:      req.store_raw_raster       ?? false,
      raw_chunk_size:        req.raw_chunk_size          ?? 65536,
      raw_compression:       req.raw_compression         ?? 'zstd',
      keep_raw_on_unpublish: req.keep_raw_on_unpublish   ?? false,
      retention_until:       req.retention_until ? new Date(req.retention_until) : null,
    };
    const registry = await maimlRegistryRepo.insert(registryRow, client);

    // ── 3. ストレージから MaiML ダウンロード ─────────────────
    const storageService = getStorageService();
    const fileBuffer = await storageService.downloadFile(organizationId, fileUri);
    const xmlContent = fileBuffer.toString('utf-8');

    // ── 4. KV 抽出 ──────────────────────────────────────────
    const { conditionKvRows, materialKvRows, seriesList, docName } =
      extractFromMaiml(assetId, xmlContent);

    // doc_name を asset に反映
    if (docName) {
      await maimlAssetRepo.updateDocName(assetId, docName, client);
    }

    // ── 5. プレビュー生成 ─────────────────────────────────────
    const previewMode: PreviewMode = req.preview_mode ?? 'uniform';
    const previews = generatePreviews(assetId, seriesList, previewMode);

    // ── 6. KV・プレビューを DB に保存 ─────────────────────────
    let condCount = 0;
    let matCount  = 0;
    let prevCount = 0;

    if (!req.template_only) {
      if (conditionKvRows.length > 0) {
        await maimlConditionKvRepo.bulkInsert(conditionKvRows, client);
        condCount = conditionKvRows.length;
      }
      if (materialKvRows.length > 0) {
        await maimlMaterialKvRepo.bulkInsert(materialKvRows, client);
        matCount = materialKvRows.length;
      }
      if (previews.length > 0) {
        await maimlPreviewRepo.bulkInsert(previews, client);
        prevCount = previews.length;
      }
    } else {
      // template_only: conditionTemplate / materialTemplate の KV のみ保存
      const tplCondRows = conditionKvRows.filter(r => r.source_section === 'conditionTemplate');
      const tplMatRows  = materialKvRows.filter(r => r.source_section === 'materialTemplate');

      if (tplCondRows.length > 0) {
        await maimlConditionKvRepo.bulkInsert(tplCondRows, client);
        condCount = tplCondRows.length;
      }
      if (tplMatRows.length > 0) {
        await maimlMaterialKvRepo.bulkInsert(tplMatRows, client);
        matCount = tplMatRows.length;
      }
    }

    // ── 7. registry を published に更新 ──────────────────────
    await maimlRegistryRepo.updateStatus(registry.registry_id!, 'published', client);

    await client.query('COMMIT');

    return {
      asset_id:           assetId,
      doc_name:           docName,
      condition_kv_count: condCount,
      material_kv_count:  matCount,
      preview_count:      prevCount,
      raw_header_count:   0,
      raw_chunk_count:    0,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * MaiML ファイルの公開を取り消す
 *
 * @param organizationId - 組織 ID
 * @param assetId - 対象 asset_id
 * @param mode - 'keep_meta' | 'full_delete'
 */
export async function unpublishMaiml(
  organizationId: string,
  assetId: number,
  mode: 'keep_meta' | 'full_delete' = 'keep_meta',
): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // アセットの組織 ID を確認（テナント分離）
    const asset = await maimlAssetRepo.findById(assetId, client);
    if (!asset) {
      throw new Error(`asset_id=${assetId} が見つかりません`);
    }
    if (asset.organization_id !== organizationId) {
      throw new Error('他の組織のアセットにはアクセスできません');
    }

    // レジストリのオプション取得
    const registry = await maimlRegistryRepo.findByAssetId(assetId, client);

    if (mode === 'full_delete') {
      // cascade delete: asset を削除すれば関連テーブルも全削除
      await maimlAssetRepo.deleteById(assetId, client);
    } else {
      // keep_meta: KV / preview / raw を削除し registry を unpublished に
      if (!registry?.keep_raw_on_unpublish) {
        await maimlRawHeaderRepo.deleteByAssetId(assetId, client);
      }
      await maimlPreviewRepo.deleteByAssetId(assetId, client);
      await maimlConditionKvRepo.deleteByAssetId(assetId, client);
      await maimlMaterialKvRepo.deleteByAssetId(assetId, client);

      if (registry) {
        await maimlRegistryRepo.updateStatus(registry.registry_id!, 'unpublished', client);
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 公開ステータスを取得する
 *
 * @param organizationId - 組織 ID
 * @param fileUri - ストレージ上の相対パス
 */
export async function getPublishStatus(
  organizationId: string,
  fileUri: string,
) {
  const asset = await maimlAssetRepo.findByUri(organizationId, fileUri);
  if (!asset) {
    return {
      is_published:    false,
      asset_id:        null,
      registry_id:     null,
      status:          null,
      doc_name:        null,
      template_only:   null,
      store_raw_series: null,
      retention_until: null,
      published_at:    null,
    };
  }

  const registry = await maimlRegistryRepo.findByAssetId(asset.asset_id!);
  const isPublished = registry?.status === 'published';

  return {
    is_published:    isPublished,
    asset_id:        asset.asset_id!,
    registry_id:     registry?.registry_id ?? null,
    status:          registry?.status ?? null,
    doc_name:        asset.doc_name ?? null,
    template_only:   registry?.template_only ?? null,
    store_raw_series: registry?.store_raw_series ?? null,
    retention_until: registry?.retention_until ?? null,
    published_at:    isPublished ? registry?.updated_at ?? null : null,
  };
}
