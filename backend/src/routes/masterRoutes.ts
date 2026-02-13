/**
 * マスタ管理(Creator、Vendor、Instrument)ルート
 */

import { Router } from 'express';
import { query, param } from 'express-validator';
import * as masterController from '../controllers/masterController';
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

// バリデーションヘルパー（非推奨: authMiddlewareがorganizationIdを設定するため不要）
// const validateOrganizationHeader = header('X-Organization-Id')
//   .notEmpty()
//   .withMessage('Organization ID is required');
//   // .isUUID()  // TODO: 一時的にUUIDチェックを無効化（テスト用）
//   // .withMessage('Invalid organization ID format');

/**
 * Creatorマスタ一覧取得
 * GET /api/v1/master/creator
 */
router.get(
  '/creator',
  authMiddleware, // 認証ミドルウェア有効化（JWTから organizationId を取得）
  [
    // validateOrganizationHeader は不要（authMiddleware が organizationId を設定）
    query('display_scope')
      .optional()
      .isIn(['all', 'own'])
      .withMessage('display_scope must be either "all" or "own"'),
    query('search')
      .optional()
      .isString()
      .withMessage('search must be a string'),
    query('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be a boolean'),
  ],
  handleValidationErrors,
  masterController.getCreators
);

/**
 * CreatorマスタCSVダウンロード
 * GET /api/v1/master/creator/download-csv
 * 
 * 注意: このルートは /creator/:creatorId より前に定義する必要がある
 */
router.get(
  '/creator/download-csv',
  authMiddleware, // 認証ミドルウェア有効化（JWTから organizationId を取得）
  // validateOrganizationHeader は不要（authMiddleware が organizationId を設定）
  masterController.downloadCreatorsCsv
);

/**
 * CreatorマスタCSVアップロード
 * POST /api/v1/master/creator/upload-csv
 * 
 * 注意: このルートは /creator/:creatorId より前に定義する必要がある
 */
router.post(
  '/creator/upload-csv',
  authMiddleware, // 認証ミドルウェア有効化（JWTから organizationId を取得）
  upload.single('file'),
  // validateOrganizationHeader は不要（authMiddleware が organizationId を設定）
  masterController.uploadCreatorsCsv
);

/**
 * Creator ID指定で1件取得
 * GET /api/v1/master/creator/:creatorId
 */
router.get(
  '/creator/:creatorId',
  authMiddleware, // 認証ミドルウェア有効化（JWTから organizationId を取得）
  [
    // validateOrganizationHeader は不要（authMiddleware が organizationId を設定）
    param('creatorId')
      .notEmpty()
      .withMessage('creatorId is required')
      .isString()
      .withMessage('creatorId must be a string'),
  ],
  handleValidationErrors,
  masterController.getCreatorById
);

/**
 * Instrumentマスタ一覧取得
 * GET /master/instrument
 */
router.get(
  '/instrument',
  authMiddleware, // 認証ミドルウェア有効化（JWTから organizationId を取得）
  // validateOrganizationHeader は不要（authMiddleware が organizationId を設定）
  masterController.getInstruments
);

/**
 * InstrumentマスタCSVダウンロード
 * GET /master/instrument/download-csv
 * 
 * 注意: このルートは /instrument/:instrumentId より前に定義する必要がある
 */
router.get(
  '/instrument/download-csv',
  authMiddleware, // 認証ミドルウェア有効化（JWTから organizationId を取得）
  // validateOrganizationHeader は不要（authMiddleware が organizationId を設定）
  masterController.downloadInstrumentsCsv
);

/**
 * InstrumentマスタCSVアップロード
 * POST /master/instrument/upload-csv
 * 
 * 注意: このルートは /instrument/:instrumentId より前に定義する必要がある
 */
router.post(
  '/instrument/upload-csv',
  authMiddleware, // 認証ミドルウェア有効化（JWTから organizationId を取得）
  upload.single('file'),
  // validateOrganizationHeader は不要（authMiddleware が organizationId を設定）
  masterController.uploadInstrumentsCsv
);

/**
 * Instrument ID指定で1件取得
 * GET /master/instrument/:instrumentId
 */
router.get(
  '/instrument/:instrumentId',
  authMiddleware, // 認証ミドルウェア有効化（JWTから organizationId を取得）
  [
    // validateOrganizationHeader は不要（authMiddleware が organizationId を設定）
    param('instrumentId')
      .notEmpty()
      .withMessage('instrumentId is required')
      .isString()
      .withMessage('instrumentId must be a string'),
  ],
  handleValidationErrors,
  masterController.getInstrumentById
);

/**
 * Vendorマスタ一覧取得
 * GET /api/v1/master/vendor
 */
router.get(
  '/vendor',
  authMiddleware, // 認証ミドルウェア有効化（JWTから organizationId を取得）
  // validateOrganizationHeader は不要（authMiddleware が organizationId を設定）
  masterController.getVendors
);

/**
 * VendorマスタCSVダウンロード
 * GET /api/v1/master/vendor/download-csv
 * 
 * 注意: このルートは /vendor/:vendorId より前に定義する必要がある
 */
router.get(
  '/vendor/download-csv',
  authMiddleware, // 認証ミドルウェア有効化（JWTから organizationId を取得）
  // validateOrganizationHeader は不要（authMiddleware が organizationId を設定）
  masterController.downloadVendorsCsv
);

/**
 * VendorマスタCSVアップロード
 * POST /api/v1/master/vendor/upload-csv
 * 
 * 注意: このルートは /vendor/:vendorId より前に定義する必要がある
 */
router.post(
  '/vendor/upload-csv',
  authMiddleware, // 認証ミドルウェア有効化（JWTから organizationId を取得）
  upload.single('file'),
  // validateOrganizationHeader は不要（authMiddleware が organizationId を設定）
  masterController.uploadVendorsCsv
);

/**
 * Vendor ID指定で1件取得
 * GET /api/v1/master/vendor/:vendorId
 */
router.get(
  '/vendor/:vendorId',
  authMiddleware, // 認証ミドルウェア有効化（JWTから organizationId を取得）
  [
    // validateOrganizationHeader は不要（authMiddleware が organizationId を設定）
    param('vendorId')
      .notEmpty()
      .withMessage('vendorId is required')
      .isString()
      .withMessage('vendorId must be a string'),
  ],
  handleValidationErrors,
  masterController.getVendorById
);

/**
 * Instrumentマスタを新規作成
 * POST /master/instrument
 */
router.post(
  '/instrument',
  authMiddleware, // 認証ミドルウェア有効化
  masterController.createInstrument
);

/**
 * Instrumentマスタを更新
 * PUT /master/instrument/:instrumentId
 */
router.put(
  '/instrument/:instrumentId',
  authMiddleware, // 認証ミドルウェア有効化
  [
    param('instrumentId')
      .notEmpty()
      .withMessage('instrumentId is required')
      .isString()
      .withMessage('instrumentId must be a string'),
  ],
  handleValidationErrors,
  masterController.updateInstrument
);

/**
 * Instrumentマスタのアクティブ状態を更新
 * PATCH /master/instrument/:instrumentId/status
 */
router.patch(
  '/instrument/:instrumentId/status',
  authMiddleware, // 認証ミドルウェア有効化
  [
    param('instrumentId')
      .notEmpty()
      .withMessage('instrumentId is required')
      .isString()
      .withMessage('instrumentId must be a string'),
  ],
  handleValidationErrors,
  masterController.updateInstrumentStatus
);

/**
 * Vendorマスタを新規作成
 * POST /api/v1/master/vendor
 */
router.post(
  '/vendor',
  authMiddleware, // 認証ミドルウェア有効化
  masterController.createVendor
);

/**
 * Vendorマスタを更新
 * PUT /api/v1/master/vendor/:vendorId
 */
router.put(
  '/vendor/:vendorId',
  authMiddleware, // 認証ミドルウェア有効化
  [
    param('vendorId')
      .notEmpty()
      .withMessage('vendorId is required')
      .isString()
      .withMessage('vendorId must be a string'),
  ],
  handleValidationErrors,
  masterController.updateVendor
);

/**
 * Vendorマスタのアクティブ状態を更新
 * PATCH /api/v1/master/vendor/:vendorId/status
 */
router.patch(
  '/vendor/:vendorId/status',
  authMiddleware, // 認証ミドルウェア有効化
  [
    param('vendorId')
      .notEmpty()
      .withMessage('vendorId is required')
      .isString()
      .withMessage('vendorId must be a string'),
  ],
  handleValidationErrors,
  masterController.updateVendorStatus
);

/**
 * Creatorマスタを新規作成
 * POST /api/v1/master/creator
 */
router.post(
  '/creator',
  authMiddleware, // 認証ミドルウェア有効化
  masterController.createCreator
);

/**
 * Creatorマスタを更新
 * PUT /api/v1/master/creator/:creatorId
 */
router.put(
  '/creator/:creatorId',
  authMiddleware, // 認証ミドルウェア有効化
  [
    param('creatorId')
      .notEmpty()
      .withMessage('creatorId is required')
      .isString()
      .withMessage('creatorId must be a string'),
  ],
  handleValidationErrors,
  masterController.updateCreator
);

/**
 * Creatorマスタのアクティブ状態を更新
 * PATCH /api/v1/master/creator/:creatorId/status
 */
router.patch(
  '/creator/:creatorId/status',
  authMiddleware, // 認証ミドルウェア有効化
  [
    param('creatorId')
      .notEmpty()
      .withMessage('creatorId is required')
      .isString()
      .withMessage('creatorId must be a string'),
  ],
  handleValidationErrors,
  masterController.updateCreatorStatus
);

export default router;