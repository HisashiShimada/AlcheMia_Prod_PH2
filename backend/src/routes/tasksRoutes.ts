/**
 * タスク関連ルート定義
 *
 * @description タスク詳細取得などのエンドポイント定義
 * ベースパス: /api/v1/tasks
 */

import { Router } from 'express';
import { param } from 'express-validator';
import * as projectController from '../controllers/projectController';
import { authMiddleware } from '../middleware/authMiddleware';
import { checkPermission } from '../middleware/permissionCheckMiddleware';
import { handleValidationErrors } from '../middleware/validationMiddleware';

const router = Router();

/**
 * タスク詳細取得
 * GET /api/v1/tasks/:taskId
 *
 * @middleware authMiddleware - JWT認証
 * @middleware checkPermission - 権限チェック（機能CD: 040000 実験管理者メニュー、読取専用）
 *
 * @param taskId - "{projectId}__{methodId}__{taskNo}" 形式のタスクID
 *   例: "550e8400-e29b-41d4-a716-446655440000__method1__3"
 *
 * @returns タスク基本情報 + トランジション進捗一覧 + 統計情報
 *
 * @roles experiment_admin（読取専用）
 */
router.get(
  '/:taskId',
  authMiddleware,
  checkPermission('040000', 0),
  [
    param('taskId')
      .notEmpty()
      .withMessage('taskId は必須です')
      .isString()
      .withMessage('taskId は文字列である必要があります')
      .matches(/^.+__.+__\d+$/)
      .withMessage(
        'taskId のフォーマットが不正です。"{projectId}__{methodId}__{taskNo}" 形式で指定してください'
      ),
  ],
  handleValidationErrors,
  projectController.getTaskDetail
);

export default router;
