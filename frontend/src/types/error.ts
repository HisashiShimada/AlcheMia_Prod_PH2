/**
 * エラー関連型定義
 *
 * errorUtils.ts の型定義のうち、独立して定義可能なものを集約。
 * AuthServiceError クラスもここで定義することで、
 * utils → service の不正な依存方向を回避する。
 */

// ---------------------------------------------------------------------------
// AppError
// ---------------------------------------------------------------------------

/**
 * アプリケーション内部で使用するエラー情報オブジェクト
 * （errorUtils.ts より移動）
 */
export interface AppError {
  /** エラーコード（例: 'E5001'） */
  code: string;
  /** ユーザー向け表示メッセージ */
  message: string;
  /** 詳細説明 */
  detail: string;
  /** 発生日時（ISO 8601） */
  timestamp: string;
  /** 元の Error オブジェクト */
  originalError: Error | null;
}

// ---------------------------------------------------------------------------
// AuthServiceError
// ---------------------------------------------------------------------------

/**
 * 認証サービス固有のエラークラス
 *
 * authService.ts で throw され、errorUtils.ts の extractErrorCode() でも
 * instanceof チェックに使用するため、両者から独立したこのファイルで定義する。
 */
export class AuthServiceError extends Error {
  constructor(
    message: string,
    public code: string = 'E9999',
    public details?: Array<{
      field: string;
      message: string;
      code: string;
    }>
  ) {
    super(message);
    this.name = 'AuthServiceError';
  }
}
