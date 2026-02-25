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
 * データ取得状態の共通型
 * useApi フック等で使用するローディング・エラー・データを統合した状態型
 */
export interface DataState<T> {
  /** 取得したデータ（取得前またはエラー時は null） */
  data: T | null;
  /** ローディング中かどうか */
  isLoading: boolean;
  /** エラー情報（正常時は null） */
  error: Error | null;
}

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

// ===== 実験データ保存API =====

/**
 * 実験データ保存リクエスト - records配列の1要素
 *
 * @remarks
 * API: POST /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data
 * DDL: docs/design/db/ddl/template_data.sql
 */
export interface ExperimentDataRecord {
  /** プレースID（一意キーに使用） */
  placeId: string;
  /** テンプレート種別 */
  templateType: 'material' | 'condition' | 'result';
  /** テンプレートID */
  templateId: string;
  /** 実験データ（JSONB形式） */
  data: Record<string, unknown>;
  /** ステータス（省略可） */
  status?: 'initial' | 'preparing' | 'ready' | 'running' | 'paused' | 'completed' | 'error';
  /** コメント（省略可、最大2000文字） */
  comment?: string;
}

/**
 * 実験データ一括保存リクエストボディ
 */
export interface SaveBatchExperimentDataRequest {
  records: ExperimentDataRecord[];
}

/**
 * 実験データ保存レスポンス - 保存された1レコード
 */
export interface SavedExperimentRecord {
  id: string;
  projectId: string;
  methodId: string;
  taskNo: number;
  placeId: string;
  templateType: string;
  templateId: string;
  data: Record<string, unknown>;
  status: string;
  comment: string | null;
  recordedBy: string;
  recordedAt: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 実験データ一括保存レスポンス
 */
export interface SaveBatchExperimentDataResponse {
  success: boolean;
  data: {
    saved: number;
    records: SavedExperimentRecord[];
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

// ===== テンプレート実績一覧取得API =====

/**
 * テンプレート実績データの1要素
 *
 * @remarks
 * API: GET /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data
 */
export interface TemplateDataItem {
  /** プレースID（テンプレートとプレースの紐付けに使用） */
  placeId: string;
  /** テンプレート種別（material / condition / result） */
  templateType: 'material' | 'condition' | 'result';
  /** テンプレートID（テンプレート定義の特定に使用） */
  templateId: string;
  /** 実験データ本体（フォームの既存値復元に使用） */
  data: Record<string, unknown>;
  /** 記録者のユーザーID（UUID） */
  recordedBy: string;
  /** 記録日時（ISO 8601 形式） */
  recordedAt: string;
}

/**
 * テンプレート実績一覧取得レスポンスの data オブジェクト
 */
export interface GetTemplateDataResponseData {
  projectName: string;
  methodId: string;
  taskNo: number;
  transitionId: string;
  /** MaiML から特定した隣接プレースIDの一覧 */
  adjacentPlaceIds: string[];
  /** 実績データ配列（0件の場合は空配列） */
  templates: TemplateDataItem[];
  totalCount: number;
}

/**
 * テンプレート実績一覧取得レスポンス全体
 */
export interface GetTemplateDataResponse {
  success: boolean;
  data: GetTemplateDataResponseData;
  meta: {
    timestamp: string;
    requestId: string;
  };
}

// ===== トランジションステータス更新API =====

/**
 * トランジションステータス更新リクエストボディ
 *
 * @remarks
 * API: PATCH /api/v1/progress/projects/:projectName/methods/:methodId/transitions/:transitionId/status
 */
export interface UpdateTransitionStatusRequest {
  /** タスク連番（1以上の整数） */
  taskNo: number;
  /** トランジションステータス */
  status: 'initial' | 'preparing' | 'ready' | 'running' | 'paused' | 'completed' | 'error';
  /** 進捗率（0〜100、statusがcompletedの場合は自動的に100） */
  progressRate?: number;
  /** コメント（最大2000文字） */
  comment?: string;
}

/**
 * トランジションステータス更新レスポンスデータ
 *
 * @remarks
 * API: PATCH /api/v1/progress/projects/:projectName/methods/:methodId/transitions/:transitionId/status
 */
export interface UpdateTransitionStatusResponse {
  transitionId: string;
  taskNo: number;
  methodId: string;
  projectName: string;
  status: string;
  progressRate: number;
  comment: string | null;
  updatedBy: string;
  updatedAt: string;
}
