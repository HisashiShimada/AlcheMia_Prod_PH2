/**
 * タスク管理関連ルート
 * 
 * @description タスク一覧取得、タスクステータス更新などのエンドポイント定義
 * Task: 1.1 ルート定義とバリデーション実装
 * Task: 3.3 タスク一覧取得エンドポイント追加
 */

import { Router } from 'express';
import { param, body, query } from 'express-validator';
import * as taskController from '../controllers/taskController';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantIsolation } from '../middleware/tenantIsolation';
import { handleValidationErrors } from '../middleware/validationMiddleware';

const router = Router();

/**
 * タスク一覧取得（メソッド別グループ化）
 * GET /api/v1/tasks
 * 
 * @middleware authMiddleware - JWT認証
 * @middleware tenantIsolation - テナント分離
 * @description プロジェクト内の全タスクをメソッド単位でグループ化して取得する
 * @note Task 3.3: タスク一覧取得エンドポイント追加
 * @requirements REQ-1, REQ-2, REQ-3, REQ-4, REQ-5, REQ-6, REQ-7, REQ-9
 * @roles experiment_admin, experiment_worker, system_admin
 */
router.get(
  '/',
  authMiddleware,
  tenantIsolation,
  [
    // クエリパラメータバリデーション
    query('projectId')
      .notEmpty()
      .withMessage('projectId is required')
      .isUUID()
      .withMessage('projectId must be a valid UUID'),
    query('methodId')
      .optional()
      .isUUID()
      .withMessage('methodId must be a valid UUID'),
    query('status')
      .optional()
      .isIn(['not_started', 'started', 'in_progress', 'completed', 'forced_terminated'])
      .withMessage('status must be one of: not_started, started, in_progress, completed, forced_terminated'),
    query('assignUserId')
      .optional()
      .isUUID()
      .withMessage('assignUserId must be a valid UUID'),
    query('sortBy')
      .optional()
      .isIn(['task_no', 'created_at', 'updated_at', 'status'])
      .withMessage('sortBy must be one of: task_no, created_at, updated_at, status'),
    query('order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('order must be either asc or desc'),
  ],
  taskController.list
);

/**
 * タスクステータス更新
 * PUT /api/v1/projects/:projectId/methods/:methodId/tasks/:taskNo/status
 * 
 * @middleware authMiddleware - JWT認証
 * @description 実験タスクのステータスを更新する
 * @note Task 1.1: タスクステータス更新エンドポイント追加
 * @requirements REQ-1.1, REQ-4.1, REQ-4.2, REQ-4.3, REQ-4.4, REQ-8.1, REQ-8.2, REQ-8.4
 * @roles experiment_worker, experiment_admin, system_admin
 */
router.put(
  '/:projectId/methods/:methodId/tasks/:taskNo/status',
  authMiddleware,
  [
    // パラメータバリデーション
    param('projectId')
      .isUUID()
      .withMessage('projectIdはUUID形式である必要があります'),
    param('methodId')
      .notEmpty()
      .withMessage('methodIdは必須です'),
    param('taskNo')
      .isInt({ min: 1 })
      .withMessage('taskNoは1以上の整数である必要があります'),
    
    // リクエストボディバリデーション
    body('status')
      .notEmpty()
      .withMessage('statusは必須です')
      .isIn(['pending', 'in_progress', 'completed', 'forced_terminated'])
      .withMessage('statusはpending, in_progress, completed, forced_terminatedのいずれかである必要があります'),
    body('currentUpdateAt')
      .notEmpty()
      .withMessage('currentUpdateAtは必須です')
      .isISO8601()
      .withMessage('currentUpdateAtはISO8601形式のタイムスタンプである必要があります'),
    body('comment')
      .optional()
      .isLength({ max: 500 })
      .withMessage('commentは500文字以内である必要があります'),
  ],
  handleValidationErrors,
  taskController.updateStatus
);

export default router;