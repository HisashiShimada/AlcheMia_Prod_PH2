import { Router } from 'express';
import { body, header } from 'express-validator';
import * as authController from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  loginRateLimit,
  pinVerifyRateLimit,
  pinResendRateLimit,
  passwordResetRequestRateLimit,
} from '../middleware/rateLimitMiddleware';
import cors from 'cors';

const router = Router();

// CORS設定
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
};

router.use(cors(corsOptions));

// バリデーションヘルパー
const validateOrganizationHeader = header('X-Organization-Id')
  .notEmpty()
  .withMessage('Organization ID is required')
  .isUUID()
  .withMessage('Invalid organization ID format');

// 1. ログインエンドポイント
// POST /api/v1/auth/login
router.post(
  '/login',
  loginRateLimit,
  [
    validateOrganizationHeader,
    body('username')
      .notEmpty()
      .withMessage('Username is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Username must be between 1 and 100 characters')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username must contain only alphanumeric characters, underscores, and hyphens'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 8, max: 255 })
      .withMessage('Password must be between 8 and 255 characters'),
  ],
  authController.login
);

// 2. PINコード検証エンドポイント
// POST /api/v1/auth/verify-pin
router.post(
  '/verify-pin',
  pinVerifyRateLimit,
  [
    body('pinCode')
      .notEmpty()
      .withMessage('PIN code is required')
      .matches(/^\d{6}$/)
      .withMessage('PIN code must be exactly 6 digits'),
  ],
  authController.verifyPin
);

// 3. PINコード再送信エンドポイント
// POST /api/v1/auth/resend-pin
router.post(
  '/resend-pin',
  pinResendRateLimit,
  authController.resendPin
);

// 4. ログアウトエンドポイント
// POST /api/v1/auth/logout
router.post(
  '/logout',
  authMiddleware,
  authController.logout
);

// 5. パスワードリセット要求エンドポイント
// POST /api/v1/auth/reset-password-request
router.post(
  '/reset-password-request',
  passwordResetRequestRateLimit,
  [
    validateOrganizationHeader,
    body('username')
      .notEmpty()
      .withMessage('Username is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Username must be between 1 and 100 characters'),
  ],
  authController.resetPasswordRequest
);

// 6. パスワードリセット実行エンドポイント
// POST /api/v1/auth/reset-password
router.post(
  '/reset-password',
  [
    body('resetToken')
      .notEmpty()
      .withMessage('Reset token is required'),
    body('newPassword')
      .notEmpty()
      .withMessage('New password is required')
      .isLength({ min: 8, max: 255 })
      .withMessage('Password must be between 8 and 255 characters'),
  ],
  authController.resetPassword
);

export default router;
