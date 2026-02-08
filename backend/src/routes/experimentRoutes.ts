/**
 * 実験管理関連ルート
 * 
 * @description 実験データ記録、トランジションステータス更新などのエンドポイント定義
 */

import { Router } from 'express';
import { param } from 'express-validator';
import * as experimentController from '../controllers/experimentController';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantIsolation } from '../middleware/tenantIsolation';
import { updateStatusValidator } from '../middleware/validators/transitionStatusValidator';

const router = Router();

/**
 * トランジションステータス更新
 * PUT /api/v1/experiments/projects/:projectId/methods/:methodId/transitions/:transitionId/status
 * 
 * @middleware authMiddleware - JWT認証
 * @middleware tenantIsolation - テナント分離
 * @middleware updateStatusValidator - ステータス値のバリデーション
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
    ...updateStatusValidator,
  ],
  experimentController.updateTransitionStatus
);

export default router;