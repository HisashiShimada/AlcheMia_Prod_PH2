/**
 * タスク管理関連ルート
 * 
 * @description タスク一覧取得、タスクステータス更新などのエンドポイント定義
 * Task: 1.1 ルート定義とバリデーション実装
 * Task: 3.3 タスク一覧取得エンドポイント追加
 */

import { Router } from 'express';
import { query } from 'express-validator';
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
 * @middleware handleValidationErrors - バリデーションエラーハンドリング
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
      .isLength({ min: 1, max: 50 })
      .withMessage('assignUserId must be 1-50 characters'),
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
  taskController.list
);


export default router;