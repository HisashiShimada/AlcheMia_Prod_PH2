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
import { checkPermission } from '../middleware/permissionCheckMiddleware';
import { validateParamString, validateParamInt } from '../utils/validators';
import {
  getExperimentInstructions,
  getProjectMethods,
  approveTask,
  recordNg,
  getPlanDialogData,
  getUncertaintyJudgeSummary,
  correctRecord,
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

// ──────────────────────────────────────────────
// 不確かさ判定集計
// ──────────────────────────────────────────────

// 定量評価（不確かさ判定）集計取得
router.get(
  '/:projectId/uncertainty-judge-summary',
  authMiddleware,
  [validateParamString('projectId', 1, 255)],
  handleValidationErrors,
  getUncertaintyJudgeSummary
);

// ──────────────────────────────────────────────
// 記録値訂正
// ──────────────────────────────────────────────

// 記録値（実績値）訂正
// PATCH /api/v1/projects/:projectId/experiment-instructions/:methodId/:taskNo/correct
// 権限: experiment_admin（040000）書込可
router.patch(
  '/:projectId/experiment-instructions/:methodId/:taskNo/correct',
  authMiddleware,
  checkPermission('040000', 1),
  [
    validateParamString('projectId', 1, 255),
    validateParamString('methodId', 1, 255),
    validateParamInt('taskNo', 1),
    body('records')
      .isArray({ min: 1 })
      .withMessage('records は1件以上の配列である必要があります'),
    body('records.*.placeId')
      .notEmpty()
      .withMessage('placeId は必須です')
      .isString()
      .withMessage('placeId は文字列である必要があります'),
    body('records.*.data')
      .exists()
      .withMessage('data は必須です'),
    body('records.*.data.templateId')
      .notEmpty()
      .withMessage('data.templateId は必須です'),
    body('records.*.data.templateType')
      .isIn(['material', 'condition', 'result'])
      .withMessage('data.templateType は material, condition, result のいずれかである必要があります'),
    body('records.*.data.properties')
      .isArray()
      .withMessage('data.properties は配列である必要があります'),
  ],
  handleValidationErrors,
  correctRecord
);

export default router;

