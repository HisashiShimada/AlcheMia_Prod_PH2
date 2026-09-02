/**
 * 進捗データ取得関連ルート
 *
 * @description 進捗データ取得エンドポイント定義
 * Task: 6.1 ルート定義とミドルウェアチェーン
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import * as progressController from '../controllers/progressController';
import * as projectController from '../controllers/projectController';
import { authMiddleware } from '../middleware/authMiddleware';
import { handleValidationErrors } from '../middleware/validationMiddleware';
import { checkPermission } from '../middleware/permissionCheckMiddleware';
import { validateParamString, validateParamInt } from '../utils/validators';

const router = Router();

/**
 * 進捗データ取得
 * GET /api/v1/progress/projects/:projectId/methods/:methodId/tasks/:taskNo/transitions
 *
 * @middleware authMiddleware - JWT認証
 * @middleware checkPermission - 権限チェック（機能CD: 050000 実験作業者メニュー、読取専用）
 * @middleware バリデーションルール - パラメータ検証
 * @middleware handleValidationErrors - バリデーションエラーハンドリング
 * @description 指定されたプロジェクトID・メソッド・タスク連番に紐づくトランジションレベルの進捗情報を取得
 * @note API #3: 進捗データ取得API（api_progress_monitoring.md）
 * @requirements REQ-1, REQ-2, REQ-3, REQ-4, REQ-5, REQ-6, REQ-7, REQ-8, REQ-9, REQ-10
 * @roles experiment_worker（読取専用）
 */
router.get(
  '/projects/:projectId/methods/:methodId/tasks/:taskNo/transitions',
  authMiddleware,
  checkPermission('050000', 0),
  [
    validateParamString('projectId', 1, 255),
    validateParamString('methodId', 1, 255),
    validateParamInt('taskNo', 1),
  ],
  handleValidationErrors,
  progressController.getProgressData
);

/**
 * タスクステータス更新
 * PATCH /api/v1/progress/projects/:projectId/methods/:methodId/tasks/:taskNo/status
 *
 * @middleware authMiddleware - JWT認証
 * @middleware checkPermission - 権限チェック（機能CD: 050000 実験作業者メニュー、書込可）
 * @middleware バリデーションルール - パラメータ・ボディ検証
 * @middleware handleValidationErrors - バリデーションエラーハンドリング
 * @description プロジェクトID、メソッドID、タスク連番でタスクを特定してステータスを更新
 * @note API #5: タスクステータス更新API（新エンドポイント）
 * @requirements REQ-1, REQ-2, REQ-3, REQ-4, REQ-5, REQ-6, REQ-7, REQ-8, REQ-9
 * @roles experiment_worker（書込可）
 */
router.patch(
  '/projects/:projectId/methods/:methodId/tasks/:taskNo/status',
  authMiddleware,
  checkPermission('050000', 1),
  [
    // パスパラメータバリデーション
    validateParamString('projectId', 1, 255),
    validateParamString('methodId', 1, 255),
    validateParamInt('taskNo', 1),

    // リクエストボディバリデーション
    body('status')
      .notEmpty()
      .withMessage('statusは必須です')
      .isIn(['not_started', 'started', 'in_progress', 'completed', 'forced_terminated'])
      .withMessage('statusはnot_started, started, in_progress, completed, forced_terminatedのいずれかである必要があります'),
    body('currentUpdatedAt')
      .notEmpty()
      .withMessage('currentUpdatedAtは必須です')
      .isISO8601()
      .withMessage('currentUpdatedAtはISO8601形式のタイムスタンプである必要があります'),
    body('comment')
      .optional()
      .isLength({ max: 500 })
      .withMessage('commentは500文字以内である必要があります'),
  ],
  handleValidationErrors,
  progressController.updateTaskStatus
);

/**
 * タスク一覧取得（実験作業者用）
 * GET /api/v1/progress/projects/:projectId/worker-tasks
 * 
 * @middleware authMiddleware - JWT認証
 * @middleware checkPermission - 権限チェック（機能CD: 050000 実験作業者メニュー、読取専用）
 * @middleware handleValidationErrors - バリデーションエラーハンドリング
 * @description 実験作業者が自分に割り当てられたタスクの一覧をメソッド単位でグループ化して取得
 * @note API #4: タスク一覧取得（実験作業者用）
 * @requirements REQ-1, REQ-2, REQ-3, REQ-4, REQ-5, REQ-6, REQ-7, REQ-9
 * @roles experiment_worker (読取専用)
 */
router.get(
  '/projects/:projectId/worker-tasks',
  authMiddleware,
  checkPermission('050000', 0),
  [
    // パスパラメータバリデーション
    param('projectId')
      .notEmpty()
      .withMessage('projectId is required')
      .isString()
      .withMessage('projectId must be a string')
      .isLength({ min: 1, max: 255 })
      .withMessage('projectId must be 1-255 characters'),
    
    // クエリパラメータバリデーション（オプション）
    query('status')
      .optional()
      .isIn(['not_started', 'started', 'in_progress', 'completed', 'forced_terminated'])
      .withMessage('status must be one of: not_started, started, in_progress, completed, forced_terminated'),
    
    query('assignedTo')
      .optional()
      .isUUID()
      .withMessage('assignedTo must be a valid UUID'),
    
    query('sortBy')
      .optional()
      .isIn(['task_no', 'created_at', 'updated_at', 'status'])
      .withMessage('sortBy must be one of: task_no, created_at, updated_at, status'),
    
    query('order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('order must be either asc or desc'),
  ],
  handleValidationErrors,
  progressController.getWorkerTasks
);

/**
 * トランジションステータス更新
 * PATCH /api/v1/progress/projects/:projectId/methods/:methodId/transitions/:transitionId/status
 * 
 * @middleware authMiddleware - JWT認証
 * @middleware checkPermission - 権限チェック（機能CD: 050000 実験作業者メニュー、書込可）
 * @middleware handleValidationErrors - バリデーションエラーハンドリング
 * @description プロジェクトID、メソッドID、トランジションIDでトランジションを特定してステータスを更新
 * @note API #6: トランジションステータス更新API（旧: PUT /api/v1/experiments/...から移動）
 * @requirements REQ-1, REQ-2, REQ-3, REQ-4, REQ-5, REQ-6, REQ-7, REQ-8, REQ-9
 * @roles experiment_worker（書込可）
 */
router.patch(
  '/projects/:projectId/methods/:methodId/transitions/:transitionId/status',
  authMiddleware,
  checkPermission('050000', 1),
  [
    // パスパラメータバリデーション
    validateParamString('projectId', 1, 255),
    validateParamString('methodId', 1, 255),
    validateParamString('transitionId', 1, 255),

    // リクエストボディバリデーション
    body('taskNo')
      .notEmpty()
      .withMessage('taskNoは必須です')
      .isInt({ min: 1 })
      .withMessage('taskNoは1以上の整数である必要があります'),
    body('status')
      .notEmpty()
      .withMessage('statusは必須です')
      .isInt({ min: 0, max: 6 })
      .withMessage('statusは0〜6の整数である必要があります（0:初期, 1:準備中, 2:準備完了, 3:実行中, 4:一時停止, 5:完了, 6:エラー）'),
    body('progressRate')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('progressRateは0-100の整数である必要があります'),
    body('comment')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('commentは2000文字以内である必要があります'),
  ],
  handleValidationErrors,
  progressController.updateTransitionStatus
);

/**
 * タスク詳細取得
 * GET /api/v1/progress/projects/:projectId/methods/:methodId/tasks/:taskNo/details
 *
 * @middleware authMiddleware - JWT認証
 * @middleware checkPermission - 権限チェック（機能CD: 040000 実験管理者メニュー、読取専用）
 * @description
 *   projectId / methodId / taskNo からタスクを特定し、
 *   タスク基本情報 + トランジション進捗一覧 + 統計情報を返す。
 * @roles experiment_admin（読取専用）
 */
router.get(
  '/projects/:projectId/methods/:methodId/tasks/:taskNo/details',
  authMiddleware,
  checkPermission('040000', 0),
  [
    validateParamString('projectId', 1, 255),
    validateParamString('methodId', 1, 255),
    validateParamInt('taskNo', 1),
  ],
  handleValidationErrors,
  projectController.getTaskDetail
);

/**
 * WorkProgressDetailDialog 用 作業詳細一括取得
 * GET /api/v1/progress/projects/:projectId/work-details
 *
 * @middleware authMiddleware - JWT認証
 * @middleware checkPermission - 権限チェック（機能CD: 040000 実験管理者メニュー、読取専用）
 * @middleware handleValidationErrors - バリデーションエラーハンドリング
 * @description
 *   プロジェクトIDをキーに、projectInfo / fileInfo / workDetails（transitionProgress 含む）を一括返却する。
 *   WorkProgressDetailDialog がダイアログ初期表示時に呼び出す。
 * @roles experiment_admin（読取専用）
 */
router.get(
  '/projects/:projectId/work-details',
  authMiddleware,
  checkPermission('040000', 0),
  [
    validateParamString('projectId', 1, 255),
  ],
  handleValidationErrors,
  progressController.getWorkDetails
);

/**
 * NGタスク一覧取得（実験作業者用）
 * GET /api/v1/progress/projects/:projectId/ng-tasks
 *
 * @middleware authMiddleware - JWT認証
 * @middleware checkPermission - 権限チェック（機能CD: 050000 実験作業者メニュー、読取専用）
 * @description task_status=5（REVIEW_NG）のタスク一覧を取得してNG理由モーダルに表示する
 * @roles experiment_worker（読取専用）
 */
router.get(
  '/projects/:projectId/ng-tasks',
  authMiddleware,
  checkPermission('050000', 0),
  [
    validateParamString('projectId', 1, 255),
  ],
  handleValidationErrors,
  progressController.getNgTasks
);

export default router;
