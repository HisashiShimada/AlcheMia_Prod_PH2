/**
 * ファイルアクセス関連ルート
 * 
 * @description 単一ファイルダウンロードとプロジェクト一括ダウンロードのエンドポイント定義
 * Task 4.1: 単一ファイルダウンロードAPIエンドポイントの実装
 * Task 4.2: プロジェクト一括ダウンロードAPIエンドポイントの実装
 * Task 4.3: APIルートファイルの作成と登録
 */

import { Router } from 'express';
import { param, query, body } from 'express-validator';
import multer from 'multer';
import * as fileAccessController from '../controllers/fileAccessController';
import { authMiddleware } from '../middleware/authMiddleware';
import { handleValidationErrors } from '../middleware/validationMiddleware';

const router = Router();

// Multer設定（メモリストレージ）
// Phase1-2: ファイルサイズ上限を500MBに引き上げ（2026-02-18）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB（Reference版に合わせて引き上げ）
    fieldSize: 50 * 1024 * 1024,  // 50MB（フィールドサイズ）
    files: 100, // 最大100ファイル
  },
});

/**
 * ファイルアップロード
 * POST /api/v1/files/upload
 * 
 * Task: S3ファイルアップロード統一化
 * - 各画面で生成された完全なパスを使用してファイルをアップロード
 * - プロジェクト、フォーマット、その他のファイルで共通利用可能
 * 
 * @middleware authMiddleware - JWT認証
 * @middleware upload.array('files') - Multerファイルアップロード
 * @note すべてのロールがアクセス可能（マルチテナント分離で保護）
 */
router.post(
  '/upload',
  authMiddleware,
  upload.array('files'),
  [
    body('uploadMode')
      .notEmpty()
      .withMessage('uploadModeは必須です')
      .isIn(['single', 'bulk', 'folder'])
      .withMessage('uploadModeはsingle, bulk, folderのいずれかである必要があります'),
    body('targetPath')
      .notEmpty()
      .withMessage('targetPathは必須です')
      .isString()
      .withMessage('targetPathは文字列である必要があります')
      .isLength({ min: 1, max: 1024 })
      .withMessage('targetPathは1〜1024文字である必要があります'),
    body('metadata')
      .optional()
      .custom((value) => {
        // metadataはJSON文字列として送信されるため、パース可能かチェック
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            return typeof parsed === 'object' && parsed !== null;
          } catch {
            return false;
          }
        }
        // すでにオブジェクトの場合もOK
        return typeof value === 'object' && value !== null;
      })
      .withMessage('metadataは有効なJSONオブジェクトである必要があります'),
    // Phase1-3: 空フォルダプレースホルダー機能（2026-02-18）
    body('emptyFolders')
      .optional()
      .isArray()
      .withMessage('emptyFoldersは配列である必要があります')
      .custom((value) => {
        if (Array.isArray(value)) {
          // 配列内の各要素が文字列であることを確認
          return value.every((item) => typeof item === 'string');
        }
        return true;
      })
      .withMessage('emptyFoldersの各要素は文字列である必要があります'),
  ],
  handleValidationErrors,
  fileAccessController.uploadFiles
);

/**
 * フォルダZIPダウンロード
 * POST /api/v1/files/download-folder-as-zip
 * 
 * Task: 汎用フォルダZIPダウンロード機能
 * - 指定されたフォルダパス配下のファイルをZIP形式でダウンロード
 * - プロジェクト、フォーマット、その他あらゆるフォルダで利用可能
 * 
 * @middleware authMiddleware - JWT認証
 * @note すべてのロールがアクセス可能（マルチテナント分離で保護）
 */
router.post(
  '/download-folder-as-zip',
  authMiddleware,
  [
    body('folderPath')
      .notEmpty()
      .withMessage('folderPathは必須です')
      .isString()
      .withMessage('folderPathは文字列である必要があります')
      .isLength({ min: 1, max: 1024 })
      .withMessage('folderPathは1〜1024文字である必要があります'),
  ],
  handleValidationErrors,
  fileAccessController.downloadFolderAsZip
);

/**
 * ファイル表示用署名付きURL取得
 * POST /api/v1/files/view-url
 *
 * Task: ビューアボタン修正 - 画像・TIFFファイルの表示用URL取得
 * - ファイルキーを直接指定して表示用署名付きURLを取得
 * - Content-Dispositionを付与しない（ダウンロード強制なし）
 *
 * @middleware authMiddleware - JWT認証
 * @note すべてのロールがアクセス可能（マルチテナント分離で保護）
 */
router.post(
  '/view-url',
  authMiddleware,
  [
    body('fileKey')
      .notEmpty()
      .withMessage('fileKeyは必須です')
      .isString()
      .withMessage('fileKeyは文字列である必要があります')
      .isLength({ min: 1, max: 1024 })
      .withMessage('fileKeyは1〜1024文字である必要があります'),
  ],
  handleValidationErrors,
  fileAccessController.getFileViewUrl
);

/**
 * ファイルキーベースの汎用ダウンロード用署名付きURL取得
 * POST /api/v1/files/download-url
 * 
 * Task: S3ファイルダウンロード共通化
 * - ファイルキーを直接指定して署名付きURLを取得
 * - プロジェクト、フォーマット、その他のファイルで共通利用可能
 * 
 * @middleware authMiddleware - JWT認証
 * @note すべてのロールがアクセス可能（マルチテナント分離で保護）
 */
router.post(
  '/download-url',
  authMiddleware,
  [
    body('fileKey')
      .notEmpty()
      .withMessage('fileKeyは必須です')
      .isString()
      .withMessage('fileKeyは文字列である必要があります')
      .isLength({ min: 1, max: 1024 })
      .withMessage('fileKeyは1〜1024文字である必要があります'),
  ],
  handleValidationErrors,
  fileAccessController.getFileDownloadUrl
);

/**
 * ファイル削除
 * DELETE /api/v1/files/delete
 * 
 * Task: ファイル削除API共通化
 * - ファイルキーを直接指定してファイルを削除
 * - フォーマット、プロジェクト、その他のファイルで共通利用可能
 * 
 * @middleware authMiddleware - JWT認証
 * @note すべてのロールがアクセス可能（マルチテナント分離で保護）
 */
router.delete(
  '/delete',
  authMiddleware,
  [
    body('fileKey')
      .notEmpty()
      .withMessage('fileKeyは必須です')
      .isString()
      .withMessage('fileKeyは文字列である必要があります')
      .isLength({ min: 1, max: 1024 })
      .withMessage('fileKeyは1〜1024文字である必要があります'),
  ],
  handleValidationErrors,
  fileAccessController.deleteFile
);

/**
 * 単一ファイルダウンロード用署名付きURL取得
 * GET /api/v1/projects/:projectId/files/:fileName/download
 * 
 * @middleware authMiddleware - JWT認証
 * @note Manager、Worker、System Adminがアクセス可能
 * @requirements 1, 2, 4, 5, 7, 8, 9, 11
 */
router.get(
  '/:projectId/files/:fileName/download',
  authMiddleware,
  [
    param('projectId')
      .notEmpty()
      .withMessage('projectIdは必須です')
      .isString()
      .withMessage('projectIdは文字列である必要があります'),
    param('fileName')
      .notEmpty()
      .withMessage('fileNameは必須です')
      .isLength({ min: 1, max: 255 })
      .withMessage('fileNameは1〜255文字である必要があります'),
  ],
  handleValidationErrors,
  fileAccessController.downloadFile
);

/**
 * バッチ履歴取得
 * GET /api/v1/files/batches
 * 
 * Phase2-1: バッチ管理機能（2026-02-18）
 * - アップロードバッチの履歴を取得
 * - ステータス、日付範囲でフィルタリング可能
 * 
 * @middleware authMiddleware - JWT認証
 * @note すべてのロールがアクセス可能（マルチテナント分離で保護）
 */
router.get(
  '/batches',
  authMiddleware,
  [
    query('status')
      .optional()
      .isIn(['in_progress', 'completed', 'completed_with_errors', 'failed'])
      .withMessage('statusは有効な値である必要があります'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('startDateはISO8601形式である必要があります'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('endDateはISO8601形式である必要があります'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limitは1〜100の整数である必要があります'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('offsetは0以上の整数である必要があります'),
  ],
  handleValidationErrors,
  fileAccessController.getBatchHistory
);

/**
 * バッチ進捗取得
 * GET /api/v1/files/batches/:batchId/progress
 * 
 * Phase2-1: バッチ管理機能（2026-02-18）
 * - 指定されたバッチの進捗状況を取得
 * - リアルタイムの進捗率を返す
 * 
 * @middleware authMiddleware - JWT認証
 * @note すべてのロールがアクセス可能（マルチテナント分離で保護）
 */
router.get(
  '/batches/:batchId/progress',
  authMiddleware,
  [
    param('batchId')
      .notEmpty()
      .withMessage('batchIdは必須です')
      .isString()
      .withMessage('batchIdは文字列である必要があります'),
  ],
  handleValidationErrors,
  fileAccessController.getBatchProgress
);

export default router;
