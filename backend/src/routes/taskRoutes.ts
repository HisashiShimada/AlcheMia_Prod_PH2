/**
 * タスク管理関連ルート
 * 
 * @description タスクステータス更新などのエンドポイント定義
 * Task: 1.1 ルート定義とバリデーション実装
 */

import { Router } from 'express';
import { param, body } from 'express-validator';
import * as taskController from '../controllers/taskController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

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
  taskController.updateStatus
);

export default router;