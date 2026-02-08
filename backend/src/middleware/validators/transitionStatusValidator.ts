/**
 * トランジションステータスバリデーター
 * 
 * トランジションステータス更新APIの入力値検証を行います。
 * 
 * 検証項目:
 * - status: 必須、7つの標準ステータスのいずれか
 * - comment: オプショナル、2000文字以内
 */

import { body, validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { Status } from '../../types/transitionData';

// 許可されたステータス値
const ALLOWED_STATUSES: Status[] = [
  'initial',
  'preparing',
  'ready',
  'running',
  'paused',
  'completed',
  'error',
];

/**
 * ステータス更新のバリデーションルール
 */
export const updateStatusValidator: (ValidationChain | ((req: Request, res: Response, next: NextFunction) => void))[] = [
  // statusフィールドの検証
  body('status')
    .trim()
    .isIn(ALLOWED_STATUSES)
    .withMessage('statusは必須です')
    .withMessage(
      `statusは ${ALLOWED_STATUSES.join(', ')} のいずれかである必要があります`
    ),

  // commentフィールドの検証（オプショナル）
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('commentは2000文字以内で入力してください'),

  // バリデーション結果のチェック
  (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // バリデーションエラーを統一されたApiResponse形式で返す
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'バリデーションエラー',
          details: errors.array().map((err: any) => ({
            field: err.path || err.param || 'unknown',
            message: err.msg,
          })),
        },
      });
      return;
    }

    next();
  },
];