/**
 * カスタムエラークラスとエラーハンドリング機能
 * 
 * タスク1.2: エラークラスとエラーハンドリング機能の実装
 * Requirements: 7 (エラーハンドリングとレスポンス)
 * 
 * 統一されたエラーレスポンス形式を提供し、
 * HTTPステータスコードとエラーコードのマッピングを管理します。
 */

/**
 * バリデーションエラー（HTTP 400）
 */
export class ValidationError extends Error {
  public readonly statusCode = 400;
  public readonly code: string;
  public readonly details?: any[];

  constructor(message: string, detailsOrCode?: any[] | string, details?: any[]) {
    super(message);
    this.name = 'ValidationError';

    // 第2引数が文字列の場合はエラーコード、配列の場合は旧来のdetails
    if (typeof detailsOrCode === 'string') {
      this.code = detailsOrCode;
      this.details = details;
    } else {
      this.code = 'E1003';
      this.details = detailsOrCode;
    }

    // TypeScript の制約により、Error を継承する場合は必要
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 認証エラー（HTTP 401）
 */
export class AuthenticationError extends Error {
  public readonly statusCode = 401;
  public readonly code = 'AUTHENTICATION_ERROR';

  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * 認可エラー（HTTP 403）
 */
export class AuthorizationError extends Error {
  public readonly statusCode = 403;
  public readonly code = 'AUTHORIZATION_ERROR';

  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * リソース未検出エラー（HTTP 404）
 */
export class NotFoundError extends Error {
  public readonly statusCode = 404;
  public readonly code = 'NOT_FOUND';
  public readonly resourceType?: string;

  constructor(message: string = 'Resource not found', resourceType?: string) {
    super(message);
    this.name = 'NotFoundError';
    this.resourceType = resourceType;
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * プロジェクト未検出エラー（HTTP 404）
 * 
 * タスク4.1: Worker Task List API用カスタムエラー
 * Requirements: 8 (エラーハンドリング)
 */
export class ProjectNotFoundError extends Error {
  public readonly statusCode = 404;
  public readonly code = 'PROJECT_NOT_FOUND';
  public readonly projectId?: string;

  constructor(message: string = 'Project not found', projectId?: string) {
    super(message);
    this.name = 'ProjectNotFoundError';
    this.projectId = projectId;
    Object.setPrototypeOf(this, ProjectNotFoundError.prototype);
  }
}

/**
 * プロジェクト編集不可エラー（HTTP 403）
 * 
 * タスク6.1: experiment-data-save-api用カスタムエラー
 * Requirements: 7 (エラーハンドリング)
 * 
 * プロジェクトが編集不可能な状態（archived, completedなど）の場合にスローされる。
 */
export class ProjectNotEditableError extends Error {
  public readonly statusCode = 403;
  public readonly code = 'PROJECT_NOT_EDITABLE';
  public readonly projectId?: string;
  public readonly currentStatus?: string;

  constructor(
    message: string = 'プロジェクトが編集可能な状態ではありません',
    projectId?: string,
    currentStatus?: string
  ) {
    super(message);
    this.name = 'ProjectNotEditableError';
    this.projectId = projectId;
    this.currentStatus = currentStatus;
    Object.setPrototypeOf(this, ProjectNotEditableError.prototype);
  }
}

/**
 * タスク未検出エラー（HTTP 404）
 * 
 * タスク6.1: experiment-data-save-api用カスタムエラー
 * Requirements: 7 (エラーハンドリング)
 * 
 * 指定されたタスク番号のタスクが存在しない場合にスローされる。
 */
export class TaskNotFoundError extends Error {
  public readonly statusCode = 404;
  public readonly code = 'TASK_NOT_FOUND';
  public readonly taskNo?: number;
  public readonly projectId?: string;

  constructor(
    message: string = '指定されたタスクが見つかりません',
    taskNo?: number,
    projectId?: string
  ) {
    super(message);
    this.name = 'TaskNotFoundError';
    this.taskNo = taskNo;
    this.projectId = projectId;
    Object.setPrototypeOf(this, TaskNotFoundError.prototype);
  }
}

/**
 * 不正なステータス遷移エラー（HTTP 422）
 * 
 * タスク6.1: experiment-data-save-api用カスタムエラー
 * Requirements: 7 (エラーハンドリング)
 * 
 * トランジションのステータス遷移が許可されていない場合にスローされる。
 * 例: completed → running への遷移は不可
 */
export class InvalidStatusTransitionError extends Error {
  public readonly statusCode = 422;
  public readonly code = 'INVALID_STATUS_TRANSITION';
  public readonly currentStatus?: string;
  public readonly targetStatus?: string;

  constructor(
    message: string = '不正なステータス遷移です',
    currentStatus?: string,
    targetStatus?: string
  ) {
    super(message);
    this.name = 'InvalidStatusTransitionError';
    this.currentStatus = currentStatus;
    this.targetStatus = targetStatus;
    Object.setPrototypeOf(this, InvalidStatusTransitionError.prototype);
  }
}

/**
 * ストレージエラー（HTTP 500）
 */
export class StorageError extends Error {
  public readonly statusCode = 500;
  public readonly code = 'E4006';
  public readonly originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = 'StorageError';
    this.originalError = originalError;
    Object.setPrototypeOf(this, StorageError.prototype);
  }
}

/**
 * データベースエラー（HTTP 500）
 * 
 * タスク4.1: Worker Task List API用カスタムエラー
 * Requirements: 8 (エラーハンドリング)
 */
export class DatabaseError extends Error {
  public readonly statusCode = 500;
  public readonly code = 'DATABASE_ERROR';
  public readonly originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = 'DatabaseError';
    this.originalError = originalError;
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * MAIMLパースエラー（HTTP 500）
 * 
 * タスク4.1: Worker Task List API用カスタムエラー（将来使用）
 * Requirements: 8 (エラーハンドリング)
 */
export class MAIMLParseError extends Error {
  public readonly statusCode = 500;
  public readonly code = 'MAIML_PARSE_ERROR';
  public readonly originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = 'MAIMLParseError';
    this.originalError = originalError;
    Object.setPrototypeOf(this, MAIMLParseError.prototype);
  }
}

/**
 * 競合エラー（HTTP 409）
 * 
 * ビジネスルール違反やリソース競合状態を示すエラー。
 * 例: 既に承認依頼中のプロジェクトに再度承認依頼を送信しようとした場合
 * 
 * タスク5.1: ConflictErrorクラスの実装
 * Requirements: 10, 14
 */
export class ConflictError extends Error {
  public readonly statusCode = 409;
  public readonly code = 'CONFLICT';
  public readonly details?: any[];

  constructor(message: string = 'Resource conflict', details?: any[]) {
    super(message);
    this.name = 'ConflictError';
    this.details = details;
    
    // TypeScript の制約により、Error を継承する場合は必要
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * エラーレスポンス形式
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any[];
  };
  meta: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * エラーオブジェクトを統一されたレスポンス形式に変換
 * 
 * @param error - 変換するエラーオブジェクト
 * @param requestId - リクエストID（オプション）
 * @returns 統一されたエラーレスポンス
 * 
 * @example
 * ```typescript
 * const error = new ValidationError('Invalid email', [{ field: 'email', message: 'Required' }]);
 * const response = formatErrorResponse(error, 'req_123');
 * // => { success: false, error: { code: 'E1003', ... }, meta: { ... } }
 * ```
 */
export function formatErrorResponse(
  error: Error,
  requestId?: string
): ErrorResponse {
  const timestamp = new Date().toISOString();

  // カスタムエラークラスの場合（detailsフィールドを持つエラー）
  if (error instanceof ValidationError || error instanceof ConflictError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details && { details: error.details }),
      },
      meta: {
        timestamp,
        ...(requestId && { requestId }),
      },
    };
  }

  // カスタムエラークラスの場合（detailsフィールドを持たないエラー）
  if (
    error instanceof AuthenticationError ||
    error instanceof AuthorizationError ||
    error instanceof NotFoundError ||
    error instanceof ProjectNotFoundError ||
    error instanceof ProjectNotEditableError ||
    error instanceof TaskNotFoundError ||
    error instanceof InvalidStatusTransitionError ||
    error instanceof StorageError ||
    error instanceof DatabaseError ||
    error instanceof MAIMLParseError
  ) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
      meta: {
        timestamp,
        ...(requestId && { requestId }),
      },
    };
  }

  // 一般的なErrorの場合
  return {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
    },
    meta: {
      timestamp,
      ...(requestId && { requestId }),
    },
  };
}

/**
 * エラーオブジェクトから適切なHTTPステータスコードを取得
 * 
 * @param error - エラーオブジェクト
 * @returns HTTPステータスコード
 * 
 * @example
 * ```typescript
 * const error = new ValidationError('Invalid input');
 * const statusCode = getHttpStatusFromError(error);
 * // => 400
 * ```
 */
export function getHttpStatusFromError(error: Error): number {
  // カスタムエラークラスの場合
  if (
    error instanceof ValidationError ||
    error instanceof AuthenticationError ||
    error instanceof AuthorizationError ||
    error instanceof NotFoundError ||
    error instanceof ProjectNotFoundError ||
    error instanceof ProjectNotEditableError ||
    error instanceof TaskNotFoundError ||
    error instanceof InvalidStatusTransitionError ||
    error instanceof ConflictError ||
    error instanceof StorageError ||
    error instanceof DatabaseError ||
    error instanceof MAIMLParseError
  ) {
    return error.statusCode;
  }

  // statusCode プロパティを持つエラーの場合
  if ('statusCode' in error && typeof (error as any).statusCode === 'number') {
    return (error as any).statusCode;
  }

  // デフォルトは 500 Internal Server Error
  return 500;
}
