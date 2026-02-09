import { Router } from 'express';
import { body } from 'express-validator';
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

// 1. ログインエンドポイント
// POST /api/v1/auth/login
// 注意: X-Organization-Idは不要（証明書から自動設定）
router.post(
  '/login',
  loginRateLimit,
  [
    body('userId')
      .notEmpty()
      .withMessage('User ID is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('User ID must be between 1 and 100 characters'),
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

// 4. トークン更新エンドポイント
// POST /api/v1/auth/refresh
// 注意: 認証ミドルウェアは不要（リフレッシュトークン自体が認証情報）
// 注意: リフレッシュトークンはhttpOnly CookieからcontrollerIDE取得するため、bodyバリデーション不要
router.post(
  '/refresh',
  pinVerifyRateLimit, // 既存のレート制限を再利用（15分に5回）
  authController.refreshToken
);

// 5. ログアウトエンドポイント
// POST /api/v1/auth/logout
router.post(
  '/logout',
  authMiddleware,
  authController.logout
);

// 6. パスワードリセット要求エンドポイント
// POST /api/v1/auth/reset-password-request
// 注意: X-Organization-Idは不要（証明書から自動設定）
router.post(
  '/reset-password-request',
  passwordResetRequestRateLimit,
  [
    body('email')
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Valid email is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Email must be between 1 and 100 characters'),
  ],
  authController.resetPasswordRequest
);

// 7. パスワードリセット実行エンドポイント
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

// 8. パスワード変更エンドポイント（認証済みユーザー用）
// POST /api/v1/auth/change-password
router.post(
  '/change-password',
  authMiddleware,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .notEmpty()
      .withMessage('New password is required')
      .isLength({ min: 8, max: 255 })
      .withMessage('Password must be between 8 and 255 characters'),
  ],
  authController.changePassword
);

export default router;
