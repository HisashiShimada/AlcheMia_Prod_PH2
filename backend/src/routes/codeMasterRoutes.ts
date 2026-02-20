/**
 * コードマスター関連ルート
 * 
 * @description コードマスターSelectオプション取得などのエンドポイント定義
 * @module codeMasterRoutes
 * @version 1.0.0
 * @date 2026-02-20
 */

import { Router } from 'express';
import { body, param } from 'express-validator';
import * as codeMasterController from '../controllers/codeMasterController';
import { authMiddleware } from '../middleware/authMiddleware';
import { handleValidationErrors } from '../middleware/validationMiddleware';

const router = Router();

/**
 * Selectオプション取得
 * GET /api/v1/code-master/:codeDivision/options
 * 
 * @middleware authMiddleware - JWT認証
 * @description 指定されたcode_divisionのSelectオプションを取得する
 * @note バリデーションはミドルウェアで処理済み
 * @requirements REQ-1, REQ-2
 * @roles all authenticated users
 */
router.get(
  '/:codeDivision/options',
  authMiddleware,
  [
    param('codeDivision')
      .notEmpty()
      .withMessage('codeDivisionは必須です')
      .isLength({ min: 1, max: 50 })
      .withMessage('codeDivisionは1〜50文字である必要があります')
      .matches(/^[a-z0-9_]+$/)
      .withMessage('codeDivisionは小文字の英数字とアンダースコアのみ使用できます'),
  ],
  handleValidationErrors,
  codeMasterController.getSelectOptions
);

/**
 * 複数Selectオプション一括取得
 * POST /api/v1/code-master/options/bulk
 * 
 * @middleware authMiddleware - JWT認証
 * @description 複数のcode_divisionのSelectオプションを一括取得する
 * @note バリデーションはミドルウェアで処理済み
 * @requirements REQ-1, REQ-2
 * @roles all authenticated users
 */
router.post(
  '/options/bulk',
  authMiddleware,
  [
    body('codeDivisions')
      .isArray({ min: 1 })
      .withMessage('codeDivisionsは1要素以上の配列である必要があります'),
    body('codeDivisions.*')
      .notEmpty()
      .withMessage('codeDivisionは必須です')
      .isLength({ min: 1, max: 50 })
      .withMessage('codeDivisionは1〜50文字である必要があります')
      .matches(/^[a-z0-9_]+$/)
      .withMessage('codeDivisionは小文字の英数字とアンダースコアのみ使用できます'),
  ],
  handleValidationErrors,
  codeMasterController.getMultipleSelectOptions
);

export default router;
