/**
 * 非公開処理ロジック（非公開バッチ専用）
 *
 * backend/src/ には依存せず、このバッチ内で完結する独立実装。
 * 仕様: docs/MaiML_OpenData_Pipeline/spec.md §3.2 非公開（Unpublish）フロー
 */

import type { Pool } from 'pg';
import {
  findDueAssets,
  deleteConditionKv,
  deleteMaterialKv,
  deletePreview,
  deleteRawHeader,
  updateRegistryStatus,
  deleteAsset,
} from './repository';

// ============================================================
// 型定義
// ============================================================

/** 非公開モード */
export type UnpublishMode = 'keep_meta' | 'full_delete';

/** 1件の非公開処理結果 */
export interface UnpublishAssetResult {
  assetId:    number;
  registryId: number;
  success:    boolean;
  error?:     string;
}

/** バッチ処理の結果サマリー */
export interface UnpublishBatchResult {
  /** 処理対象件数 */
  total:    number;
  /** 成功件数 */
  success:  number;
  /** 失敗件数 */
  failed:   number;
  /** 各アセットの処理結果 */
  details:  UnpublishAssetResult[];
}

// ============================================================
// 公開関数
// ============================================================

/**
 * 1件のアセットを非公開にする（トランザクション）
 *
 * @param pool             - pg.Pool
 * @param assetId          - 対象 asset_id
 * @param registryId       - 対象 registry_id
 * @param keepRaw          - keep_raw_on_unpublish フラグ（生データを残すか）
 * @param mode             - 'keep_meta' | 'full_delete'
 */
export async function unpublishAsset(
  pool:       Pool,
  assetId:    number,
  registryId: number,
  keepRaw:    boolean,
  mode:       UnpublishMode,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (mode === 'full_delete') {
      // maiml_asset を削除 → CASCADE で全関連テーブルも削除される
      await deleteAsset(client, assetId);
    } else {
      // keep_meta: KV・プレビュー・生データを削除し、代表メタ（maiml_asset）は残す

      // 実験条件 KV を削除
      await deleteConditionKv(client, assetId);

      // 材料情報 KV を削除
      await deleteMaterialKv(client, assetId);

      // プレビューを削除
      await deletePreview(client, assetId);

      // 生データを削除（keep_raw_on_unpublish=true の場合はスキップ）
      if (!keepRaw) {
        await deleteRawHeader(client, assetId);
      }

      // registry を unpublished に更新
      await updateRegistryStatus(client, registryId, 'unpublished');
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
 * 期限切れアセットを一括非公開にする
 *
 * 処理フロー:
 *   1. maiml_publish_registry から retention_until <= now() かつ status='published' を取得
 *   2. 各アセットに対して unpublishAsset() を実行
 *   3. 結果サマリーを返す
 *
 * @param pool - pg.Pool
 * @param mode - 'keep_meta'（デフォルト）| 'full_delete'
 * @returns 処理結果サマリー
 */
export async function unpublishDueAssets(
  pool: Pool,
  mode: UnpublishMode = 'keep_meta',
): Promise<UnpublishBatchResult> {
  const dueAssets = await findDueAssets(pool);

  const result: UnpublishBatchResult = {
    total:   dueAssets.length,
    success: 0,
    failed:  0,
    details: [],
  };

  for (const asset of dueAssets) {
    try {
      await unpublishAsset(
        pool,
        asset.asset_id,
        asset.registry_id,
        asset.keep_raw_on_unpublish,
        mode,
      );

      result.success++;
      result.details.push({
        assetId:    asset.asset_id,
        registryId: asset.registry_id,
        success:    true,
      });

      console.log(
        `[${new Date().toISOString()}] unpublished: asset_id=${asset.asset_id} registry_id=${asset.registry_id} mode=${mode}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.failed++;
      result.details.push({
        assetId:    asset.asset_id,
        registryId: asset.registry_id,
        success:    false,
        error:      message,
      });

      console.error(
        `[${new Date().toISOString()}] FAILED: asset_id=${asset.asset_id} registry_id=${asset.registry_id} error=${message}`,
      );
    }
  }

  return result;
}
