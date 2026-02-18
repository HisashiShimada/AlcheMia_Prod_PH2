/**
 * 実験管理関連ルート
 * 
 * @description 実験データ記録、トランジションステータス更新などのエンドポイント定義
 */

import { Router } from 'express';
import { param, body } from 'express-validator';
import * as experimentController from '../controllers/experimentController';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantIsolation } from '../middleware/tenantIsolation';
import { handleValidationErrors } from '../middleware/validationMiddleware';

const router = Router();

/**
 * 実験データ一括保存
 * POST /api/v1/experiments/projects/:projectId/methods/:methodId/tasks/:taskNo/data
 * 
 * @middleware authMiddleware - JWT認証
 * @middleware tenantIsolation - テナント分離
 * @description 複数プレースの実験データを一括保存
 * @note Task 5.1: バリデーションルール定義
 * @requirements REQ-1, REQ-5
 * @roles experiment_worker, experiment_admin, system_admin
 */
router.post(
  '/projects/:projectId/methods/:methodId/tasks/:taskNo/data',
  authMiddleware,
  tenantIsolation,
  [
    // パスパラメータのバリデーション
    param('projectId')
      .isUUID()
      .withMessage('projectIdはUUID形式である必要があります'),
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
 * トランジションステータス更新
 * PUT /api/v1/experiments/projects/:projectId/methods/:methodId/transitions/:transitionId/status
 * 
 * @middleware authMiddleware - JWT認証
 * @middleware tenantIsolation - テナント分離
 * @description トランジションの実行状態を更新する
 * @note Task 7: ルート定義実装
 * @requirements REQ-1, REQ-3, REQ-9
 * @roles experiment_worker, experiment_admin, system_admin
 */
router.put(
  '/projects/:projectId/methods/:methodId/transitions/:transitionId/status',
  authMiddleware,
  tenantIsolation,
  [
    // パスパラメータのバリデーション
    param('projectId')
      .isUUID()
      .withMessage('projectIdはUUID形式である必要があります'),
    param('methodId')
      .notEmpty()
      .withMessage('methodIdは必須です')
      .isLength({ min: 1, max: 255 })
      .withMessage('methodIdは1〜255文字である必要があります'),
    param('transitionId')
      .notEmpty()
      .withMessage('transitionIdは必須です')
      .isLength({ min: 1, max: 255 })
      .withMessage('transitionIdは1〜255文字である必要があります'),
    
    // ボディパラメータのバリデーション
    body('taskNo')
      .notEmpty()
      .withMessage('taskNoは必須です')
      .isInt({ min: 1 })
      .withMessage('taskNoは1以上の整数である必要があります'),
    body('status')
      .trim()
      .notEmpty()
      .withMessage('statusは必須です')
      .isIn(['initial', 'preparing', 'ready', 'running', 'paused', 'completed', 'error'])
      .withMessage('statusは initial, preparing, ready, running, paused, completed, error のいずれかである必要があります'),
    body('progressRate')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('progressRateは0-100の整数である必要があります'),
    body('comment')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('commentは2000文字以内で入力してください'),
  ],
  handleValidationErrors,
  experimentController.updateTransitionStatus
);

export default router;
