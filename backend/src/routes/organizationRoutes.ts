/**
 * 組織管理ルート
 */

import { Router } from 'express';
import { query, param, body } from 'express-validator';
import * as organizationController from '../controllers/organizationController';
import { authMiddleware } from '../middleware/authMiddleware';
import { handleValidationErrors } from '../middleware/validationMiddleware';
import cors from 'cors';
import multer from 'multer';

// Multer設定（メモリストレージ使用）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('CSVファイルのみアップロード可能です'));
    }
  },
});

const router = Router();

// CORS設定
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
};

router.use(cors(corsOptions));

/**
 * Organization一覧取得
 * GET /api/v1/provider/organization
 */
router.get(
  '/organization',
  authMiddleware, // 認証ミドルウェア有効化（JWTから organizationId を取得）
  [
    query('search')
      .optional()
      .isString()
      .withMessage('検索は文字列でなければなりません'),
    query('is_active')
      .optional()
      .isBoolean()
      .withMessage('アクティブ/非アクティブは boolean（真偽値）でなければなりません'),
    query('sort_by')
      .optional()
      .isString()
      .withMessage('sort_by は文字列でなければなりません'),
    query('sort_order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('sort_order は昇順または降順のいずれかでなければなりません'),
  ],
  handleValidationErrors,
  organizationController.getOrganizations
);

/**
 * 組織CD重複チェック
 * GET /api/v1/provider/organization/check-cd/:organizationCd
 *
 * 注意: このルートは /organization/:organizationId より前に定義する必要がある
 */
router.get(
  '/organization/check-cd/:organizationCd',
  authMiddleware,
  [
    param('organizationCd')
      .notEmpty()
      .withMessage('組織CDは必須です')
      .isString()
      .withMessage('組織CDは文字列でなければなりません'),
  ],
  handleValidationErrors,
  organizationController.checkOrganizationCd
);

/**
 * 情報ダウンロード（全組織の統計情報CSV）
 *
 * GET /api/v1/provider/organization/download-information-csv
 *
 * 注意: このルートは /organization/:organizationId より前に定義する必要がある
 */
router.get(
  '/organization/download-information-csv',
  authMiddleware,
  organizationController.downloadInformationCsv
);

/**
 * OrganizationCSVダウンロード
 * GET /api/v1/provider/organization/download-csv
 * 
 * 注意: このルートは /organization/:organizationId より前に定義する必要がある
 */
router.get(
  '/organization/download-csv',
  authMiddleware, // 認証ミドルウェア有効化
  organizationController.downloadOrganizationCsv
);

/**
 * OrganizationCSVアップロード
 * POST /api/v1/provider/organization/upload-csv
 * 
 * 注意: このルートは /organization/:organizationId より前に定義する必要がある
 */
router.post(
  '/organization/upload-csv',
  authMiddleware, // 認証ミドルウェア有効化
  upload.single('file'),
  organizationController.uploadOrganizationCsv
);

/**
 * 組織のシステム管理者一覧を取得
 * GET /api/v1/provider/organization/:organizationId/system-admins
 * 
 * 注意: このルートは /organization/:organizationId より前に定義する必要がある
 */
router.get(
  '/organization/:organizationId/system-admins',
  authMiddleware,
  [
    param('organizationId')
      .notEmpty()
      .withMessage('組織IDは必須です')
      .isUUID()
      .withMessage('組織IDは有効な UUID でなければなりません'),
  ],
  handleValidationErrors,
  organizationController.getSystemAdminsByOrganizationId
);

/**
 * クライアント証明書をダウンロード
 * GET /api/v1/provider/organization/:organizationId/certificate
 * 
 * 注意: このルートは /organization/:organizationId より前に定義する必要がある
 */
router.get(
  '/organization/:organizationId/certificate',
  authMiddleware,
  [
    param('organizationId')
      .notEmpty()
      .withMessage('組織IDは必須です')
      .isUUID()
      .withMessage('組織IDは有効な UUID でなければなりません'),
  ],
  handleValidationErrors,
  organizationController.downloadCertificate
);

/**
 * Organization ID指定で1件取得
 * GET /api/v1/provider/organization/:organizationId
 */
router.get(
  '/organization/:organizationId',
  authMiddleware, // 認証ミドルウェア有効化（JWTから organizationId を取得）
  [
    param('organizationId')
      .notEmpty()
      .withMessage('組織IDは必須です')
      .isUUID()
      .withMessage('組織IDは有効な UUID でなければなりません'),
  ],
  handleValidationErrors,
  organizationController.getOrganizationById
);

/**
 * Organizationを新規作成
 * POST /api/v1/provider/organization
 */
router.post(
  '/organization',
  authMiddleware,
  [
    body('organizationId')
      .notEmpty()
      .withMessage('組織IDは必須です')
      .isUUID()
      .withMessage('組織IDは有効な UUID でなければなりません'),
    body('organizationCd')
      .notEmpty()
      .withMessage('組織CDは必須です')
      .isString()
      .withMessage('組織CDは文字列でなければなりません')
      .matches(/^[A-Za-z0-9\-_]+$/)
      .withMessage('組織IDは英数字・ハイフン・アンダースコアのみを含む必要があります')
      .isLength({ max: 50 })
      .withMessage('組織IDは 50文字以下でなければなりません'),
    body('organizationDisplayName')
      .notEmpty()
      .withMessage('組織表示名は必須です')
      .isString()
      .withMessage('組織表示名は文字列でなければなりません'),
    body('organizationEmail')
      .notEmpty()
      .withMessage('組織のメールアドレスは必須です')
      .isEmail()
      .withMessage('組織のメールアドレスは有効なメールアドレスでなければなりません'),
    body('chiefUserName')
      .notEmpty()
      .withMessage('代表システム管理者は必須です')
      .isString()
      .withMessage('代表システム管理者は文字列でなければなりません'),
    body('chiefUserEmail')
      .notEmpty()
      .withMessage('代表者メールアドレスは必須です')
      .isEmail()
      .withMessage('代表者メールアドレスは有効なメールアドレスでなければなりません'),
    body('chiefUserId')
      .optional()
      .isString()
      .withMessage('代表者のIDは文字列でなければなりません'),
    body('corporationId')
      .optional()
      .isUUID()
      .withMessage('会社のIDは有効な UUID でなければなりません'),
    body('isEntry')
      .optional()
      .isInt({ min: 0, max: 1 })
      .withMessage('二段階認証判定は 0 または 1 でなければなりません'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('状態は boolean（真偽値）でなければなりません'),
    body('defaultRetentionDays')
      .optional()
      .isInt({ min: 1 })
      .withMessage('MaiMLデータ公開時のデフォルト保持日数は 1 以上の整数でなければなりません'),
  ],
  handleValidationErrors,
  organizationController.createOrganization
);

/**
 * Organizationを更新
 * PUT /api/v1/provider/organization/:organizationId
 */
router.put(
  '/organization/:organizationId',
  authMiddleware,
  [
    param('organizationId')
      .notEmpty()
      .withMessage('組織IDは必須です')
      .isUUID()
      .withMessage('組織IDは有効な UUID でなければなりません'),
    body('organizationName')
      .optional()
      .isString()
      .withMessage('組織名は文字列でなければなりません'),
    body('organizationDisplayName')
      .optional()
      .isString()
      .withMessage('組織表示名は文字列でなければなりません'),
    body('organizationPrefix')
      .optional()
      .isString()
      .withMessage('組織prefixは文字列でなければなりません'),
    body('organizationEmail')
      .optional()
      .isEmail()
      .withMessage('組織のメールアドレスは有効なメールアドレスでなければなりません'),
    body('chiefUserId')
      .optional()
      .isString()
      .withMessage('代表者のIDは文字列でなければなりません'),
    body('corporationId')
      .optional()
      .isUUID()
      .withMessage('会社のIDは有効な UUID でなければなりません'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('状態は boolean（真偽値）でなければなりません'),
    body('defaultRetentionDays')
      .optional()
      .isInt({ min: 1 })
      .withMessage('MaiMLデータ公開時のデフォルト保持日数は 1 以上の整数でなければなりません'),
  ],
  handleValidationErrors,
  organizationController.updateOrganization
);

/**
 * Organizationのアクティブ状態を更新
 * PATCH /api/v1/provider/organization/:organizationId/status
 */
router.patch(
  '/organization/:organizationId/status',
  authMiddleware,
  [
    param('organizationId')
      .notEmpty()
      .withMessage('組織IDは必須です')
      .isUUID()
      .withMessage('組織IDは有効な UUID でなければなりません'),
    body('isActive')
      .notEmpty()
      .withMessage('状態は必須です')
      .isBoolean()
      .withMessage('状態は boolean（真偽値）でなければなりません'),
  ],
  handleValidationErrors,
  organizationController.updateOrganizationStatus
);

export default router;
