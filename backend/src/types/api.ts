/**
 * API リクエスト/レスポンスの型定義
 * 
 * このファイルはAPIエンドポイントで使用する型定義を集約します。
 */

// ============================================================
// プロジェクト関連のリクエスト/レスポンス型
// ============================================================

/**
 * プロジェクト作成リクエスト
 * POST /api/v1/projects
 */
export interface CreateProjectRequest {
  /** プロジェクト名 */
  projectName: string;
  
  /** プロジェクト説明（オプション） */
  description?: string;
}

/**
 * プロジェクト一覧取得パラメータ
 * GET /api/v1/projects
 */
export interface ListProjectsParams {
  /** ページ番号（デフォルト: 1） */
  page?: number;
  
  /** 1ページあたりの件数（デフォルト: 20） */
  limit?: number;
  
  /** 完了済みプロジェクトを含めるか（デフォルト: false） */
  include_completed?: boolean;
  
  /** ソート項目（デフォルト: create_at） */
  sort_by?: string;
  
  /** ソート順（デフォルト: desc） */
  order?: 'asc' | 'desc';
}

/**
 * プロジェクトタスク一覧取得パラメータ
 * GET /api/v1/projects/:projectName/tasks
 */
export interface GetProjectTasksParams {
  /** タスクステータスフィルタ（デフォルト: all） */
  status?: 'all' | 'pending' | 'in_progress' | 'completed' | 'failed';
}

/**
 * プロジェクトファイル一覧取得パラメータ
 * GET /api/v1/projects/:projectName/files
 */
export interface GetProjectFilesParams {
  // 現在はパラメータなし（将来の拡張用に定義）
}

/**
 * プロジェクトチェックアウトパラメータ
 * POST /api/v1/projects/:projectName/checkout
 */
export interface CheckoutParams {
  // リクエストボディなし（パスパラメータのみ）
}

// ============================================================
// 指示管理関連のリクエスト/レスポンス型
// ============================================================

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
export interface SendInstructionsRequest {
  // パラメータなし（空のリクエストボディ）
}

/**
 * 指示送信レスポンス
 */
export interface SendInstructionsResponse {
  /** 送信された指示数 */
  sentInstructionsCount: number;
}

/**
 * 指示データ（フロントエンドのInstructionData型と共通）
 * 
 * @remarks
 * frontend/src/types/instructionRegistration.ts の InstructionData と同じ構造
 * targetType はフロントエンドで計算するため、APIレスポンスには含めない
 */
export interface InstructionData {
  /** 指示ID */
  id: string;
  
  /** 指示内容 */
  content: string;
  
  /** 優先度: 0=低, 1=通常, 2=中, 3=高 */
  priority: number;
  
  /** タイプ: 0=一般, 1=セットアップ, 2=測定, 3=安全, 4=清掃 */
  type: number;
  
  /** メソッドID */
  methodId: string;
  
  /** トランジションID */
  transitionId: string;
  
  /** タスク連番（省略可） */
  taskNumber?: number;
  
  /** 送信済フラグ */
  isSent: boolean;
}

/**
 * 指示一覧取得レスポンス
 */
export interface GetInstructionsResponse {
  /** 指示一覧 */
  instructions: InstructionData[];
}
