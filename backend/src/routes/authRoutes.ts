import { Router } from 'express';
import { body, header, query, oneOf } from 'express-validator';
import * as authController from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import { handleValidationErrors } from '../middleware/validationMiddleware';
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id', 'X-Amzn-Mtls-Clientcert-Subject'],
};

router.use(cors(corsOptions));

// 共通バリデータ関数: mTLSヘッダー・X-Organization-Idヘッダー・クエリパラメータのいずれかにorgIdがあればOK
// 優先順位:
//   ① x-amzn-mtls-clientcert-subject（ALB mTLS が自動付与 / 新ALB構成）
//   ② x-organization-id（nginx が付与 / 既存nginx構成）
//   ③ orgId クエリパラメータ（ローカル開発・後方互換）
const validateOrgId = () => {
  return oneOf([
    header('x-amzn-mtls-clientcert-subject')
      .notEmpty()
      .withMessage('組織のIDは必須です'),
    header('x-organization-id')
      .notEmpty()
      .withMessage('組織のIDは必須です'),
    query('orgId')
      .notEmpty()
      .withMessage('組織のIDは必須です'),
  ], { message: '組織のIDは必須です' });
};

// 1. ログインエンドポイント
// POST /api/v1/auth/login
// 注意: X-Organization-Idは不要（証明書から自動設定）
router.post(
  '/login',
  loginRateLimit,
  [
    body('userId')
      .notEmpty()
      .withMessage('ユーザーIDは必須です')
      .isLength({ min: 1, max: 100 })
      .withMessage('ユーザーIDは 1〜100文字の範囲で入力してください'),
    body('password')
      .notEmpty()
      .withMessage('パスワードは必須です')
      .isLength({ min: 8, max: 255 })
      .withMessage('パスワードは 8〜255文字の範囲で入力してください'),
    validateOrgId(),
  ],
  handleValidationErrors,
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
      .withMessage('PIN コードは必須です')
      .matches(/^\d{6}$/)
      .withMessage('PIN コードは 6 桁で入力してください'),
    header('authorization')
      .notEmpty()
      .withMessage('Authorization ヘッダーは必須です')
      .matches(/^Bearer .+$/)
      .withMessage('Bearer スキームは必須です'),
    validateOrgId(),
  ],
  handleValidationErrors,
  authController.verifyPin
);

// 3. PINコード再送信エンドポイント
// POST /api/v1/auth/resend-pin
router.post(
  '/resend-pin',
  pinResendRateLimit,
  [
    header('authorization')
      .notEmpty()
      .withMessage('Authorization ヘッダーは必須です')
      .matches(/^Bearer .+$/)
      .withMessage('Bearer スキームは必須です'),
    validateOrgId(),
  ],
  handleValidationErrors,
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

// 9. セッションハートビートエンドポイント
// POST /api/v1/auth/heartbeat
router.post(
  '/heartbeat',
  authMiddleware,
  authController.heartbeat
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
      .withMessage('メールアドレスは必須です')
      .isEmail()
      .withMessage('有効なメールアドレスが必要です')
      .isLength({ min: 1, max: 100 })
      .withMessage('メールアドレスは 1〜100文字の範囲で入力してください'),
    validateOrgId(),
  ],
  handleValidationErrors,
  authController.resetPasswordRequest
);

// 7. パスワードリセット実行エンドポイント
// POST /api/v1/auth/reset-password
router.post(
  '/reset-password',
  [
    body('resetToken')
      .notEmpty()
      .withMessage('リセットトークンは必須です'),
    body('newPassword')
      .notEmpty()
      .withMessage('新しいパスワードは必須です')
      .isLength({ min: 8, max: 255 })
      .withMessage('パスワードは 8〜255文字の範囲で入力してください'),
  ],
  handleValidationErrors,
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
      .withMessage('現在のパスワードは必須です'),
    body('newPassword')
      .notEmpty()
      .withMessage('新しいパスワードは必須です')
      .isLength({ min: 8, max: 255 })
      .withMessage('パスワードは 8〜255文字の範囲で入力してください'),
  ],
  handleValidationErrors,
  authController.changePassword
);

export default router;
