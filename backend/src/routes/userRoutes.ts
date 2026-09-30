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
      .withMessage('検索が文字列ではありません'),
    query('is_active')
      .optional()
      .isBoolean()
      .withMessage('アクティブ/非アクティブが boolean（真偽値）ではありません'),
    query('role_cd')
      .optional()
      .isString()
      .withMessage('ロールCDが文字列ではありません'),
    query('sort_by')
      .optional()
      .isIn(['user_id', 'user_name', 'update_at'])
      .withMessage('sort_by は user_id / user_name / update_at のいずれかを設定してください'),
    query('sort_order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('sort_order は昇順または降順のいずれかを設定してください'),
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
      .withMessage('ユーザーIDが文字列ではありません')
      .isEmail()
      .withMessage('ユーザーIDが有効なメールアドレスではありません'),
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
      .withMessage('ユーザーIDは有効なメールアドレスを入力してください'),
    body('userName')
      .notEmpty()
      .withMessage('ユーザー名は必須です')
      .isString()
      .withMessage('ユーザー名が文字列ではありません')
      .isLength({ max: 30 })
      .withMessage('ユーザー名は 30 文字以内で入力してください'),
    body('mailAddress')
      .notEmpty()
      .withMessage('メールアドレスは必須です')
      .isEmail()
      .withMessage('メールアドレスは有効なメールアドレスを入力してください'),
    body('roleCd')
      .notEmpty()
      .withMessage('ロールCDは必須です')
      .isString()
      .withMessage('ロールCDが文字列ではありません'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('状態が boolean（真偽値）ではありません'),
    body('password')
      .optional()
      .isString()
      .withMessage('パスワードが文字列ではありません')
      .isLength({ min: 8 })
      .withMessage('パスワードは 8 文字以上で入力してください'),
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
      .withMessage('ユーザーIDが文字列ではありません')
      .isEmail()
      .withMessage('ユーザーIDは有効なメールアドレスを入力してください'),
    body('userName')
      .optional()
      .isString()
      .withMessage('ユーザー名が文字列ではありません')
      .isLength({ max: 30 })
      .withMessage('ユーザー名は 30 文字以内で入力してください'),
    body('roleCd')
      .optional()
      .isString()
      .withMessage('ロールCDが文字列ではありません'),
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
      .withMessage('ユーザーIDが文字列ではありません')
      .isEmail()
      .withMessage('ユーザーIDは有効なメールアドレスを入力してください'),
    body('isActive')
      .notEmpty()
      .withMessage('状態は必須です')
      .isBoolean()
      .withMessage('状態が boolean（真偽値）ではありません'),
  ],
  handleValidationErrors,
  userController.updateUserStatus
);

export default router;
