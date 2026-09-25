/**
 * ユーザー管理ルート
 */

import { Router } from 'express';
import { query, param, body } from 'express-validator';
import * as userController from '../controllers/userController';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantIsolation } from '../middleware/tenantIsolation';
import { checkPermission } from '../middleware/permissionCheckMiddleware';
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
  authMiddleware,
  tenantIsolation,
  checkPermission('020000', 0), // システム管理者メニュー、読取専用
  [
    query('search')
      .optional()
      .isString()
      .withMessage('検索は文字列でなければなりません'),
    query('is_active')
      .optional()
      .isBoolean()
      .withMessage('アクティブ/非アクティブは boolean（真偽値）でなければなりません'),
    query('role_cd')
      .optional()
      .isString()
      .withMessage('ロールCDは文字列でなければなりません'),
    query('sort_by')
      .optional()
      .isIn(['user_id', 'user_name', 'update_at'])
      .withMessage('sort_by は user_id / user_name / update_at のいずれかでなければなりません'),
    query('sort_order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('sort_order は昇順または降順のいずれかでなければなりません'),
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
  tenantIsolation,
  checkPermission('020000', 0), // システム管理者メニュー、読取専用
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
  tenantIsolation,
  checkPermission('020000', 1), // システム管理者メニュー、書込可
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
  tenantIsolation,
  checkPermission('020000', 0), // システム管理者メニュー、読取専用
  [
    param('userId')
      .notEmpty()
      .withMessage('ユーザーIDは必須です')
      .isString()
      .withMessage('ユーザーIDは文字列でなければなりません')
      .isEmail()
      .withMessage('ユーザーIDは有効なメールアドレスでなければなりません'),
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
  tenantIsolation,
  checkPermission('020000', 1), // システム管理者メニュー、書込可
  [
    body('userId')
      .notEmpty()
      .withMessage('ユーザーIDは必須です')
      .isEmail()
      .withMessage('ユーザーIDは有効なメールアドレスでなければなりません'),
    body('userName')
      .notEmpty()
      .withMessage('ユーザー名は必須です')
      .isString()
      .withMessage('ユーザー名は文字列でなければなりません')
      .isLength({ max: 30 })
      .withMessage('ユーザー名は 30 文字以内でなければなりません'),
    body('mailAddress')
      .notEmpty()
      .withMessage('メールアドレスは必須です')
      .isEmail()
      .withMessage('メールアドレスは有効なメールアドレスでなければなりません'),
    body('roleCd')
      .notEmpty()
      .withMessage('ロールCDは必須です')
      .isString()
      .withMessage('ロールCDは文字列でなければなりません'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('状態は boolean（真偽値）でなければなりません'),
    body('password')
      .optional()
      .isString()
      .withMessage('パスワードは文字列でなければなりません')
      .isLength({ min: 8 })
      .withMessage('パスワードは 8 文字以上でなければなりません'),
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
  tenantIsolation,
  checkPermission('020000', 1), // システム管理者メニュー、書込可
  [
    param('userId')
      .notEmpty()
      .withMessage('ユーザーIDは必須です')
      .isString()
      .withMessage('ユーザーIDは文字列でなければなりません')
      .isEmail()
      .withMessage('ユーザーIDは有効なメールアドレスでなければなりません'),
    body('userName')
      .optional()
      .isString()
      .withMessage('ユーザー名は文字列でなければなりません')
      .isLength({ max: 30 })
      .withMessage('ユーザー名は 30 文字以内でなければなりません'),
    body('roleCd')
      .optional()
      .isString()
      .withMessage('ロールCDは文字列でなければなりません'),
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
  tenantIsolation,
  checkPermission('020000', 1), // システム管理者メニュー、書込可
  [
    param('userId')
      .notEmpty()
      .withMessage('ユーザーIDは必須です')
      .isString()
      .withMessage('ユーザーIDは文字列でなければなりません')
      .isEmail()
      .withMessage('ユーザーIDは有効なメールアドレスでなければなりません'),
    body('isActive')
      .notEmpty()
      .withMessage('状態は必須です')
      .isBoolean()
      .withMessage('状態は boolean（真偽値）でなければなりません'),
  ],
  handleValidationErrors,
  userController.updateUserStatus
);

export default router;
