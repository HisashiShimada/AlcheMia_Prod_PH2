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
      .withMessage('search must be a string'),
    query('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be a boolean'),
    query('sort_by')
      .optional()
      .isString()
      .withMessage('sort_by must be a string'),
    query('sort_order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('sort_order must be either "asc" or "desc"'),
  ],
  handleValidationErrors,
  organizationController.getOrganizations
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
      .withMessage('organizationId is required')
      .isUUID()
      .withMessage('organizationId must be a valid UUID'),
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
      .withMessage('organizationId is required')
      .isUUID()
      .withMessage('organizationId must be a valid UUID'),
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
      .withMessage('organizationId is required')
      .isUUID()
      .withMessage('organizationId must be a valid UUID'),
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
      .withMessage('organizationId is required')
      .isUUID()
      .withMessage('organizationId must be a valid UUID'),
    body('organizationCd')
      .notEmpty()
      .withMessage('organizationCd is required')
      .isString()
      .withMessage('organizationCd must be a string')
      .isLength({ max: 50 })
      .withMessage('organizationCd must be 50 characters or less'),
    body('organizationDisplayName')
      .notEmpty()
      .withMessage('organizationDisplayName is required')
      .isString()
      .withMessage('organizationDisplayName must be a string'),
    body('organizationEmail')
      .notEmpty()
      .withMessage('organizationEmail is required')
      .isEmail()
      .withMessage('organizationEmail must be a valid email'),
    body('chiefUserName')
      .notEmpty()
      .withMessage('chiefUserName is required')
      .isString()
      .withMessage('chiefUserName must be a string'),
    body('chiefUserEmail')
      .notEmpty()
      .withMessage('chiefUserEmail is required')
      .isEmail()
      .withMessage('chiefUserEmail must be a valid email'),
    body('chiefUserId')
      .optional()
      .isString()
      .withMessage('chiefUserId must be a string'),
    body('corporationId')
      .optional()
      .isUUID()
      .withMessage('corporationId must be a valid UUID'),
    body('isEntry')
      .optional()
      .isInt({ min: 0, max: 1 })
      .withMessage('isEntry must be 0 or 1'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
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
      .withMessage('organizationId is required')
      .isUUID()
      .withMessage('organizationId must be a valid UUID'),
    body('organizationName')
      .optional()
      .isString()
      .withMessage('organizationName must be a string'),
    body('organizationDisplayName')
      .optional()
      .isString()
      .withMessage('organizationDisplayName must be a string'),
    body('organizationPrefix')
      .optional()
      .isString()
      .withMessage('organizationPrefix must be a string'),
    body('organizationEmail')
      .optional()
      .isEmail()
      .withMessage('organizationEmail must be a valid email'),
    body('chiefUserId')
      .optional()
      .isString()
      .withMessage('chiefUserId must be a string'),
    body('corporationId')
      .optional()
      .isUUID()
      .withMessage('corporationId must be a valid UUID'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
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
      .withMessage('organizationId is required')
      .isUUID()
      .withMessage('organizationId must be a valid UUID'),
    body('isActive')
      .notEmpty()
      .withMessage('isActive is required')
      .isBoolean()
      .withMessage('isActive must be a boolean'),
  ],
  handleValidationErrors,
  organizationController.updateOrganizationStatus
);

export default router;
