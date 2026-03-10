/**
 * MaiML OpenData Pipeline ルート
 *
 * @description MaiML ファイルの公開・非公開・ステータス確認エンドポイント定義
 * @reference docs/MaiML_OpenData_Pipeline/MaiML_OpenData_Pipeline_BasicDesign_v1.3.md § 2
 */

import { Router } from 'express';
import { body, query, param } from 'express-validator';
import * as maimlOpenDataController from '../controllers/maimlOpenDataController';
import { authMiddleware } from '../middleware/authMiddleware';
import { handleValidationErrors } from '../middleware/validationMiddleware';

const router = Router();

/**
 * MaiML ファイルを公開する
 * POST /api/v1/maiml-opendata/publish
 *
 * @middleware authMiddleware - JWT認証
 * @description
 *   ストレージ上の MaiML ファイルを解析し、KV・プレビューデータを DB に保存する。
 *   同時に maiml_asset / maiml_publish_registry を作成し status を published に設定する。
 * @requirements SEC-1
 */
router.post(
  '/publish',
  authMiddleware,
  [
    body('file_uri')
      .notEmpty()
      .withMessage('file_uri は必須です')
      .isString()
      .withMessage('file_uri は文字列である必要があります'),
    body('template_only')
      .optional()
      .isBoolean()
      .withMessage('template_only は boolean である必要があります'),
    body('store_raw_series')
      .optional()
      .isBoolean()
      .withMessage('store_raw_series は boolean である必要があります'),
    body('store_raw_raster')
      .optional()
      .isBoolean()
      .withMessage('store_raw_raster は boolean である必要があります'),
    body('raw_chunk_size')
      .optional()
      .isInt({ min: 1 })
      .withMessage('raw_chunk_size は正の整数である必要があります'),
    body('raw_compression')
      .optional()
      .isIn(['zstd', 'gzip', 'none'])
      .withMessage('raw_compression は zstd / gzip / none のいずれかである必要があります'),
    body('keep_raw_on_unpublish')
      .optional()
      .isBoolean()
      .withMessage('keep_raw_on_unpublish は boolean である必要があります'),
    body('retention_until')
      .optional()
      .isISO8601()
      .withMessage('retention_until は ISO 8601 形式の日時文字列である必要があります'),
    body('preview_mode')
      .optional()
      .isIn(['uniform', 'maxhold', 'mmr'])
      .withMessage('preview_mode は uniform / maxhold / mmr のいずれかである必要があります'),
  ],
  handleValidationErrors,
  maimlOpenDataController.publish,
);

/**
 * MaiML ファイルの公開を取り消す
 * DELETE /api/v1/maiml-opendata/unpublish/:assetId
 *
 * @middleware authMiddleware - JWT認証
 * @description
 *   指定した asset_id の KV・プレビューデータを削除し、status を unpublished に設定する。
 *   mode=full_delete の場合はアセット自体も削除する。
 * @requirements SEC-1
 */
router.delete(
  '/unpublish/:assetId',
  authMiddleware,
  [
    param('assetId')
      .notEmpty()
      .withMessage('assetId は必須です')
      .isInt({ min: 1 })
      .withMessage('assetId は正の整数である必要があります'),
    body('mode')
      .optional()
      .isIn(['keep_meta', 'full_delete'])
      .withMessage('mode は keep_meta / full_delete のいずれかである必要があります'),
  ],
  handleValidationErrors,
  maimlOpenDataController.unpublish,
);

/**
 * 公開ステータスを取得する
 * GET /api/v1/maiml-opendata/status?file_uri=...
 *
 * @middleware authMiddleware - JWT認証
 * @description ストレージパスを指定して公開状態を確認する
 * @requirements SEC-1
 */
router.get(
  '/status',
  authMiddleware,
  [
    query('file_uri')
      .notEmpty()
      .withMessage('file_uri は必須です')
      .isString()
      .withMessage('file_uri は文字列である必要があります'),
  ],
  handleValidationErrors,
  maimlOpenDataController.getStatus,
);

export default router;
