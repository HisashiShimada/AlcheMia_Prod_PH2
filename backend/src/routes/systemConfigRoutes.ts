/**
 * システム設定値取得ルート
 *
 * GET /api/v1/provider/system-config
 * GET /api/v1/provider/system-config?keys=defaultRetentionDays
 */

import { Router } from 'express';
import { query } from 'express-validator';
import { authMiddleware } from '../middleware/authMiddleware';
import { handleValidationErrors } from '../middleware/validationMiddleware';
import { getSystemConfig } from '../controllers/systemConfigController';
import cors from 'cors';

const router = Router();

// CORS設定
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
};

router.use(cors(corsOptions));

/**
 * システム設定値取得
 * GET /api/v1/provider/system-config
 *
 * クエリパラメータ:
 *   keys (optional): カンマ区切りの設定キー
 *                    例: ?keys=defaultRetentionDays
 *                    省略時はホワイトリスト全件を返却
 */
router.get(
  '/system-config',
  authMiddleware,
  [
    query('keys')
      .optional()
      .isString()
      .withMessage('keys がカンマ区切りの文字列ではありません'),
  ],
  handleValidationErrors,
  getSystemConfig
);

export default router;
