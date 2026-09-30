/**
 * 会社管理ルート
 */

import { Router } from 'express';
import { query, param, body } from 'express-validator';
import * as corporationController from '../controllers/corporationController';
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
 * Corporation一覧取得
 * GET /provider/corporation
 */
router.get(
  '/corporation',
  authMiddleware, // 認証ミドルウェア有効化
  [
    query('search')
      .optional()
      .isString()
      .withMessage('検索が文字列ではありません'),
    query('is_active')
      .optional()
      .isBoolean()
      .withMessage('アクティブ/非アクティブが boolean（真偽値）ではありません'),
    query('sort_by')
      .optional()
      .isString()
      .withMessage('sort_by が文字列ではありません'),
    query('sort_order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('sort_order は昇順または降順のいずれかを設定してください'),
  ],
  handleValidationErrors,
  corporationController.getCorporation
);

/**
 * CorporationCSVダウンロード
 * GET /provider/corporation/download-csv
 * 
 * 注意: このルートは /corporation/:corporationId より前に定義する必要がある
 */
router.get(
  '/corporation/download-csv',
  authMiddleware, // 認証ミドルウェア有効化
  corporationController.downloadCorporationCsv
);

/**
 * CorporationCSVアップロード
 * POST /provider/corporation/upload-csv
 * 
 * 注意: このルートは /corporation/:corporationId より前に定義する必要がある
 */
router.post(
  '/corporation/upload-csv',
  authMiddleware, // 認証ミドルウェア有効化
  upload.single('file'),
  corporationController.uploadCorporationCsv
);

/**
 * Corporation ID指定で1件取得
 * GET /provider/corporation/:corporationId
 */
router.get(
  '/corporation/:corporationId',
  authMiddleware,
  [
    param('corporationId')
      .notEmpty()
      .withMessage('会社のIDは必須です')
      .isString()
      .withMessage('会社のIDが文字列ではありません'),
  ],
  handleValidationErrors,
  corporationController.getCorporationById
);

/**
 * Corporationを新規作成
 * POST /provider/corporation
 */
router.post(
  '/corporation',
  authMiddleware, // 認証ミドルウェア有効化
  [
    body('corporationName')
      .notEmpty()
      .withMessage('会社名は必須です')
      .isString()
      .withMessage('会社名が文字列ではありません'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('状態が boolean（真偽値）ではありません'),
  ],
  handleValidationErrors,
  corporationController.createCorporation
);

/**
 * Corporationを更新
 * PUT /provider/corporation/:corporationId
 */
router.put(
  '/corporation/:corporationId',
  authMiddleware, // 認証ミドルウェア有効化
  [
    param('corporationId')
      .notEmpty()
      .withMessage('会社のIDは必須です')
      .isString()
      .withMessage('会社のIDが文字列ではありません'),
    body('corporationName')
      .notEmpty()
      .withMessage('会社名は必須です')
      .isString()
      .withMessage('会社名が文字列ではありません'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('状態が boolean（真偽値）ではありません'),
  ],
  handleValidationErrors,
  corporationController.updateCorporation
);

/**
 * Corporationのアクティブ状態を更新
 * PATCH /provider/corporation/:corporationId/status
 */
router.patch(
  '/corporation/:corporationId/status',
  authMiddleware, // 認証ミドルウェア有効化
  [
    param('corporationId')
      .notEmpty()
      .withMessage('会社のIDは必須です')
      .isString()
      .withMessage('会社のIDが文字列ではありません'),
  ],
  handleValidationErrors,
  corporationController.updateCorporationStatus
);

export default router;