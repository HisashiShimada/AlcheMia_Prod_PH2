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
 * サービス層内部で使用するシンプルなAPIレスポンス型
 *
 * @remarks
 * 各 service ファイルで重複定義されていた ApiResponse<T> を一元管理するための型。
 * `success` フラグと `data` / `error` の組み合わせによる軽量なレスポンス表現。
 * `ApiSuccessResponse<T> | ApiErrorResponse`（完全形）とは異なり、
 * メタ情報なしで簡潔にレスポンスを扱いたい場面で使用する。
 */
export interface ServiceApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown[];
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

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
    organizationGroupCds: string[];
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
    organizationGroupCds: string[];
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
  /**
   * ステータス（省略可）
   * 数値型（TransitionStatusEnum に対応）
   * 0: 初期状態, 1: 準備中, 2: 準備完了, 3: 実行中, 4: 一時停止, 5: 完了, 6: エラー
   */
  status?: number;
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
 *
 * DBに実績データがある場合:
 *   data はフラットなkey-value形式（例: { "temperature": 25.5 }）
 *   recordedBy / recordedAt には記録者・記録日時がセットされる
 *
 * 実績データが0件のフォールバック時:
 *   data は { templateId, templateType, properties: [{ key, xsiType, value: null, units }] } 形式
 *   recordedBy / recordedAt は null（未記録を示す）
 */
export interface TemplateDataItem {
  /** プレースID（テンプレートとプレースの紐付けに使用） */
  placeId: string;
  /** テンプレート種別（material / condition / result） */
  templateType: 'material' | 'condition' | 'result';
  /** テンプレートID（テンプレート定義の特定に使用） */
  templateId: string;
  /**
   * MAIMLファイル内のテンプレート名（<name>タグの値）
   * 存在しない場合、または旧データの場合は null / undefined
   */
  templateName?: string | null;
  /**
   * 実験データ本体
   * - DB実績あり: フラットなkey-value形式（フォームの既存値復元に使用）
   * - フォールバック: { templateId, templateType, properties } 形式（MAIMLテンプレート定義）
   */
  data: Record<string, unknown>;
  /**
   * 記録者のユーザーID（UUID）
   * DBに実績がない場合（フォールバック時）は null
   */
  recordedBy: string | null;
  /**
   * 記録日時（ISO 8601 形式）
   * DBに実績がない場合（フォールバック時）は null
   */
  recordedAt: string | null;
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
  /**
   * トランジションステータス（数値型）
   * 0: 初期状態, 1: 準備中, 2: 準備完了, 3: 実行中, 4: 一時停止, 5: 完了, 6: エラー
   */
  status: number;
  /** 進捗率（0〜100、statusが5=completedの場合は自動的に100） */
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
  /**
   * トランジションステータス（数値型）
   * 0: 初期状態, 1: 準備中, 2: 準備完了, 3: 実行中, 4: 一時停止, 5: 完了, 6: エラー
   */
  status: number;
  progressRate: number;
  comment: string | null;
  updatedBy: string;
  updatedAt: string;
}

/**
 * フォーマットフォルダ作成リクエストデータ
 */
export interface CreateFormatFolderRequestData {
  folderName: string;
}

/**
 * フォーマットフォルダ作成レスポンスデータ
 */
export interface CreateFormatFolderResponseData {
  folder_name: string;
  folder_path: string;
  organization_group_cd: string;
  created_at: string;
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
  /** メソッドID（全体指示の場合はnull/未指定） */
  methodId?: string | null;
  
  /** トランジションID（省略可） */
  transitionId?: string | null;
  
  /** タスク連番（省略可） */
  taskNumber?: number | null;
  
  /** 指示内容 */
  content: string;
  
  /** MAIMLのpropertyタグキー（指示種別。必須） */
  instructionKey: string;
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
  
  /** 指示内容 */
  content: string;
  
  /** MAIMLのpropertyタグキー（指示種別。必須） */
  instructionKey: string;
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

