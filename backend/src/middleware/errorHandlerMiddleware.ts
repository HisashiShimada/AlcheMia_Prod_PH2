import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * エラーハンドリングミドルウェア
 * 
 * 統一されたエラーレスポンス形式でエラーを返却します。
 * 
 * @param err エラーオブジェクト
 * @param req Expressリクエストオブジェクト
 * @param res Expressレスポンスオブジェクト
 * @param next Expressネクスト関数
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // HTTPステータスコードの決定
  const statusCode = err.statusCode || 500;

  // エラーコードの決定（err.code → err.name → デフォルト値の順で優先）
  const errorCode = err.code || err.name || 'SYSTEM_INTERNAL_ERROR';

  // ユーザーフレンドリーなエラーメッセージ
  let errorMessage: string;
  if (statusCode === 500) {
    // 500エラーの場合は汎用メッセージを使用（内部エラー詳細を隠す）
    errorMessage = 'システムエラーが発生しました';
  } else {
    // その他のエラーは元のメッセージを使用
    errorMessage = err.message || 'システムエラーが発生しました';
  }

  // リクエストIDの取得または生成
  const requestId = (req.headers['x-request-id'] as string) || `req_${crypto.randomBytes(8).toString('hex')}`;

  // エラーログの記録（スタックトレース含む）
  console.error('Error:', {
    message: err.message || 'Unknown error',
    code: errorCode,
    statusCode,
    stack: err.stack,
    path: req.path,
    method: req.method,
    requestId,
  });

  // 統一エラーレスポンス形式
  const errorResponse: any = {
    success: false,
    error: {
      code: errorCode,
      message: errorMessage,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  };

  // detailsが存在する場合のみ追加
  if (err.details && Array.isArray(err.details) && err.details.length > 0) {
    errorResponse.error.details = err.details;
  }

  // レスポンス送信
  res.status(statusCode).json(errorResponse);
};
