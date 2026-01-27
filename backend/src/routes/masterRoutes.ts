/**
 * マスタ管理ルート
 */

import { Router } from 'express';
import { header, query, param, body } from 'express-validator';
import * as masterController from '../controllers/masterController';
import { authMiddleware } from '../middleware/authMiddleware';
import cors from 'cors';
import multer from 'multer';

// Multer設定（メモリストレージ使用）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
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

// バリデーションヘルパー
const validateOrganizationHeader = header('X-Organization-Id')
  .notEmpty()
  .withMessage('Organization ID is required');
  // .isUUID()  // TODO: 一時的にUUIDチェックを無効化（テスト用）
  // .withMessage('Invalid organization ID format');

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
  authMiddleware,
  [
    validateOrganizationHeader,
    param('creatorId')
      .notEmpty()
      .withMessage('creatorId is required')
      .isString()
      .withMessage('creatorId must be a string'),
  ],
  masterController.getCreatorById
);

/**
 * Instrumentマスタ一覧取得
 * GET /api/v1/master/instrument
 */
router.get(
  '/instrument',
  authMiddleware, // 認証ミドルウェア有効化（JWTから organizationId を取得）
  // validateOrganizationHeader は不要（authMiddleware が organizationId を設定）
  masterController.getInstruments
);

/**
 * InstrumentマスタCSVダウンロード
 * GET /api/v1/master/instrument/download-csv
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
 * POST /api/v1/master/instrument/upload-csv
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
 * GET /api/v1/master/instrument/:instrumentId
 */
router.get(
  '/instrument/:instrumentId',
  authMiddleware,
  [
    validateOrganizationHeader,
    param('instrumentId')
      .notEmpty()
      .withMessage('instrumentId is required')
      .isString()
      .withMessage('instrumentId must be a string'),
  ],
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
  authMiddleware,
  [
    validateOrganizationHeader,
    param('vendorId')
      .notEmpty()
      .withMessage('vendorId is required')
      .isString()
      .withMessage('vendorId must be a string'),
  ],
  masterController.getVendorById
);

/**
 * Instrumentマスタを新規作成
 * POST /api/v1/master/instrument
 */
router.post(
  '/instrument',
  authMiddleware, // 認証ミドルウェア有効化
  masterController.createInstrument
);

/**
 * Instrumentマスタを更新
 * PUT /api/v1/master/instrument/:instrumentId
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
  masterController.updateInstrument
);

/**
 * Instrumentマスタのアクティブ状態を更新
 * PATCH /api/v1/master/instrument/:instrumentId/status
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
  masterController.updateCreatorStatus
);

/**
 * Corporation一覧取得
 * GET /api/v1/master/corporation
 */
router.get(
  '/corporation',
  // authMiddleware, // TODO: 一時的に無効化（テスト用）
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
  masterController.getCorporation
);

/**
 * CorporationCSVダウンロード
 * GET /api/v1/master/corporation/download-csv
 * 
 * 注意: このルートは /corporation/:corporationId より前に定義する必要がある
 */
router.get(
  '/corporation/download-csv',
  // authMiddleware, // TODO: 一時的に無効化（テスト用）
  masterController.downloadCorporationCsv
);

/**
 * CorporationCSVアップロード
 * POST /api/v1/master/corporation/upload-csv
 * 
 * 注意: このルートは /corporation/:corporationId より前に定義する必要がある
 */
router.post(
  '/corporation/upload-csv',
  // authMiddleware, // TODO: 一時的に無効化（テスト用）
  upload.single('file'),
  masterController.uploadCorporationCsv
);

/**
 * Corporation ID指定で1件取得
 * GET /api/v1/master/corporation/:corporationId
 */
router.get(
  '/corporation/:corporationId',
  authMiddleware,
  [
    param('corporationId')
      .notEmpty()
      .withMessage('corporationId is required')
      .isString()
      .withMessage('corporationId must be a string'),
  ],
  masterController.getCorporationById
);

/**
 * Corporationを新規作成
 * POST /api/v1/master/corporation
 */
router.post(
  '/corporation',
  // authMiddleware, // TODO: 一時的に無効化（テスト用）
  [
    body('corporationName')
      .notEmpty()
      .withMessage('corporationName is required')
      .isString()
      .withMessage('corporationName must be a string'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
  ],
  masterController.createCorporation
);

/**
 * Corporationを更新
 * PUT /api/v1/master/corporation/:corporationId
 */
router.put(
  '/corporation/:corporationId',
  // authMiddleware, // TODO: 一時的に無効化（テスト用）
  [
    param('corporationId')
      .notEmpty()
      .withMessage('corporationId is required')
      .isString()
      .withMessage('corporationId must be a string'),
    body('corporationName')
      .notEmpty()
      .withMessage('corporationName is required')
      .isString()
      .withMessage('corporationName must be a string'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
  ],
  masterController.updateCorporation
);

/**
 * Corporationのアクティブ状態を更新
 * PATCH /api/v1/master/corporation/:corporationId/status
 */
router.patch(
  '/corporation/:corporationId/status',
  // authMiddleware, // TODO: 一時的に無効化（テスト用）
  [
    param('corporationId')
      .notEmpty()
      .withMessage('corporationId is required')
      .isString()
      .withMessage('corporationId must be a string'),
  ],
  masterController.updateCorporationStatus
);

/**
 * Department一覧取得
 * GET /api/v1/master/department
 */
router.get(
  '/department',
  authMiddleware, // 認証ミドルウェア有効化（JWTから organizationId を取得）
  [
    // validateOrganizationHeader は不要（authMiddleware が organizationId を設定）
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
  masterController.getDepartments
);

/**
 * DepartmentCSVダウンロード
 * GET /api/v1/master/department/download-csv
 * 
 * 注意: このルートは /department/:departmentCd より前に定義する必要がある
 */
router.get(
  '/department/download-csv',
  authMiddleware, // 認証ミドルウェア有効化（JWTから organizationId を取得）
  // validateOrganizationHeader は不要（authMiddleware が organizationId を設定）
  masterController.downloadDepartmentCsv
);

/**
 * DepartmentCSVアップロード
 * POST /api/v1/master/department/upload-csv
 * 
 * 注意: このルートは /department/:departmentCd より前に定義する必要がある
 */
router.post(
  '/department/upload-csv',
  authMiddleware, // 認証ミドルウェア有効化（JWTから organizationId を取得）
  upload.single('file'),
  // validateOrganizationHeader は不要（authMiddleware が organizationId を設定）
  masterController.uploadDepartmentCsv
);

/**
 * Department CD指定で1件取得
 * GET /api/v1/master/department/:departmentCd
 */
router.get(
  '/department/:departmentCd',
  authMiddleware, // 認証ミドルウェア有効化（JWTから organizationId を取得）
  [
    // validateOrganizationHeader は不要（authMiddleware が organizationId を設定）
    param('departmentCd')
      .notEmpty()
      .withMessage('departmentCd is required')
      .isString()
      .withMessage('departmentCd must be a string'),
  ],
  masterController.getDepartmentById
);

/**
 * Departmentを新規作成
 * POST /api/v1/master/department
 */
router.post(
  '/department',
  authMiddleware, // 認証ミドルウェア有効化（JWTから organizationId を取得）
  [
    // validateOrganizationHeader は不要（authMiddleware が organizationId を設定）
    body('departmentCd')
      .notEmpty()
      .withMessage('departmentCd is required')
      .isString()
      .withMessage('departmentCd must be a string'),
    body('departmentName')
      .notEmpty()
      .withMessage('departmentName is required')
      .isString()
      .withMessage('departmentName must be a string'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
  ],
  masterController.createDepartment
);

/**
 * Departmentを更新
 * PUT /api/v1/master/department/:departmentCd
 */
router.put(
  '/department/:departmentCd',
  authMiddleware, // 認証ミドルウェア有効化（JWTから organizationId を取得）
  [
    // validateOrganizationHeader は不要（authMiddleware が organizationId を設定）
    param('departmentCd')
      .notEmpty()
      .withMessage('departmentCd is required')
      .isString()
      .withMessage('departmentCd must be a string'),
    body('departmentName')
      .optional()
      .isString()
      .withMessage('departmentName must be a string'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
  ],
  masterController.updateDepartment
);

/**
 * Departmentのアクティブ状態を更新
 * PATCH /api/v1/master/department/:departmentCd/status
 */
router.patch(
  '/department/:departmentCd/status',
  authMiddleware, // 認証ミドルウェア有効化（JWTから organizationId を取得）
  [
    // validateOrganizationHeader は不要（authMiddleware が organizationId を設定）
    param('departmentCd')
      .notEmpty()
      .withMessage('departmentCd is required')
      .isString()
      .withMessage('departmentCd must be a string'),
  ],
  masterController.updateDepartmentStatus
);

/**
 * ロール一覧取得
 * GET /api/v1/master/role
 */
router.get(
  '/role',
  authMiddleware, // 認証ミドルウェア有効化
  masterController.getRoles
);

/**
 * ロールID指定で1件取得
 * GET /api/v1/master/role/:roleId
 */
router.get(
  '/role/:roleId',
  authMiddleware, // 認証ミドルウェア有効化
  [
    param('roleId')
      .notEmpty()
      .withMessage('roleId is required')
      .isString()
      .withMessage('roleId must be a string'),
  ],
  masterController.getRoleById
);

export default router;
