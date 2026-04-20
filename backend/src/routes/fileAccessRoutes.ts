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
 * ファイルテキスト内容プロキシ取得
 * POST /api/v1/files/content-as-text
 *
 * バックエンドがストレージからファイルを直接取得し、テキスト文字列として返す
 * 署名付きURL経由のクライアントfetchが不要になる
 *
 * @middleware authMiddleware - JWT認証
 * @note すべてのロールがアクセス可能（マルチテナント分離で保護）
 */
router.post(
  '/content-as-text',
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
  fileAccessController.getFileContentAsText
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
 * Task: プロジェクト管理画面maimlファイル削除時project_status確認（2026-03-27）
 * - オプショナルパラメータ: checkProjectStatus
 * - プロジェクト管理画面からはcheckProjectStatus=trueで呼び出し
 * - maimlファイル削除時にproject_status=0であることを確認
 * - fileKeyからプロジェクト名を自動抽出
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
    body('checkProjectStatus')
      .optional()
      .isBoolean()
      .withMessage('checkProjectStatusはboolean型である必要があります'),
  ],
  handleValidationErrors,
  fileAccessController.deleteFile
);

/**
 * チャンクアップロードセッション開始
 * POST /api/v1/files/chunks/init
 *
 * チャンク分割アップロードのセッションを開始し、uploadIdを発行する。
 * 10MB超のファイルアップロード時に使用する。
 *
 * @middleware authMiddleware - JWT認証
 */
router.post(
  '/chunks/init',
  authMiddleware,
  [
    body('fileName')
      .notEmpty()
      .withMessage('fileNameは必須です')
      .isString()
      .withMessage('fileNameは文字列である必要があります')
      .isLength({ min: 1, max: 255 })
      .withMessage('fileNameは1〜255文字である必要があります'),
    body('totalChunks')
      .notEmpty()
      .withMessage('totalChunksは必須です')
      .isInt({ min: 1, max: 10000 })
      .withMessage('totalChunksは1〜10000の整数である必要があります'),
    body('filePath')
      .notEmpty()
      .withMessage('filePathは必須です')
      .isString()
      .withMessage('filePathは文字列である必要があります')
      .isLength({ min: 1, max: 1024 })
      .withMessage('filePathは1〜1024文字である必要があります'),
  ],
  handleValidationErrors,
  fileAccessController.initChunkUpload
);

/**
 * チャンク受信
 * POST /api/v1/files/chunks/:uploadId
 *
 * チャンクデータを受け取り、サーバー一時ディレクトリに保存する。
 *
 * @middleware authMiddleware - JWT認証
 * @middleware upload.single('chunk') - Multerチャンク受信
 */
router.post(
  '/chunks/:uploadId',
  authMiddleware,
  upload.single('chunk'),
  [
    param('uploadId')
      .notEmpty()
      .withMessage('uploadIdは必須です')
      .isUUID()
      .withMessage('uploadIdはUUID形式である必要があります'),
    body('chunkIndex')
      .notEmpty()
      .withMessage('chunkIndexは必須です')
      .isInt({ min: 0 })
      .withMessage('chunkIndexは0以上の整数である必要があります'),
  ],
  handleValidationErrors,
  fileAccessController.uploadChunk
);

/**
 * チャンクアップロード中断
 * DELETE /api/v1/files/chunks/:uploadId
 *
 * アップロードを中断し、サーバー上の一時ファイルを削除する。
 * ダイアログを閉じた場合など、complete を呼ばずに終了するときに使用する。
 *
 * @middleware authMiddleware - JWT認証
 */
router.delete(
  '/chunks/:uploadId',
  authMiddleware,
  [
    param('uploadId')
      .notEmpty()
      .withMessage('uploadIdは必須です')
      .isUUID()
      .withMessage('uploadIdはUUID形式である必要があります'),
  ],
  handleValidationErrors,
  fileAccessController.abortChunkUpload
);

/**
 * チャンク結合・アップロード完了
 * POST /api/v1/files/chunks/:uploadId/complete
 *
 * 全チャンクを結合してストレージに保存し、一時ファイルを削除する。
 *
 * @middleware authMiddleware - JWT認証
 */
router.post(
  '/chunks/:uploadId/complete',
  authMiddleware,
  [
    param('uploadId')
      .notEmpty()
      .withMessage('uploadIdは必須です')
      .isUUID()
      .withMessage('uploadIdはUUID形式である必要があります'),
    body('totalChunks')
      .notEmpty()
      .withMessage('totalChunksは必須です')
      .isInt({ min: 1 })
      .withMessage('totalChunksは1以上の整数である必要があります'),
    body('contentType')
      .optional()
      .isString()
      .withMessage('contentTypeは文字列である必要があります'),
  ],
  handleValidationErrors,
  fileAccessController.completeChunkUpload
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
 * バッチ先行作成
 * POST /api/v1/files/batches/init
 *
 * アップロード開始前にバッチを in_progress 状態で先行作成し、batchId を返す。
 * フロントエンドはこの batchId を使ってアップロード途中でもキャンセルを実行できる。
 *
 * @middleware authMiddleware - JWT認証
 */
router.post(
  '/batches/init',
  authMiddleware,
  [
    body('uploadType')
      .notEmpty()
      .withMessage('uploadTypeは必須です')
      .isIn(['single', 'bulk', 'folder'])
      .withMessage('uploadTypeはsingle, bulk, folderのいずれかである必要があります'),
    body('batchName')
      .optional()
      .isString()
      .withMessage('batchNameは文字列である必要があります')
      .isLength({ max: 255 })
      .withMessage('batchNameは255文字以内である必要があります'),
  ],
  handleValidationErrors,
  fileAccessController.initBatch
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

/**
 * バッチキャンセル
 * POST /api/v1/files/batches/:batchId/cancel
 * 
 * Task: アップロードキャンセル機能実装
 * - 指定されたバッチのアップロード処理をキャンセル
 * - 既にアップロードされたファイルを削除
 * - バッチステータスを'cancelled'に更新
 * 
 * @middleware authMiddleware - JWT認証
 * @note すべてのロールがアクセス可能（マルチテナント分離で保護）
 */
router.post(
  '/batches/:batchId/cancel',
  authMiddleware,
  [
    param('batchId')
      .notEmpty()
      .withMessage('batchIdは必須です')
      .isString()
      .withMessage('batchIdは文字列である必要があります'),
  ],
  handleValidationErrors,
  fileAccessController.cancelBatch
);

/**
 * フォルダ再帰削除
 * DELETE /api/v1/files/delete-folder
 *
 * 指定されたフォルダパス配下のファイルを再帰的に削除する。
 *
 * @middleware authMiddleware - JWT認証
 */
router.delete(
  '/delete-folder',
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
  fileAccessController.deleteFolder
);

/**
 * ファイル名変更
 * PATCH /api/v1/files/rename
 *
 * - fileKey: 対象ファイルの相対パス（organizationId なし）
 * - newFileName: 新しいファイル名（拡張子込み）
 */
router.patch(
  '/rename',
  authMiddleware,
  [
    body('fileKey')
      .notEmpty()
      .withMessage('fileKeyは必須です')
      .isString()
      .withMessage('fileKeyは文字列である必要があります'),
    body('newFileName')
      .notEmpty()
      .withMessage('newFileNameは必須です')
      .isString()
      .withMessage('newFileNameは文字列である必要があります')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('ファイル名は1〜255文字で指定してください'),
  ],
  handleValidationErrors,
  fileAccessController.renameFileHandler
);

export default router;
