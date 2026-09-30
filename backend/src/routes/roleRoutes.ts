/**
 * ロール管理ルート
 */

import { Router } from 'express';
import { param, body } from 'express-validator';
import * as roleController from '../controllers/roleController';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantIsolation } from '../middleware/tenantIsolation';
import { checkPermission } from '../middleware/permissionCheckMiddleware';
import { handleValidationErrors } from '../middleware/validationMiddleware';
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
  authMiddleware,
  tenantIsolation,
  checkPermission('020000', 0), // システム管理者メニュー、読取専用
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
  tenantIsolation,
  checkPermission('020000', 0), // システム管理者メニュー、読取専用
  roleController.downloadRoleCsv
);

/**
 * ロールCD指定で1件取得
 * GET /api/v1/master/role/:roleId
 */
router.get(
  '/role/:roleId',
  authMiddleware,
  tenantIsolation,
  checkPermission('020000', 0), // システム管理者メニュー、読取専用
  [
    param('roleId')
      .notEmpty()
      .withMessage('ロールIDは必須です')
      .isString()
      .withMessage('ロールIDが文字列ではありません'),
  ],
  handleValidationErrors,
  roleController.getRoleById
);

/**
 * ロール新規追加
 * POST /api/v1/master/role
 */
router.post(
  '/role',
  authMiddleware,
  tenantIsolation,
  checkPermission('020000', 1), // システム管理者メニュー、書込可
  [
    body('role')
      .notEmpty()
      .withMessage('ロールCDは必須です')
      .isString()
      .withMessage('ロールCDは文字列である必要があります')
      .matches(/^[A-Za-z0-9\-_]+$/)
      .withMessage('ロールCDは半角英数・ハイフン・アンダースコアのみ使用できます')
      .isLength({ max: 30 })
      .withMessage('ロールCDは30文字以内である必要があります'),
    body('roleName')
      .notEmpty()
      .withMessage('ロール名は必須です')
      .isString()
      .withMessage('ロール名は文字列である必要があります'),
    body('initialScreenFunctionName')
      .notEmpty()
      .withMessage('初期画面機能名は必須です')
      .isString()
      .withMessage('初期画面機能名は文字列である必要があります'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActiveはブール値である必要があります'),
  ],
  handleValidationErrors,
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
  tenantIsolation,
  checkPermission('020000', 1), // システム管理者メニュー、書込可
  upload.single('file'),
  roleController.uploadRoleCsv
);

/**
 * ロール更新
 * PUT /api/v1/master/role/:roleId
 */
router.put(
  '/role/:roleId',
  authMiddleware,
  tenantIsolation,
  checkPermission('020000', 1), // システム管理者メニュー、書込可
  [
    param('roleId')
      .notEmpty()
      .withMessage('ロールIDは必須です')
      .isString()
      .withMessage('ロールIDが文字列ではありません'),
    body('roleName')
      .optional()
      .isString()
      .withMessage('ロール名は文字列である必要があります'),
    body('initialScreenFunctionName')
      .optional()
      .notEmpty()
      .withMessage('初期画面機能名は必須です')
      .isString()
      .withMessage('初期画面機能名は文字列である必要があります'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActiveはブール値である必要があります'),
  ],
  handleValidationErrors,
  roleController.updateRole
);

/**
 * ロールの権限を更新
 * PUT /api/v1/master/role/:roleId/permissions
 */
router.put(
  '/role/:roleId/permissions',
  authMiddleware,
  tenantIsolation,
  checkPermission('020000', 1), // システム管理者メニュー、書込可
  [
    param('roleId')
      .notEmpty()
      .withMessage('ロールIDは必須です')
      .isString()
      .withMessage('ロールIDが文字列ではありません'),
    body('functionName')
      .isString()
      .withMessage('機能名が文字列ではありません'),
    body('functionWritePermissions')
      .optional()
      .isString()
      .withMessage('functionWritePermissions が文字列ではありません'),
  ],
  handleValidationErrors,
  roleController.updateRolePermissions
);

/**
 * ロールのアクティブ状態を更新
 * PATCH /api/v1/master/role/:roleId/status
 */
router.patch(
  '/role/:roleId/status',
  authMiddleware,
  tenantIsolation,
  checkPermission('020000', 1), // システム管理者メニュー、書込可
  [
    param('roleId')
      .notEmpty()
      .withMessage('ロールIDは必須です')
      .isString()
      .withMessage('ロールIDが文字列ではありません'),
    body('isActive')
      .notEmpty()
      .withMessage('状態は必須です')
      .isBoolean()
      .withMessage('状態が boolean（真偽値）ではありません'),
  ],
  handleValidationErrors,
  roleController.updateRoleStatus
);

export default router;


