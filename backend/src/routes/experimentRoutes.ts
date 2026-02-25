/**
 * 実験管理関連ルート
 * 
 * @description 実験データ記録、トランジションステータス更新などのエンドポイント定義
 */

import { Router } from 'express';
import { param, body, query } from 'express-validator';
import * as experimentController from '../controllers/experimentController';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantIsolation } from '../middleware/tenantIsolation';
import { checkPermission } from '../middleware/permissionCheckMiddleware';
import { handleValidationErrors } from '../middleware/validationMiddleware';

const router = Router();

/**
 * テンプレート実績一覧取得
 * GET /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data
 *
 * @middleware authMiddleware - JWT認証
 * @middleware tenantIsolation - テナント分離
 * @middleware checkPermission - 権限チェック (experiment_worker 読取可)
 * @description 指定トランジションに隣接するプレースのテンプレート実績一覧を返す
 * @roles experiment_worker 以上
 */
router.get(
  '/projects/:projectName/methods/:methodId/tasks/:taskNo/data',
  authMiddleware,
  tenantIsolation,
  checkPermission('050000', 0), // 実験作業者メニュー（experiment_worker）読取可
  [
    param('projectName')
      .trim()
      .notEmpty()
      .withMessage('projectNameは必須です')
      .isLength({ min: 1, max: 255 })
      .withMessage('projectNameは1〜255文字である必要があります'),
    param('methodId')
      .trim()
      .notEmpty()
      .withMessage('methodIdは必須です')
      .isLength({ min: 1, max: 255 })
      .withMessage('methodIdは1〜255文字である必要があります'),
    param('taskNo')
      .isInt({ min: 1 })
      .withMessage('taskNoは1以上の整数である必要があります'),
    query('transitionId')
      .trim()
      .notEmpty()
      .withMessage('transitionIdは必須です')
      .isLength({ min: 1, max: 255 })
      .withMessage('transitionIdは1〜255文字である必要があります'),
  ],
  handleValidationErrors,
  experimentController.getTemplateData
);

/**
 * 実験データ一括保存
 * POST /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data
 * 
 * @middleware authMiddleware - JWT認証
 * @middleware tenantIsolation - テナント分離
 * @middleware checkPermission - 権限チェック (experiment_worker のみ書込可)
 * @description 複数プレースの実験データを一括保存
 * @note Task 5.1: バリデーションルール定義
 * @requirements REQ-1, REQ-5
 * @roles experiment_worker のみ
 */
router.post(
  '/projects/:projectName/methods/:methodId/tasks/:taskNo/data',
  authMiddleware,
  tenantIsolation,
  checkPermission('050000', 1), // 実験作業者メニュー（experiment_worker）のみ書込可
  [
    // パスパラメータのバリデーション
    param('projectName')
      .trim()
      .notEmpty()
      .withMessage('projectNameは必須です')
      .isLength({ min: 1, max: 255 })
      .withMessage('projectNameは1〜255文字である必要があります'),
    param('methodId')
      .trim()
      .notEmpty()
      .withMessage('methodIdは必須です')
      .isLength({ min: 1, max: 255 })
      .withMessage('methodIdは1〜255文字である必要があります'),
    param('taskNo')
      .isInt({ min: 1 })
      .withMessage('taskNoは1以上の整数である必要があります'),
    
    // records配列のバリデーション
    body('records')
      .isArray({ min: 1, max: 50 })
      .withMessage('recordsは1件以上50件以下の配列である必要があります'),
    
    // records配列の各要素のバリデーション
    body('records.*.placeId')
      .trim()
      .notEmpty()
      .withMessage('placeIdは必須です')
      .isLength({ min: 1, max: 255 })
      .withMessage('placeIdは1〜255文字である必要があります'),
    body('records.*.templateType')
      .trim()
      .notEmpty()
      .withMessage('templateTypeは必須です')
      .isIn(['material', 'condition', 'result'])
      .withMessage('templateTypeは material, condition, result のいずれかである必要があります'),
    body('records.*.templateId')
      .trim()
      .notEmpty()
      .withMessage('templateIdは必須です')
      .isLength({ min: 1, max: 255 })
      .withMessage('templateIdは1〜255文字である必要があります'),
    body('records.*.data')
      .exists()
      .withMessage('dataは必須です')
      .custom((value) => {
        if (typeof value !== 'object' || value === null) {
          throw new Error('dataはオブジェクト形式である必要があります');
        }
        return true;
      }),
    body('records.*.status')
      .optional()
      .trim()
      .isIn(['initial', 'preparing', 'ready', 'running', 'paused', 'completed', 'error'])
      .withMessage('statusは initial, preparing, ready, running, paused, completed, error のいずれかである必要があります'),
    body('records.*.comment')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('commentは2000文字以内で入力してください'),
  ],
  handleValidationErrors,
  experimentController.saveBatchData
);

/**
 * 注意: トランジションステータス更新APIは progressRoutes.ts に移動しました
 * 
 * 旧エンドポイント: PUT /api/v1/experiments/projects/:projectId/methods/:methodId/transitions/:transitionId/status
 * 新エンドポイント: PATCH /api/v1/progress/projects/:projectName/methods/:methodId/transitions/:transitionId/status
 * 
 * 移動日: 2026-02-18
 * 参照: docs/20260218_1730_トランジションステータス更新API移動_PLAN.md
 * API仕様: docs/design/api/api_progress_monitoring.md - API #6
 */

export default router;
