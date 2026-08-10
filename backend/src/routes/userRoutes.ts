/**
 * ユーザー管理ルート
 */

import { Router } from 'express';
import { query, param, body } from 'express-validator';
import * as userController from '../controllers/userController';
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
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
};

router.use(cors(corsOptions));

/**
 * User一覧取得
 * GET /systemManagement/user
 */
router.get(
  '/user',
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
    query('department_cd')
      .optional()
      .isString()
      .withMessage('department_cd must be a string'),
    query('role_cd')
      .optional()
      .isString()
      .withMessage('role_cd must be a string'),
    query('sort_by')
      .optional()
      .isIn(['user_id', 'user_name', 'update_at'])
      .withMessage('sort_by must be one of: user_id, user_name, update_at'),
    query('sort_order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('sort_order must be either "asc" or "desc"'),
  ],
  handleValidationErrors,
  userController.getUsers
);

/**
 * UserCSVダウンロード
 * GET /systemManagement/user/download-csv
 * 
 * 注意: このルートは /user/:userId より前に定義する必要がある
 */
router.get(
  '/user/download-csv',
  authMiddleware,
  userController.downloadUsersCsv
);

/**
 * UserCSVアップロード
 * POST /systemManagement/user/upload-csv
 * 
 * 注意: このルートは /user/:userId より前に定義する必要がある
 */
router.post(
  '/user/upload-csv',
  authMiddleware,
  upload.single('file'),
  userController.uploadUsersCsv
);

/**
 * User ID指定で1件取得
 * GET /systemManagement/user/:userId
 */
router.get(
  '/user/:userId',
  authMiddleware,
  [
    param('userId')
      .notEmpty()
      .withMessage('userId is required')
      .isString()
      .withMessage('userId must be a string')
      .isEmail()
      .withMessage('userId must be a valid email address'),
  ],
  handleValidationErrors,
  userController.getUserById
);

/**
 * Userを新規作成
 * POST /systemManagement/user
 */
router.post(
  '/user',
  authMiddleware,
  [
    body('userId')
      .notEmpty()
      .withMessage('userId is required')
      .isEmail()
      .withMessage('userId must be a valid email address'),
    body('userName')
      .notEmpty()
      .withMessage('userName is required')
      .isString()
      .withMessage('userName must be a string')
      .isLength({ max: 30 })
      .withMessage('userName must be at most 30 characters'),
    body('mailAddress')
      .notEmpty()
      .withMessage('mailAddress is required')
      .isEmail()
      .withMessage('mailAddress must be a valid email address'),
    body('departmentCd')
      .optional({ nullable: true })
      .isString()
      .withMessage('departmentCd must be a string'),
    body('roleCd')
      .notEmpty()
      .withMessage('roleCd is required')
      .isString()
      .withMessage('roleCd must be a string'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    body('password')
      .optional()
      .isString()
      .withMessage('password must be a string')
      .isLength({ min: 8 })
      .withMessage('password must be at least 8 characters'),
  ],
  handleValidationErrors,
  userController.createUser
);

/**
 * Userを更新
 * PUT /systemManagement/user/:userId
 */
router.put(
  '/user/:userId',
  authMiddleware,
  [
    param('userId')
      .notEmpty()
      .withMessage('userId is required')
      .isString()
      .withMessage('userId must be a string')
      .isEmail()
      .withMessage('userId must be a valid email address'),
    body('userName')
      .optional()
      .isString()
      .withMessage('userName must be a string')
      .isLength({ max: 30 })
      .withMessage('userName must be at most 30 characters'),
    body('departmentCd')
      .optional({ nullable: true })
      .isString()
      .withMessage('departmentCd must be a string'),
    body('roleCd')
      .optional()
      .isString()
      .withMessage('roleCd must be a string'),
  ],
  handleValidationErrors,
  userController.updateUser
);

/**
 * Userのアクティブ状態を更新
 * PATCH /systemManagement/user/:userId/status
 */
router.patch(
  '/user/:userId/status',
  authMiddleware,
  [
    param('userId')
      .notEmpty()
      .withMessage('userId is required')
      .isString()
      .withMessage('userId must be a string')
      .isEmail()
      .withMessage('userId must be a valid email address'),
    body('isActive')
      .notEmpty()
      .withMessage('isActive is required')
      .isBoolean()
      .withMessage('isActive must be a boolean'),
  ],
  handleValidationErrors,
  userController.updateUserStatus
);

export default router;
