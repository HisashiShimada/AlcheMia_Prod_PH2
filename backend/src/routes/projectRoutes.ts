/**
 * プロジェクト管理関連ルート
 * 
 * @description プロジェクト一覧取得などのエンドポイント定義
 * Task: 3.1, 3.2 Routes層実装
 */

import { Router } from 'express';
import { query, body, param } from 'express-validator';
import * as projectController from '../controllers/projectController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

/**
 * プロジェクト一覧取得
 * GET /api/v1/projects
 * 
 * @middleware authMiddleware - JWT認証
 * @note テナント分離と権限チェックはController層で実装済み
 */
router.get(
  '/',
  authMiddleware,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('ページ番号は1以上の整数である必要があります'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limitは1〜100の範囲内の整数である必要があります'),
    query('include_completed')
      .optional()
      .isBoolean()
      .withMessage('include_completedはtrueまたはfalseである必要があります'),
    query('sort_by')
      .optional()
      .isIn(['create_at', 'project_name'])
      .withMessage('sort_byはcreate_atまたはproject_nameである必要があります'),
    query('order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('orderはascまたはdescである必要があります'),
  ],
  projectController.list
);

/**
 * プロジェクト作成
 * POST /api/v1/projects
 * 
 * @middleware authMiddleware - JWT認証
 * @note Task 1.1: POST /api/v1/projectsエンドポイント追加
 */
router.post(
  '/',
  authMiddleware,
  [
    body('projectName')
      .notEmpty()
      .withMessage('projectNameは必須です')
      .isLength({ min: 1, max: 255 })
      .withMessage('projectNameは1〜255文字である必要があります')
      .matches(/^[^\x00-\x1F\x7F]*$/)
      .withMessage('projectNameに制御文字を含めることはできません'),
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('descriptionは1000文字以内である必要があります'),
  ],
  projectController.create
);

/**
 * プロジェクト詳細取得
 * GET /api/v1/projects/:projectId
 * 
 * @middleware authMiddleware - JWT認証
 * @note Task 2.2: プロジェクト詳細取得エンドポイント追加
 */
router.get(
  '/:projectId',
  authMiddleware,
  projectController.getById
);

/**
 * プロジェクトチェックアウト
 * POST /api/v1/projects/:projectId/checkout
 * 
 * @middleware authMiddleware - JWT認証
 * @description プロジェクトをチェックアウトし、排他編集を開始する
 * @note Task 1.1: チェックアウトエンドポイント追加
 * @requirements FR-1.1
 */
router.post(
  '/:projectId/checkout',
  authMiddleware,
  [
    param('projectId')
      .isUUID()
      .withMessage('projectIdはUUID形式である必要があります'),
  ],
  projectController.checkout
);

/**
 * プロジェクトチェックイン
 * POST /api/v1/projects/:projectId/checkin
 * 
 * @middleware authMiddleware - JWT認証
 * @description プロジェクトをチェックインし、排他編集を終了する
 * @note Task 1.2: チェックインエンドポイント追加
 * @requirements FR-2.1
 */
router.post(
  '/:projectId/checkin',
  authMiddleware,
  [
    param('projectId')
      .isUUID()
      .withMessage('projectIdはUUID形式である必要があります'),
  ],
  projectController.checkin
);

/**
 * プロジェクトチェックアウト状態取得
 * GET /api/v1/projects/:projectId/checkout-status
 * 
 * @middleware authMiddleware - JWT認証
 * @description プロジェクトの現在のチェックアウト状態を取得する
 * @note Task 1.3: チェックアウト状態照会エンドポイント追加
 * @requirements FR-3.1
 */
router.get(
  '/:projectId/checkout-status',
  authMiddleware,
  [
    param('projectId')
      .isUUID()
      .withMessage('projectIdはUUID形式である必要があります'),
  ],
  projectController.getCheckoutStatus
);

/**
 * プロジェクトリロード
 * POST /api/v1/projects/:projectId/reload
 * 
 * @middleware authMiddleware - JWT認証
 * @description プロジェクトのファイルメタデータをS3から再読み込みする
 * @note Task 3.2: リロードエンドポイント追加
 * @requirements REQ-1, REQ-5
 */
router.post(
  '/:projectId/reload',
  authMiddleware,
  [
    param('projectId')
      .isUUID()
      .withMessage('projectIdはUUID形式である必要があります'),
  ],
  projectController.reload
);

/**
 * プロジェクトファイル一覧取得
 * GET /api/v1/projects/:projectName/files
 * 
 * @middleware authMiddleware - JWT認証
 * @description プロジェクトに関連するファイル一覧を取得する（署名付きURL付き）
 * @note Task 2.3: ファイル一覧取得エンドポイント追加
 * @requirements REQ-2, REQ-3, REQ-11
 */
router.get(
  '/:projectName/files',
  authMiddleware,
  [
    param('projectName')
      .notEmpty()
      .withMessage('projectNameは必須です'),
    query('include_archive')
      .optional()
      .isBoolean()
      .withMessage('include_archiveはtrueまたはfalseである必要があります'),
  ],
  projectController.getProjectFiles
);

/**
 * プロジェクトタスク一覧取得
 * GET /api/v1/projects/:projectName/tasks
 * 
 * @middleware authMiddleware - JWT認証
 * @description プロジェクトに関連するタスク一覧を取得する
 * @note Task 3.3: タスク一覧取得エンドポイント追加
 * @requirements REQ-2, REQ-4
 */
router.get(
  '/:projectName/tasks',
  authMiddleware,
  [
    param('projectName')
      .notEmpty()
      .withMessage('projectNameは必須です'),
    query('status')
      .optional()
      .isIn(['all', 'pending', 'in_progress', 'completed', 'failed'])
      .withMessage('statusはall, pending, in_progress, completed, failedのいずれかである必要があります'),
  ],
  projectController.getProjectTasks
);

export default router;
