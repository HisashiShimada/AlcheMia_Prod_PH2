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
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
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
      .isObject()
      .withMessage('metadataはオブジェクトである必要があります'),
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
      .isUUID()
      .withMessage('projectIdはUUID形式である必要があります'),
    param('fileName')
      .notEmpty()
      .withMessage('fileNameは必須です')
      .isLength({ min: 1, max: 255 })
      .withMessage('fileNameは1〜255文字である必要があります'),
  ],
  handleValidationErrors,
  fileAccessController.downloadFile
);


export default router;
