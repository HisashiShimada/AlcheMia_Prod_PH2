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
  [
    body('projectId')
      .notEmpty()
      .withMessage('projectIdは必須です')
      .isUUID()
      .withMessage('projectIdはUUID形式である必要があります'),
    body('methodId')
      .optional()
      .isString()
      .withMessage('methodIdは文字列である必要があります'),
    body('issueType')
      .notEmpty()
      .withMessage('issueTypeは必須です')
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
      .notEmpty()
      .withMessage('titleは必須です')
      .isLength({ min: 1, max: 200 })
      .withMessage('titleは1〜200文字である必要があります'),
    body('description')
      .notEmpty()
      .withMessage('descriptionは必須です')
      .isLength({ min: 1, max: 2000 })
      .withMessage('descriptionは1〜2000文字である必要があります'),
  ],
  issueController.create
);

/**
 * コメント投稿
 * POST /api/v1/issues/:issueId/comments
 * 
 * @middleware authMiddleware - JWT認証
 * @middleware tenantIsolation - テナント分離
 * @description 既存の問題にコメントを追加
 * @requirements REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006
 * @roles worker, manager, admin
 */
router.post(
  '/:issueId/comments',
  authMiddleware,
  tenantIsolation,
  [
    param('issueId')
      .isUUID()
      .withMessage('issueIdはUUID形式である必要があります'),
    body('comment')
      .notEmpty()
      .withMessage('commentは必須です')
      .isLength({ min: 1, max: 2000 })
      .withMessage('commentは1〜2000文字である必要があります'),
  ],
  issueController.addComment
);

/**
 * 問題一覧取得
 * GET /api/v1/issues
 * 
 * @middleware authMiddleware - JWT認証
 * @middleware tenantIsolation - テナント分離
 * @description プロジェクト・メソッド・タスク・トランジション単位で発生した問題一覧とコメントを取得
 * @requirements REQ-001, REQ-003, REQ-004
 * @roles worker, manager, admin
 */
router.get(
  '/',
  authMiddleware,
  tenantIsolation,
  [
    query('project_id')
      .notEmpty()
      .withMessage('project_idは必須です')
      .isUUID()
      .withMessage('project_idはUUID形式である必要があります'),
    query('method_id')
      .notEmpty()
      .withMessage('method_idは必須です')
      .isString()
      .withMessage('method_idは文字列である必要があります'),
    query('task_no')
      .notEmpty()
      .withMessage('task_noは必須です')
      .isInt({ min: 1 })
      .withMessage('task_noは1以上の整数である必要があります'),
    query('transition_id')
      .notEmpty()
      .withMessage('transition_idは必須です')
      .isString()
      .withMessage('transition_idは文字列である必要があります'),
    query('status')
      .optional()
      .isIn(['unresolved', 'resolved'])
      .withMessage('statusは"unresolved"または"resolved"である必要があります'),
    query('issue_type')
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
      .withMessage('issue_typeは許可された値である必要があります'),
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
 * PATCH /api/v1/issues/:issueId/status
 * 
 * @middleware authMiddleware - JWT認証
 * @middleware tenantIsolation - テナント分離
 * @description 問題のステータスを「未解決」または「解決済」に変更
 * @requirements REQ-010, REQ-011
 * @roles manager, admin （workerは不可）
 */
router.patch(
  '/:issueId/status',
  authMiddleware,
  tenantIsolation,
  [
    param('issueId')
      .isUUID()
      .withMessage('issueIdはUUID形式である必要があります'),
    body('status')
      .notEmpty()
      .withMessage('statusは必須です')
      .isIn(['unresolved', 'resolved'])
      .withMessage('statusは"unresolved"または"resolved"である必要があります'),
  ],
  issueController.updateStatus
);

export default router;