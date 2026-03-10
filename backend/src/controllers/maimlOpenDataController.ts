/**
 * MaiML OpenData Pipeline コントローラー
 *
 * @description MaiML ファイルの公開・非公開・ステータス取得 API
 * @reference docs/MaiML_OpenData_Pipeline/MaiML_OpenData_Pipeline_BasicDesign_v1.3.md § 2
 *
 * バリデーションは Routes 側（express-validator）で実施済み
 *
 * API エンドポイント:
 *   POST   /api/v1/maiml-opendata/publish            - 公開
 *   DELETE /api/v1/maiml-opendata/unpublish/:assetId - 非公開
 *   GET    /api/v1/maiml-opendata/status             - 公開ステータス確認
 */

import { Request, Response } from 'express';
import * as maimlIngestService from '../services/maimlIngestService';
import type { PublishRequest, UnpublishRequest } from '../types/maimlOpenData';

// ============================================================
// POST /api/v1/maiml-opendata/publish
// ============================================================

/**
 * MaiML ファイルを公開する
 *
 * Request body:
 *   - file_uri (必須): ストレージ上の相対パス
 *   - template_only?: boolean
 *   - store_raw_series?: boolean
 *   - store_raw_raster?: boolean
 *   - raw_chunk_size?: number
 *   - raw_compression?: string
 *   - keep_raw_on_unpublish?: boolean
 *   - retention_until?: string (ISO 8601)
 *   - preview_mode?: 'uniform' | 'maxhold' | 'mmr'
 */
export async function publish(req: Request, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const { file_uri, ...options } = req.body as { file_uri: string } & PublishRequest;

    const result = await maimlIngestService.publishMaiml(organizationId, file_uri, options);

    res.status(201).json({
      success: true,
      data: {
        asset_id:           result.asset_id,
        doc_name:           result.doc_name,
        file_uri,
        status:             'published',
        condition_kv_count: result.condition_kv_count,
        material_kv_count:  result.material_kv_count,
        preview_count:      result.preview_count,
      },
      message: 'MaiML ファイルを公開しました',
    });
  } catch (err) {
    console.error('[maimlOpenDataController] publish error:', err);
    res.status(500).json({
      success: false,
      error: {
        code:    'PUBLISH_FAILED',
        message: err instanceof Error ? err.message : '公開処理に失敗しました',
      },
    });
  }
}

// ============================================================
// DELETE /api/v1/maiml-opendata/unpublish/:assetId
// ============================================================

/**
 * MaiML ファイルの公開を取り消す
 *
 * Path params:
 *   - assetId: number
 *
 * Request body (optional):
 *   - mode?: 'keep_meta' | 'full_delete'  (デフォルト: 'keep_meta')
 */
export async function unpublish(req: Request, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const assetId = parseInt(req.params.assetId, 10);
    const { mode } = (req.body ?? {}) as UnpublishRequest;

    await maimlIngestService.unpublishMaiml(organizationId, assetId, mode ?? 'keep_meta');

    res.status(200).json({
      success: true,
      data:    { asset_id: assetId, mode: mode ?? 'keep_meta' },
      message: '公開を取り消しました',
    });
  } catch (err) {
    console.error('[maimlOpenDataController] unpublish error:', err);
    const message = err instanceof Error ? err.message : '非公開処理に失敗しました';
    const status  = message.includes('見つかりません') ? 404
                  : message.includes('アクセスできません') ? 403
                  : 500;
    res.status(status).json({
      success: false,
      error: { code: 'UNPUBLISH_FAILED', message },
    });
  }
}

// ============================================================
// GET /api/v1/maiml-opendata/status?file_uri=...
// ============================================================

/**
 * 公開ステータスを取得する
 *
 * Query params:
 *   - file_uri (必須): ストレージ上の相対パス
 */
export async function getStatus(req: Request, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const fileUri = req.query.file_uri as string;

    const status = await maimlIngestService.getPublishStatus(organizationId, fileUri);

    res.status(200).json({ success: true, data: status });
  } catch (err) {
    console.error('[maimlOpenDataController] getStatus error:', err);
    res.status(500).json({
      success: false,
      error: {
        code:    'STATUS_FETCH_FAILED',
        message: err instanceof Error ? err.message : 'ステータス取得に失敗しました',
      },
    });
  }
}
