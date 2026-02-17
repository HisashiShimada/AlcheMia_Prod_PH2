/**
 * ファイルアクセス関連ルート
 * 
 * @description 単一ファイルダウンロードとプロジェクト一括ダウンロードのエンドポイント定義
 * Task 4.1: 単一ファイルダウンロードAPIエンドポイントの実装
 * Task 4.2: プロジェクト一括ダウンロードAPIエンドポイントの実装
 * Task 4.3: APIルートファイルの作成と登録
 */

import { Router } from 'express';
import { param, query } from 'express-validator';
import * as fileAccessController from '../controllers/fileAccessController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

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
  fileAccessController.downloadFile
);

/**
 * プロジェクト一括ダウンロード用署名付きURLリスト取得
 * GET /api/v1/projects/:projectId/files/download-all
 * 
 * @middleware authMiddleware - JWT認証
 * @note Manager、System Adminがアクセス可能（Workerは権限不足）
 * @requirements 1, 4, 7, 8, 9, 12
 */
router.get(
  '/:projectId/files/download-all',
  authMiddleware,
  [
    param('projectId')
      .isUUID()
      .withMessage('projectIdはUUID形式である必要があります'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('ページ番号は1以上の整数である必要があります'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limitは1〜100の範囲内の整数である必要があります'),
  ],
  fileAccessController.downloadAllFiles
);

export default router;
