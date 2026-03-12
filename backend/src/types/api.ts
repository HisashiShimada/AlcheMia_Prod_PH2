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

// ============================================================
// WorkProgressDetailDialog 用 API 型定義
// ============================================================

/**
 * プロジェクト情報詳細
 * WorkProgressDetailDialog の projectInfo に対応
 */
export interface ProjectInfoDetail {
  /** プロジェクトID */
  projectId: string;

  /** プロジェクト名 */
  projectName: string;

  /** プロジェクト説明 */
  projectDescription?: string;

  /** オーナー名 */
  owner: string;

  /** 部門名 */
  department?: string;

  /** プロジェクトステータス（文字列） */
  status: 'planning' | 'pending' | 'in_progress' | 'review_waiting' | 'completed' | 'error';

  /** メソッドID一覧（MAIMLから取得） */
  methods: string[];

  /** 作成日時（ISO8601） */
  createdAt: string;

  /** 更新日時（ISO8601） */
  updatedAt: string;
}

/**
 * ファイル情報詳細
 * WorkProgressDetailDialog の fileInfo に対応
 */
export interface FileInfoDetail {
  /** ファイル名（例: プロジェクト名.maiml） */
  fileName: string;

  /** MAIMLファイルのストレージキー（例: {organizationId}/projects/{name}/{name}.maiml） */
  maimlFileKey: string;

  /** 組織ID */
  organizationId: string;

  /** チェックアウト状態 */
  checkoutStatus: {
    /** チェックアウト中か */
    isCheckedOut: boolean;
    /** チェックアウトしているユーザーID（チェックアウト中の場合） */
    checkoutBy?: string | null;
  };
}

/**
 * トランジション進捗情報
 * WorkProgressDetailDialog の transitionProgress の各要素に対応
 */
export interface TransitionProgressItem {
  /** トランジションID */
  transitionId: string;

  /** トランジション名（MAIMLから取得、未定義の場合はtransitionId） */
  transitionName?: string;

  /** 進捗状態（日本語文字列）: 未開始 / 準備中 / 作業中 / 休止中 / 完了 / 異常中 */
  progressStatus: string;

  /** 担当作業者名 */
  assignedWorker?: string;

  /** 開始日時（ISO8601、create_at） */
  startDate?: string;

  /** 終了日時（ISO8601、完了時の update_at） */
  endDate?: string;
}

/**
 * 作業詳細情報（タスク単位）
 * WorkProgressDetailDialog の workDetails の各要素に対応
 */
export interface WorkDetailItem {
  /** タスク識別子（"{methodId}_{experimentOrder}" 形式） */
  workId: string;

  /** タスク連番（タスクNo）（project_task.experiment_order） */
  taskNo: number;

  /** メソッド名（project_task.method_id） */
  methodName?: string;

  /** 割り当て作業者ID */
  assignedWorkerId?: string;

  /** タスクステータス（文字列） */
  workStatus: string;

  /** 進捗率（0〜100） */
  progressPercentage?: number;

  /** トランジション統計情報 */
  stats: {
    /** トランジション総数 */
    totalTransitions: number;
    /** 完了数（status=5） */
    completed: number;
    /** 作業中数（status=1,2,3,4） */
    working: number;
    /** 未着手数（status=0） */
    notStarted: number;
    /** 完了率（0〜100） */
    completionRate: number;
  };

  /** トランジション進捗一覧 */
  transitionProgress?: TransitionProgressItem[];
}

/**
 * WorkProgressDetailDialog 用 API レスポンスデータ
 * GET /api/v1/progress/projects/:projectName/work-details のレスポンス data 部分
 */
export interface WorkProgressDetailResponse {
  /** プロジェクト情報 */
  projectInfo: ProjectInfoDetail;

  /** ファイル情報 */
  fileInfo: FileInfoDetail;

  /** 作業詳細一覧（タスク × トランジション進捗） */
  workDetails: WorkDetailItem[];
}

// ============================================================
// タスク詳細取得API 型定義
// GET /api/v1/tasks/:taskId
// ============================================================

/**
 * トランジション進捗の個別レコード
 * GET /api/v1/tasks/:taskId のレスポンス transitionProgress[] の各要素
 */
export interface TaskDetailTransitionItem {
  /** トランジションID */
  transitionId: string;

  /** トランジションステータス数値（0:初期, 1:準備中, 2:準備完了, 3:実行中, 4:一時停止, 5:完了, 6:エラー） */
  status: number | null;

  /** 進捗率（0〜100） */
  progressRate: number | null;

  /** 最終更新日時（ISO8601） */
  updatedAt: string | null;
}

/**
 * タスク詳細統計情報
 */
export interface TaskDetailStats {
  /** トランジション総数 */
  totalTransitions: number;

  /** 完了数（status = 5） */
  completed: number;

  /** 作業中数（status = 1〜4） */
  inProgress: number;

  /** 未着手数（status = 0 または NULL） */
  notStarted: number;

  /** 進捗率（0〜100、avg_progress_rate から算出） */
  progressPercentage: number;
}

/**
 * タスク詳細取得APIレスポンス data 部分
 * GET /api/v1/tasks/:taskId
 *
 * taskId フォーマット: "{projectId}__{methodId}__{taskNo}" （ダブルアンダースコア区切り）
 * 例: "550e8400-e29b-41d4-a716-446655440000__method1__3"
 */
export interface TaskDetailResponse {
  /** タスクID文字列（{projectId}__{methodId}__{taskNo} 形式） */
  taskId: string;

  /** プロジェクトID */
  projectId: string;

  /** プロジェクト名 */
  projectName: string;

  /** メソッドID */
  methodId: string;

  /** 実験順序（project_task.experiment_order） */
  experimentOrder: number;

  /** タスク連番（project_task_detail.task_no） */
  taskNo: number;

  /** タスクステータス文字列（pending / in_progress / review_waiting / completed / failed） */
  taskStatus: string;

  /** タスクステータス数値（project_task_detail.task_status） */
  taskStatusNum: number | null;

  /** 担当作業者ID */
  experimentUserId: string | null;

  /** 担当作業者名 */
  experimentUserName: string | null;

  /** 実験開始日時（ISO8601） */
  experimentStartAt: string | null;

  /** 実験終了日時（ISO8601） */
  experimentEndAt: string | null;

  /** レビュー完了日時（ISO8601） */
  reviewedAt: string | null;

  /** レビュアーID */
  reviewUserId: string | null;

  /** トランジション進捗一覧（transition_data から取得） */
  transitionProgress: TaskDetailTransitionItem[];

  /** 進捗統計情報 */
  stats: TaskDetailStats;

  /** レコード作成日時（ISO8601） */
  createdAt: string | null;

  /** レコード更新日時（ISO8601） */
  updatedAt: string | null;
}

