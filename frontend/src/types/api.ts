/**
 * API共通型定義
 */

/**
 * API成功レスポンスの共通型
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta: {
    timestamp: string;
    requestId: string;
  };
  pagination?: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * APIエラーレスポンスの共通型
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      message: string;
      code: string;
    }>;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * APIレスポンスの共通型（成功またはエラー）
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * ログインレスポンスデータ
 */
export interface LoginResponseData {
  // PIN免除非適用時のフィールド
  sessionToken?: string;
  message?: string;
  email?: string;
  expiresIn?: number;
  
  // PIN免除適用時のフィールド（session.tokenが存在する場合は直接認証完了）
  session?: {
    token: string;
    expiresAt: string;
  };
  user?: {
    id: string;
    username: string;
    email: string;
    roleName: string;
    roleCd: string;
    organizationId: string;
    organizationName: string;
    displayName: string;
    departmentCd: string;
    initialScreenFunctionCd: string;
  };
  passwordChangeRequired?: boolean;  // 一時パスワードでログインした場合はtrue
  redirectUrl?: string;
  
  // 開発環境専用フィールド（NODE_ENV=developmentの場合のみ含まれる）
  pinCode?: string;
  devMode?: boolean;
}

/**
 * 権限情報
 */
export interface Permission {
  functionId: string;
  permission: number;  // 0=書込専用, 1=読取権限
}

/**
 * PINコード検証レスポンスデータ
 */
export interface VerifyPinResponseData {
  user: {
    id: string;
    username: string;
    email: string;
    roleName: string;
    roleCd: string;
    organizationId: string;
    organizationName: string;
    displayName: string;
    departmentCd: string;
    initialScreenFunctionCd: string;
  };
  session: {
    token: string;
    expiresAt: string;
  };
  passwordChangeRequired?: boolean;  // 一時パスワードでログインした場合はtrue
  redirectUrl: string;
}

/**
 * PINコード再送信レスポンスデータ
 */
export interface ResendPinResponseData {
  message: string;
  email: string;
  expiresIn: number;
}

/**
 * ログアウトレスポンスデータ
 */
export interface LogoutResponseData {
  message: string;
}

/**
 * パスワードリセット要求レスポンスデータ
 */
export interface ResetPasswordRequestResponseData {
  message: string;
  email: string;
}

/**
 * パスワードリセット実行レスポンスデータ
 */
export interface ResetPasswordResponseData {
  message: string;
}

/**
 * タスク登録状況レスポンス
 * 
 * @remarks
 * 指示送信タブの初期表示時にボタンの活性/非活性を制御するために使用
 */
export interface TaskRegistrationStatusResponse {
  /** タスクが登録されているか */
  hasRegisteredTasks: boolean;
  
  /** 登録されているタスク数 */
  taskCount: number;
  
  /** プロジェクトステータス（0=計画中） */
  projectStatus: number;
  
  /** 指示送信可能か（タスク登録済 && projectStatus=0） */
  canSendInstructions: boolean;
}

/**
 * 指示保存リクエスト
 * 
 * @remarks
 * POST /api/v1/projects/:projectName/instructions
 */
export interface SaveInstructionRequest {
  /** メソッドID */
  methodId: string;
  
  /** トランジションID（省略可） */
  transitionId?: string | null;
  
  /** タスク連番（省略可） */
  taskNumber?: number | null;
  
  /** 優先度: 0=低, 1=通常, 2=中, 3=高 */
  priority: number;
  
  /** タイプ: 0=一般, 1=セットアップ, 2=測定, 3=安全, 4=清掃 */
  type: number;
  
  /** 指示内容 */
  content: string;
}

/**
 * 指示保存レスポンス
 */
export interface SaveInstructionResponse {
  /** 生成された指示ID */
  instructionId: string;
  
  /** 指示送信ステータス（常に0=未送信） */
  instruction_status: number;
}

/**
 * 指示更新リクエスト
 * 
 * @remarks
 * PUT /api/v1/projects/:projectName/instructions/:instructionId
 */
export interface UpdateInstructionRequest {
  /** メソッドID */
  methodId: string;
  
  /** トランジションID（省略可） */
  transitionId?: string | null;
  
  /** タスク連番（省略可） */
  taskNumber?: number | null;
  
  /** 優先度 */
  priority: number;
  
  /** タイプ */
  type: number;
  
  /** 指示内容 */
  content: string;
}

/**
 * 指示更新レスポンス
 */
export interface UpdateInstructionResponse {
  /** 更新された指示ID */
  instructionId: string;
  
  /** 更新成功フラグ */
  updated: boolean;
}

/**
 * 指示削除レスポンス
 */
export interface DeleteInstructionResponse {
  /** 削除成功フラグ */
  deleted: boolean;
}

/**
 * タスク入力データ（タスク登録タブと共通）
 */
export interface TaskInput {
  /** メソッドID */
  methodId: string;
  
  /** 実験順序 */
  experimentOrder?: number | null;
  
  /** 実験条件 */
  experimentCondition?: number | null;
  
  /** 試行回数 */
  attemptsCount?: number | null;
}

/**
 * 指示送信リクエスト
 * 
 * @remarks
 * POST /api/v1/projects/:projectName/instructions/send
 * タスク作成は別途タスク登録タブで実施されるため、このAPIではパラメータ不要
 */
export type SendInstructionsRequest = Record<string, never>;

/**
 * 指示送信レスポンス
 */
export interface SendInstructionsResponse {
  /** 送信された指示数 */
  sentInstructionsCount: number;
}

