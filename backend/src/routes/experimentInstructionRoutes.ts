/**
 * 実験指示・実験計画ルート
 *
 * エンドポイント（実験指示）:
 *   GET  /api/v1/projects/:projectId/experiment-instructions
 *   GET  /api/v1/projects/:projectId/methods
 *   PUT  /api/v1/projects/:projectId/tasks/:methodId/:taskNo/approve
 *   PUT  /api/v1/projects/:projectId/tasks/:methodId/:taskNo/ng
 *   GET  /api/v1/projects/:projectId/methods/:methodId/plan-dialog-data
 *
 * エンドポイント（実験計画）:
 *   GET    /api/v1/projects/:projectId/experiment-plans?methodId=xxx
 *   PUT    /api/v1/projects/:projectId/experiment-plans/:methodId/:taskNo
 *   DELETE /api/v1/projects/:projectId/experiment-plans/:methodId
 */

import { Router } from 'express';
import { body, query } from 'express-validator';
import { authMiddleware } from '../middleware/authMiddleware';
import { handleValidationErrors } from '../middleware/validationMiddleware';
import { validateParamString, validateParamInt } from '../utils/validators';
import {
  getExperimentInstructions,
  getProjectMethods,
  approveTask,
  recordNg,
  getPlanDialogData,
} from '../controllers/experimentInstructionController';
import {
  getExperimentPlans,
  upsertExperimentPlan,
  deleteExperimentPlans,
} from '../controllers/experimentPlanController';

const router = Router();

// ──────────────────────────────────────────────
// 実験指示
// ──────────────────────────────────────────────

// 実験指示一覧取得
router.get(
  '/:projectId/experiment-instructions',
  authMiddleware,
  [validateParamString('projectId', 1, 255)],
  handleValidationErrors,
  getExperimentInstructions
);

// プロジェクトのメソッドID一覧取得
router.get(
  '/:projectId/methods',
  authMiddleware,
  [validateParamString('projectId', 1, 255)],
  handleValidationErrors,
  getProjectMethods
);

// タスク承認
router.put(
  '/:projectId/tasks/:methodId/:taskNo/approve',
  authMiddleware,
  [
    validateParamString('projectId', 1, 255),
    validateParamString('methodId', 1, 255),
    validateParamInt('taskNo', 1),
  ],
  handleValidationErrors,
  approveTask
);

// タスク NG 記録
router.put(
  '/:projectId/tasks/:methodId/:taskNo/ng',
  authMiddleware,
  [
    validateParamString('projectId', 1, 255),
    validateParamString('methodId', 1, 255),
    validateParamInt('taskNo', 1),
    body('ngReason')
      .notEmpty()
      .withMessage('ngReason は必須です')
      .isString()
      .withMessage('ngReason は文字列である必要があります')
      .trim()
      .notEmpty()
      .withMessage('ngReason は空文字列にできません'),
  ],
  handleValidationErrors,
  recordNg
);

// ExperimentPlanDialog 用データ取得
router.get(
  '/:projectId/methods/:methodId/plan-dialog-data',
  authMiddleware,
  [
    validateParamString('projectId', 1, 255),
    validateParamString('methodId', 1, 255),
  ],
  handleValidationErrors,
  getPlanDialogData
);

// ──────────────────────────────────────────────
// 実験計画
// ──────────────────────────────────────────────

// 指定メソッドの全タスク分の実験計画を取得
router.get(
  '/:projectId/experiment-plans',
  authMiddleware,
  [
    validateParamString('projectId', 1, 255),
    query('methodId')
      .notEmpty()
      .withMessage('methodId クエリパラメータは必須です')
      .isString()
      .withMessage('methodId は文字列である必要があります'),
  ],
  handleValidationErrors,
  getExperimentPlans
);

// 1タスク分の実験計画を保存（UPSERT）
router.put(
  '/:projectId/experiment-plans/:methodId/:taskNo',
  authMiddleware,
  [
    validateParamString('projectId', 1, 255),
    validateParamString('methodId', 1, 255),
    validateParamInt('taskNo', 1),
    body('plannedValues')
      .notEmpty()
      .withMessage('plannedValues は必須です')
      .isObject()
      .withMessage('plannedValues はオブジェクトである必要があります'),
  ],
  handleValidationErrors,
  upsertExperimentPlan
);

// 指定メソッドの全タスク分の実験計画を削除
router.delete(
  '/:projectId/experiment-plans/:methodId',
  authMiddleware,
  [
    validateParamString('projectId', 1, 255),
    validateParamString('methodId', 1, 255),
  ],
  handleValidationErrors,
  deleteExperimentPlans
);

export default router;
