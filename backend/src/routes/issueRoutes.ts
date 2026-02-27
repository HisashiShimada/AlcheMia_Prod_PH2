/**
 * 問題報告ルート
 * 
 * @description 実験作業中の問題報告・管理APIのルーティング定義
 * @see docs/design/api/api_issue_management.md
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import * as issueController from '../controllers/issueController';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantIsolation } from '../middleware/tenantIsolation';
import { checkPermission } from '../middleware/permissionCheckMiddleware';
import { handleValidationErrors } from '../middleware/validationMiddleware';
const router = Router();

/**
 * 問題報告
 * POST /api/v1/issues
 * 
 * @middleware authMiddleware - JWT認証
 * @middleware tenantIsolation - テナント分離
 * @description プロジェクト、タスクまたはトランジション単位で問題を報告
 * @requirements REQ-001, REQ-002, REQ-003, REQ-004
 * @roles worker, manager, admin
 */
router.post(
  '/',
  authMiddleware,
  tenantIsolation,
  checkPermission('050000', 1),
  [
    body('projectId')
      .notEmpty()
      .withMessage('projectIdは必須です')
      .isString()
      .withMessage('projectIdは文字列である必要があります'),
    body('methodId')
      .optional()
      .isString()
      .withMessage('methodIdは文字列である必要があります'),
    body('issueType')
      .notEmpty()
      .withMessage('issueTypeは必須です'),
    body('targetType')
      .notEmpty()
      .withMessage('targetTypeは必須です')
      .isIn(['project', 'task', 'transition'])
      .withMessage('targetTypeは"project", "task", "transition"のいずれかである必要があります'),
    body('taskNo')
      .optional()
      .isInt({ min: 1 })
      .withMessage('taskNoは1以上の整数である必要があります'),
    body('transitionId')
      .optional()
      .isString()
      .withMessage('transitionIdは文字列である必要があります'),
    body('title')
      .trim()
      .notEmpty()
      .withMessage('titleは必須です')
      .isLength({ min: 1, max: 200 })
      .withMessage('titleは1〜200文字である必要があります'),
    body('description')
      .trim()
      .notEmpty()
      .withMessage('descriptionは必須です')
      .isLength({ min: 1, max: 2000 })
      .withMessage('descriptionは1〜2000文字である必要があります'),
  ],
  handleValidationErrors,
  issueController.create
);

/**
 * コメント投稿
 * POST /api/v1/issues/comments
 * 
 * @middleware authMiddleware - JWT認証
 * @middleware tenantIsolation - テナント分離
 * @middleware checkPermission - 権限チェック（experiment_workerのみ）
 * @description 既存の問題にコメントを追加
 * @requirements REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006
 * @roles experiment_worker
 */
router.post(
  '/comments',
  authMiddleware,
  tenantIsolation,
  checkPermission('050000', 1),
  [
    body('projectName')
      .trim()
      .notEmpty()
      .withMessage('projectNameは必須です')
      .isString()
      .withMessage('projectNameは文字列である必要があります'),
    body('issueId')
      .trim()
      .notEmpty()
      .withMessage('issueIdは必須です')
      .isString()
      .withMessage('issueIdは文字列である必要があります'),
    body('comment')
      .trim()
      .notEmpty()
      .withMessage('commentは必須です')
      .isLength({ min: 1, max: 2000 })
      .withMessage('commentは1〜2000文字である必要があります'),
  ],
  handleValidationErrors,
  issueController.addComment
);

/**
 * 問題一覧取得
 * GET /api/v1/issues
 * 
 * @middleware authMiddleware - JWT認証
 * @middleware tenantIsolation - テナント分離
 * @middleware checkPermission - 権限チェック
 * @description プロジェクト・メソッド・タスク・トランジション単位で発生した問題一覧とコメントを取得
 * @requirements REQ-001, REQ-003, REQ-004
 * @roles worker, manager, admin
 */
router.get(
  '/',
  authMiddleware,
  tenantIsolation,
  checkPermission('050000', 0),
  [
    query('projectId')
      .notEmpty()
      .withMessage('projectIdは必須です')
      .isString()
      .withMessage('projectIdは文字列である必要があります'),
    query('methodId')
      .notEmpty()
      .withMessage('methodIdは必須です')
      .isString()
      .withMessage('methodIdは文字列である必要があります'),
    query('taskNo')
      .notEmpty()
      .withMessage('taskNoは必須です')
      .isInt({ min: 1 })
      .withMessage('taskNoは1以上の整数である必要があります'),
    query('transitionId')
      .notEmpty()
      .withMessage('transitionIdは必須です')
      .isString()
      .withMessage('transitionIdは文字列である必要があります'),
    query('status')
      .optional()
      .isIn(['unresolved', 'resolved'])
      .withMessage('statusは"unresolved"または"resolved"である必要があります'),
    query('issueType')
      .optional()
      .isIn([
        'material_shortage',
        'equipment_failure',
        'procedure_unclear',
        'safety_concern',
        'quality_issue',
        'time_constraint',
        'other'
      ])
      .withMessage('issueTypeは許可された値である必要があります'),
  ],
  handleValidationErrors,
  issueController.list
);

/**
 * 問題詳細取得
 * GET /api/v1/issues/:issueId
 * 
 * @middleware authMiddleware - JWT認証
 * @middleware tenantIsolation - テナント分離
 * @description 問題の詳細情報とコメント履歴を取得
 * @requirements REQ-009
 * @roles worker, manager, admin
 */
router.get(
  '/:issueId',
  authMiddleware,
  tenantIsolation,
  [
    param('issueId')
      .isUUID()
      .withMessage('issueIdはUUID形式である必要があります'),
  ],
  issueController.getById
);

/**
 * 問題ステータス変更
 * PATCH /api/v1/issues/status
 * 
 * @middleware authMiddleware - JWT認証
 * @middleware tenantIsolation - テナント分離
 * @middleware checkPermission - 権限チェック（experiment_workerのみ）
 * @middleware validationMiddleware - バリデーション
 * @description 問題のステータスを「未解決」または「解決済」に変更
 * @requirements REQ-010, REQ-011
 * @roles experiment_worker
 */
router.patch(
  '/status',
  authMiddleware,
  tenantIsolation,
  checkPermission('050000', 1),
  [
    body('projectName')
      .trim()
      .notEmpty()
      .withMessage('projectNameは必須です')
      .isString()
      .withMessage('projectNameは文字列である必要があります'),
    body('issueId')
      .trim()
      .notEmpty()
      .withMessage('issueIdは必須です')
      .isString()
      .withMessage('issueIdは文字列である必要があります')
      .isLength({ min: 1, max: 50 })
      .withMessage('issueIdは1〜50文字である必要があります'),
    body('status')
      .notEmpty()
      .withMessage('statusは必須です')
      .isInt({ min: 0, max: 1 })
      .withMessage('statusは0（未解決）または1（解決）である必要があります'),
  ],
  handleValidationErrors,
  issueController.updateStatus
);

export default router;