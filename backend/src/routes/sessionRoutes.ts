/**
 * セッション管理ルート
 * 
 * @description
 * - セッション一覧取得
 * - セッション強制終了
 * - System Admin権限必須
 */

import { Router } from 'express';
import { param } from 'express-validator';
import * as sessionController from '../controllers/sessionController';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantIsolation } from '../middleware/tenantIsolation';
import { handleValidationErrors } from '../middleware/validationMiddleware';

const router = Router();

/**
 * セッション一覧取得
 * GET /api/v1/sessions
 * 
 * @description
 * - System Admin権限必須
 * - 自組織のアクティブセッションのみ取得（マルチテナント分離）
 */
router.get(
  '/',
  authMiddleware,
  tenantIsolation,
  sessionController.list
);

/**
 * セッション強制終了
 * DELETE /api/v1/sessions/:tokenId
 * 
 * @description
 * - System Admin権限必須
 * - 自組織のセッションのみ終了可能（マルチテナント分離）
 * - 自分自身のセッションは終了不可
 */
router.delete(
  '/:tokenId',
  authMiddleware,
  tenantIsolation,
  [
    param('tokenId')
      .notEmpty()
      .withMessage('トークンIDは必須です')
      .isUUID()
      .withMessage('トークンID は有効な UUID でなければなりません'),
  ],
  handleValidationErrors,
  sessionController.terminate
);

export default router;
