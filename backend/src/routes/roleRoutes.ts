/**
 * ロール管理ルート
 */

import { Router } from 'express';
import { param, body } from 'express-validator';
import * as roleController from '../controllers/roleController';
import { authMiddleware } from '../middleware/authMiddleware';
import cors from 'cors';
import multer from 'multer';

// Multer設定（CSVアップロード用）
const storage = multer.memoryStorage();
const upload = multer({ storage });

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
 * ロール一覧取得
 * GET /api/v1/master/role
 */
router.get(
  '/role',
  authMiddleware, // 認証ミドルウェア有効化
  roleController.getRoles
);

/**
 * ロールCSVダウンロード
 * GET /api/v1/master/role/download-csv
 * 注意: パラメータなしの具体的なパスは、パラメータ付きパス（/:roleId）より前に定義する必要があります
 */
router.get(
  '/role/download-csv',
  authMiddleware,
  roleController.downloadRoleCsv
);

/**
 * ロールCD指定で1件取得
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
  roleController.getRoleById
);

/**
 * ロール新規追加
 * POST /api/v1/master/role
 */
router.post(
  '/role',
  authMiddleware, // 認証ミドルウェア有効化
  [
    body('role')
      .notEmpty()
      .withMessage('ロールCDは必須です')
      .isString()
      .withMessage('ロールCDは文字列である必要があります'),
    body('roleName')
      .notEmpty()
      .withMessage('ロール名は必須です')
      .isString()
      .withMessage('ロール名は文字列である必要があります'),
    body('initialScreenFunctionName')
      .optional()
      .isString()
      .withMessage('初期画面機能名は文字列である必要があります'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActiveはブール値である必要があります'),
  ],
  roleController.createRole
);

/**
 * ロールCSVアップロード
 * POST /api/v1/master/role/upload-csv
 * 注意: パラメータなしの具体的なパスは、パラメータ付きパス（/:roleId）より前に定義する必要があります
 */
router.post(
  '/role/upload-csv',
  authMiddleware,
  upload.single('file'),
  roleController.uploadRoleCsv
);

/**
 * ロール更新
 * PUT /api/v1/master/role/:roleId
 */
router.put(
  '/role/:roleId',
  authMiddleware, // 認証ミドルウェア有効化
  [
    param('roleId')
      .notEmpty()
      .withMessage('roleId is required')
      .isString()
      .withMessage('roleId must be a string'),
    body('roleName')
      .optional()
      .isString()
      .withMessage('ロール名は文字列である必要があります'),
    body('initialScreenFunctionName')
      .optional()
      .isString()
      .withMessage('初期画面機能名は文字列である必要があります'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActiveはブール値である必要があります'),
  ],
  roleController.updateRole
);

/**
 * ロールの権限を更新
 * PUT /api/v1/master/role/:roleId/permissions
 */
router.put(
  '/role/:roleId/permissions',
  authMiddleware, // 認証ミドルウェア有効化
  [
    param('roleId')
      .notEmpty()
      .withMessage('roleId is required')
      .isString()
      .withMessage('roleId must be a string'),
    body('functionName')
      .notEmpty()
      .withMessage('functionName is required')
      .isString()
      .withMessage('functionName must be a string'),
    body('functionWritePermissions')
      .optional()
      .isString()
      .withMessage('functionWritePermissions must be a string'),
  ],
  roleController.updateRolePermissions
);

/**
 * ロールのアクティブ状態を更新
 * PATCH /api/v1/master/role/:roleId/status
 */
router.patch(
  '/role/:roleId/status',
  authMiddleware, // 認証ミドルウェア有効化
  [
    param('roleId')
      .notEmpty()
      .withMessage('roleId is required')
      .isString()
      .withMessage('roleId must be a string'),
    body('isActive')
      .notEmpty()
      .withMessage('isActive is required')
      .isBoolean()
      .withMessage('isActive must be a boolean'),
  ],
  roleController.updateRoleStatus
);

export default router;


