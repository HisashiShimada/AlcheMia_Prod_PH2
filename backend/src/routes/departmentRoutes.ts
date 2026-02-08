/**
 * 部署管理ルート
 */

import { Router } from 'express';
import { query, param, body } from 'express-validator';
import * as departmentController from '../controllers/departmentControler';
import { authMiddleware } from '../middleware/authMiddleware';
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
 * Department一覧取得
 * GET /api/v1/systemManagement/department
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
  departmentController.getDepartments
);

/**
 * DepartmentCSVダウンロード
 * GET /api/v1/systemManagement/department/download-csv
 * 
 * 注意: このルートは /department/:departmentCd より前に定義する必要がある
 */
router.get(
  '/department/download-csv',
  authMiddleware, // 認証ミドルウェア有効化（JWTから organizationId を取得）
  // validateOrganizationHeader は不要（authMiddleware が organizationId を設定）
  departmentController.downloadDepartmentCsv
);

/**
 * DepartmentCSVアップロード
 * POST /api/v1/systemManagement/department/upload-csv
 * 
 * 注意: このルートは /department/:departmentCd より前に定義する必要がある
 */
router.post(
  '/department/upload-csv',
  authMiddleware, // 認証ミドルウェア有効化（JWTから organizationId を取得）
  upload.single('file'),
  // validateOrganizationHeader は不要（authMiddleware が organizationId を設定）
  departmentController.uploadDepartmentCsv
);

/**
 * Department CD指定で1件取得
 * GET /api/v1/systemManagement/department/:departmentCd
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
  departmentController.getDepartmentById
);

/**
 * Departmentを新規作成
 * POST /api/v1/systemManagement/department
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
  departmentController.createDepartment
);

/**
 * Departmentを更新
 * PUT /api/v1/systemManagement/department/:departmentCd
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
  departmentController.updateDepartment
);

/**
 * Departmentのアクティブ状態を更新
 * PATCH /api/v1/systemManagement/department/:departmentCd/status
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
  departmentController.updateDepartmentStatus
);

export default router;