/**
 * マスタ管理(Creator、Vendor、Instrument)ルート
 */

import { Router } from 'express';
import { query, param, body } from 'express-validator';
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
//   .withMessage('組織のIDは必須です');
//   // .isUUID()  // TODO: 一時的にUUIDチェックを無効化（テスト用）
//   // .withMessage('組織IDの形式が不正です');

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
      .withMessage('表示切替は “全体” か “自組織” のいずれかでなければなりません'),
    query('search')
      .optional()
      .isString()
      .withMessage('検索は文字列でなければなりません'),
    query('is_active')
      .optional()
      .isBoolean()
      .withMessage('アクティブ/非アクティブは boolean（真偽値）でなければなりません'),
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
      .withMessage('CreatorのIDは必須です')
      .isString()
      .withMessage('CreatorのIDは文字列でなければなりません'),
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
      .withMessage('InstrumentのIDは必須です')
      .isString()
      .withMessage('InstrumentのIDは文字列でなければなりません'),
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
      .withMessage('VendorのIDは必須です')
      .isString()
      .withMessage('VendorのIDは文字列でなければなりません'),
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
  [
    body('instrumentId')
      .notEmpty()
      .withMessage('InstrumentのIDは必須です')
      .isString()
      .withMessage('InstrumentのIDは文字列でなければなりません')
      .isLength({ max: 50 })
      .withMessage('InstrumentのIDは 50 文字以内でなければなりません')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('InstrumentのIDは半角の英数字、ハイフン、またはアンダースコアのみで構成されていなければなりません'),
    body('instrumentName')
      .notEmpty()
      .withMessage('Instrumentの名称は必須です')
      .isString()
      .withMessage('Instrumentの名称は文字列でなければなりません')
      .isLength({ max: 50 })
      .withMessage('Instrumentの名称は 50 文字以内でなければなりません'),
  ],
  handleValidationErrors,
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
      .withMessage('InstrumentのIDは必須です')
      .isString()
      .withMessage('InstrumentのIDは文字列でなければなりません'),
    body('instrumentName')
      .optional()
      .isString()
      .withMessage('Instrumentの名称は文字列でなければなりません')
      .isLength({ max: 50 })
      .withMessage('Instrumentの名称は 50 文字以内でなければなりません'),
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
      .withMessage('InstrumentのIDは必須です')
      .isString()
      .withMessage('InstrumentのIDは文字列でなければなりません'),
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
  [
    body('vendorId')
      .notEmpty()
      .withMessage('VendorのIDは必須です')
      .isString()
      .withMessage('VendorのIDは文字列でなければなりません')
      .isLength({ max: 50 })
      .withMessage('VendorのIDは 50 文字以内でなければなりません')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('VendorのIDは半角の英数字、ハイフン、またはアンダースコアのみで構成されていなければなりません'),
    body('vendorName')
      .notEmpty()
      .withMessage('Vendorの名称は必須です')
      .isString()
      .withMessage('Vendorの名称は文字列でなければなりません')
      .isLength({ max: 50 })
      .withMessage('Vendorの名称は 50 文字以内でなければなりません'),
  ],
  handleValidationErrors,
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
      .withMessage('VendorのIDは必須です')
      .isString()
      .withMessage('VendorのIDは文字列でなければなりません'),
    body('vendorName')
      .optional()
      .isString()
      .withMessage('Vendorの名称は文字列でなければなりません')
      .isLength({ max: 50 })
      .withMessage('Vendorの名称は 50 文字以内でなければなりません'),
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
      .withMessage('VendorのIDは必須です')
      .isString()
      .withMessage('VendorのIDは文字列でなければなりません'),
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
  [
    body('creatorId')
      .notEmpty()
      .withMessage('CreatorのIDは必須です')
      .isString()
      .withMessage('CreatorのIDは文字列でなければなりません')
      .isLength({ max: 50 })
      .withMessage('CreatorのIDは 50 文字以内でなければなりません')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('CreatorのIDは半角の英数字、ハイフン、またはアンダースコアのみで構成されていなければなりません'),
    body('creatorName')
      .notEmpty()
      .withMessage('Creatorの名称は必須です')
      .isString()
      .withMessage('Creatorの名称は文字列でなければなりません')
      .isLength({ max: 50 })
      .withMessage('Creatorの名称は 50 文字以内でなければなりません'),
  ],
  handleValidationErrors,
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
      .withMessage('CreatorのIDは必須です')
      .isString()
      .withMessage('CreatorのIDは文字列でなければなりません'),
    body('creatorName')
      .optional()
      .isString()
      .withMessage('Creatorの名称は文字列でなければなりません')
      .isLength({ max: 50 })
      .withMessage('Creatorの名称は 50 文字以内でなければなりません'),
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
      .withMessage('CreatorのIDは必須です')
      .isString()
      .withMessage('CreatorのIDは文字列でなければなりません'),
  ],
  handleValidationErrors,
  masterController.updateCreatorStatus
);

// =============================================================
// Attributeマスタルート
// =============================================================

/**
 * Attributeマスタ一覧取得
 * GET /api/v1/master/attribute
 */
router.get(
  '/attribute',
  authMiddleware,
  [
    query('search').optional().isString().withMessage('検索は文字列でなければなりません'),
    query('is_active').optional().isBoolean().withMessage('アクティブ/非アクティブは boolean（真偽値）でなければなりません'),
    query('attribute_name').optional().isString().withMessage('属性名は文字列でなければなりません'),
  ],
  handleValidationErrors,
  masterController.getAttributes
);

/**
 * AttributeマスタCSVダウンロード
 * GET /api/v1/master/attribute/download-csv
 * 注意: このルートは /attribute/:attributeId より前に定義する必要がある
 */
router.get(
  '/attribute/download-csv',
  authMiddleware,
  masterController.downloadAttributesCsv
);

/**
 * AttributeマスタCSVアップロード
 * POST /api/v1/master/attribute/upload-csv
 * 注意: このルートは /attribute/:attributeId より前に定義する必要がある
 */
router.post(
  '/attribute/upload-csv',
  authMiddleware,
  upload.single('file'),
  masterController.uploadAttributesCsv
);

/**
 * Attribute ID指定で1件取得
 * GET /api/v1/master/attribute/:attributeId
 */
router.get(
  '/attribute/:attributeId',
  authMiddleware,
  [
    param('attributeId').notEmpty().withMessage('属性のIDは必須です').isString(),
  ],
  handleValidationErrors,
  masterController.getAttributeById
);

/**
 * Attributeマスタを新規作成
 * POST /api/v1/master/attribute
 */
router.post(
  '/attribute',
  authMiddleware,
  masterController.createAttribute
);

/**
 * Attributeマスタを更新
 * PUT /api/v1/master/attribute/:attributeId
 */
router.put(
  '/attribute/:attributeId',
  authMiddleware,
  [
    param('attributeId').notEmpty().withMessage('属性のIDは必須です').isString(),
  ],
  handleValidationErrors,
  masterController.updateAttribute
);

/**
 * Attributeマスタのアクティブ状態を更新
 * PATCH /api/v1/master/attribute/:attributeId/status
 */
router.patch(
  '/attribute/:attributeId/status',
  authMiddleware,
  [
    param('attributeId').notEmpty().withMessage('属性のIDは必須です').isString(),
  ],
  handleValidationErrors,
  masterController.updateAttributeStatus
);

export default router;
