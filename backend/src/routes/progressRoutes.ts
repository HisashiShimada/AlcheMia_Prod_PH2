/**
 * 進捗データ取得関連ルート
 *
 * @description 進捗データ取得エンドポイント定義
 * Task: 6.1 ルート定義とミドルウェアチェーン
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import * as progressController from '../controllers/progressController';
import { authMiddleware } from '../middleware/authMiddleware';
import { handleValidationErrors } from '../middleware/validationMiddleware';
import { checkPermission } from '../middleware/permissionCheckMiddleware';
import { validateUUID, validateParamString, validateParamInt } from '../utils/validators';

const router = Router();

/**
 * 進捗データ取得
 * GET /api/v1/progress/:projectId/:methodId/:taskNo
 *
 * @middleware authMiddleware - JWT認証
 * @middleware バリデーションルール - パラメータ検証
 * @middleware handleValidationErrors - バリデーションエラーハンドリング
 * @description 指定されたプロジェクト・メソッド・タスクに紐づくトランジションレベルの進捗情報を取得
 * @note Task 6.1: ルート定義とミドルウェアチェーン
 * @requirements REQ-1, REQ-2, REQ-3, REQ-4, REQ-5, REQ-6, REQ-7, REQ-8, REQ-9, REQ-10
 * @roles experiment_admin, experiment_worker, system_admin (authMiddlewareで認証済みユーザーに限定)
 */
router.get(
  '/:projectId/:methodId/:taskNo',
  authMiddleware,
  [
    validateUUID('projectId', 'param'),
    validateParamString('methodId', 1, 255),
    validateParamInt('taskNo', 1),
  ],
  handleValidationErrors,
  progressController.getProgressData
);

/**
 * タスクステータス更新
 * PATCH /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/status
 *
 * @middleware authMiddleware - JWT認証
 * @middleware checkPermission - 権限チェック（機能CD: 050000 実験作業者メニュー、書込可）
 * @middleware バリデーションルール - パラメータ・ボディ検証
 * @middleware handleValidationErrors - バリデーションエラーハンドリング
 * @description プロジェクト名、メソッドID、タスク連番でタスクを特定してステータスを更新
 * @note API #5: タスクステータス更新API（新エンドポイント）
 * @requirements REQ-1, REQ-2, REQ-3, REQ-4, REQ-5, REQ-6, REQ-7, REQ-8, REQ-9
 * @roles experiment_worker（書込可）
 */
router.patch(
  '/projects/:projectName/methods/:methodId/tasks/:taskNo/status',
  authMiddleware,
  checkPermission('050000', 1),
  [
    // パスパラメータバリデーション
    validateParamString('projectName', 1, 255),
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
 * GET /api/v1/progress/projects/:projectName/worker-tasks
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
  '/projects/:projectName/worker-tasks',
  authMiddleware,
  checkPermission('050000', 0),
  [
    // パスパラメータバリデーション
    param('projectName')
      .notEmpty()
      .withMessage('projectName is required')
      .isString()
      .withMessage('projectName must be a string')
      .isLength({ min: 1, max: 255 })
      .withMessage('projectName must be 1-255 characters'),
    
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
 * PATCH /api/v1/progress/projects/:projectName/methods/:methodId/transitions/:transitionId/status
 * 
 * @middleware authMiddleware - JWT認証
 * @middleware checkPermission - 権限チェック（機能CD: 050000 実験作業者メニュー、書込可）
 * @middleware handleValidationErrors - バリデーションエラーハンドリング
 * @description プロジェクト名、メソッドID、トランジションIDでトランジションを特定してステータスを更新
 * @note API #6: トランジションステータス更新API（旧: PUT /api/v1/experiments/...から移動）
 * @requirements REQ-1, REQ-2, REQ-3, REQ-4, REQ-5, REQ-6, REQ-7, REQ-8, REQ-9
 * @roles experiment_worker（書込可）
 */
router.patch(
  '/projects/:projectName/methods/:methodId/transitions/:transitionId/status',
  authMiddleware,
  checkPermission('050000', 1),
  [
    // パスパラメータバリデーション
    validateParamString('projectName', 1, 255),
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
      .isIn(['initial', 'preparing', 'ready', 'running', 'paused', 'completed', 'error'])
      .withMessage('statusはinitial, preparing, ready, running, paused, completed, errorのいずれかである必要があります'),
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

export default router;
