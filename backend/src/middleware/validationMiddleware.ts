/**
 * バリデーションエラーハンドリングミドルウェア
 * 
 * @description express-validatorのバリデーション結果をチェックし、
 *              エラーがあれば統一されたレスポンス形式で返却する
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { ValidationErrorDetail } from '../types/validation';

/**
 * バリデーションエラーハンドリングミドルウェア
 * 
 * @param req - Expressリクエスト
 * @param res - Expressレスポンス
 * @param next - 次のミドルウェア
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // バリデーションエラーを統一形式に変換
    const details: ValidationErrorDetail[] = errors.array().map((error: ValidationError) => {
      // エラーの種類に応じてフィールド名を取得
      let field = 'unknown';
      let value: any;

      if (error.type === 'field') {
        field = error.path;
        value = error.value;
      }

      return {
        field,
        message: error.msg,
        code: mapErrorToCode(error),
        ...(value !== undefined && { value }),
      };
    });

    // 統一されたエラーレスポンスを返却
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();

    res.status(400).json({
      success: false,
      error: {
        code: 'E1003',
        message: 'バリデーションエラーが発生しました',
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
    return;
  }

  // バリデーションエラーがない場合は次のミドルウェアへ
  next();
};

/**
 * express-validatorのエラーを適切なエラーコードにマッピング
 * 
 * @param error - ValidationError
 * @returns エラーコード文字列
 */
function mapErrorToCode(error: ValidationError): string {
  if (error.type !== 'field') {
    return 'E1003';
  }

  // error.type === 'field' が確定している（上の early return で保証）
  // フィールドのパスから分類（メッセージ文字列に依存しない）
  const path = error.path?.toLowerCase() ?? '';

  // UUID系フィールド: 末尾が 'id' のパス（例: userId, projectId）
  if (path.endsWith('id')) {
    return 'E1005';
  }

  // 汎用バリデーションエラー
  return 'E1003';
}

/**
 * カスタムエラーコードを指定したバリデーションエラーレスポンスを生成
 * 
 * @param field - フィールド名
 * @param message - エラーメッセージ
 * @param code - エラーコード
 * @param value - エラーが発生した値（オプション）
 */
export const createValidationError = (
  field: string,
  message: string,
  code: string = 'E1003',
  value?: any
): ValidationErrorDetail => {
  return {
    field,
    message,
    code,
    ...(value !== undefined && { value }),
  };
};