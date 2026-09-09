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

  /**
   * 公開範囲を限定する組織グループCD（オプション）。
   * 指定時: そのグループに所属するユーザーのみ閲覧可能。
   * 未指定時: バックエンドで JWT 内の organizationGroupCds[0] にフォールバック。
   * project.organization_gourp_cd に保存される。
   */
  organizationGroupCd?: string;
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
 * GET /api/v1/projects/:projectId/tasks
 */
export interface GetProjectTasksParams {
  /** タスクステータスフィルタ（デフォルト: all） */
  status?: 'all' | 'pending' | 'in_progress' | 'completed' | 'failed';
}

/**
 * プロジェクトファイル一覧取得パラメータ
 * GET /api/v1/projects/:projectId/files
 */
export interface GetProjectFilesParams {
  // 現在はパラメータなし（将来の拡張用に定義）
}

/**
 * プロジェクトチェックアウトパラメータ
 * POST /api/v1/projects/:projectId/checkout
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
 * POST /api/v1/projects/:projectId/instructions
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
 * PUT /api/v1/projects/:projectId/instructions/:instructionId
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
 * POST /api/v1/projects/:projectId/instructions/send
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
  
  /** メソッドID */
  methodId: string;

  /** メソッド名（MAIMLのmethod@name属性。未設定時はmethodId） */
  methodName?: string;
  
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

  /** 組織グループ名 */
  organizationGroup?: string;

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
 * GET /api/v1/progress/projects/:projectId/work-details のレスポンス data 部分
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

  /** トランジションステータス数値（1:初期状態, 2:準備状態, 3:準備完了状態, 4:動作状態, 5:休止状態, 6:終状態, 7:異常終了状態） */
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

// ============================================================
// メソッド別タスク一覧＋進捗情報取得API 型定義
// GET /api/v1/projects/:projectId/methods/:methodId/tasks
// ============================================================

/**
 * タスク単位のトランジション進捗統計
 */
export interface TaskProgressStats {
  /** トランジション総数（transition_data から集計） */
  total_transitions: number;

  /** 完了数（status = 5） */
  completed: number;

  /** 作業中数（status = 1〜4） */
  in_progress: number;

  /** 未着手数（status = 0 または NULL） */
  not_started: number;

  /** 進捗率（0〜100、avg_progress_rate から算出） */
  progress_percentage: number;
}

/**
 * メソッド別タスク一覧の各タスク要素
 * GET /api/v1/projects/:projectId/methods/:methodId/tasks のレスポンス tasks[]
 */
export interface MethodTaskItem {
  /** 実験順序（project_task.experiment_order） */
  experiment_order: number;

  /** タスク名（project_task.task_name） */
  task_name: string | null;

  /** タスク連番（project_task_detail.task_no） */
  task_no: number | null;

  /** タスクステータス文字列（pending / in_progress / review_waiting / completed / failed） */
  task_status: string;

  /** タスクステータス数値（project_task_detail.task_status） */
  task_status_num: number | null;

  /** 担当作業者ID */
  experiment_user_id: string | null;

  /** 担当作業者名 */
  experiment_user_name: string | null;

  /** 実験開始日時（ISO8601） */
  experiment_start_at: string | null;

  /** 実験終了日時（ISO8601） */
  experiment_end_at: string | null;

  /** トランジション進捗統計 */
  progress: TaskProgressStats;

  /** レコード作成日時（ISO8601） */
  created_at: string | null;

  /** レコード更新日時（ISO8601） */
  updated_at: string | null;
}

/**
 * メソッド別タスク一覧の統計サマリー
 */
export interface MethodTasksStatistics {
  /** タスク総数 */
  total: number;

  /** 未着手タスク数（task_status = pending） */
  pending: number;

  /** 実行中タスク数（task_status = in_progress） */
  in_progress: number;

  /** 完了タスク数（task_status = completed） */
  completed: number;

  /** 失敗タスク数（task_status = failed） */
  failed: number;

  /** 全体進捗率（各タスクの progress_percentage の平均、0〜100） */
  overall_progress: number;
}

/**
 * メソッド別タスク一覧＋進捗情報取得APIレスポンス data 部分
 * GET /api/v1/projects/:projectId/methods/:methodId/tasks
 */
export interface MethodTasksResponse {
  /** プロジェクトID */
  project_id: string;

  /** メソッドID */
  method_id: string;

  /** タスク一覧（experiment_order + task_no 単位） */
  tasks: MethodTaskItem[];

  /** 統計サマリー */
  statistics: MethodTasksStatistics;
}

// ============================================================
// MaiML 公開/非公開関連のリクエスト/レスポンス型
// ============================================================

/**
 * MaiML 公開リクエスト
 * POST /api/v1/projects/:projectId/publish
 *
 * @remarks
 * maiml_publish_registry に登録する4つのフラグを受け取る
 * 仕様: docs/MaiML_OpenData_Pipeline/spec.md §3.1
 */
export interface MaimlPublishRequest {
  /**
   * テンプレートのみ公開するか
   * true の場合、KV属性・プレビューは生成しない
   * @default false
   */
  template_only: boolean;

  /**
   * 生データ（series）を DB に永続化するか
   * true の場合、maiml_series_raw_header / maiml_series_raw_chunk に保存
   * @default false
   */
  store_raw_series: boolean;

  /**
   * 公開期限（自動非公開日時）
   * ISO 8601 形式の文字列。省略した場合は無期限公開
   * @example "2026-12-31T00:00:00+09:00"
   */
  retention: string | null;

  /**
   * 非公開時に生データを残すか
   * false の場合、非公開時に maiml_series_raw_* も CASCADE 削除される
   * @default false
   */
  keep_raw_on_unpublish: boolean;
}

/**
 * MaiML 公開レスポンス
 */
export interface MaimlPublishResponse {
  /** 公開レジストリ ID */
  registryId: string;

  /** プロジェクト名 */
  projectName: string;

  /** 公開ステータス */
  status: 'requested' | 'published';

  /** 受付日時 */
  requestedAt: string;
}

// ============================================================
// 実験指示関連の型定義
// experimentInstructionService で使用
// ============================================================

/**
 * 不確かさ判定サマリー（実験指示タブ表示用）
 */
export interface UncertaintyJudgeSummary {
  /** 不確かさ基準Key（テンプレートの uncertainty.key） */
  instructionKey: string;
  /**
   * 不確かさ基準名（uncertainty_criteria.description から取得）。
   * 取得できない場合は undefined。
   */
  criteriaName?: string;
  /** 許容上限値 */
  toleranceUpper: number | null;
  /** 許容下限値 */
  toleranceLower: number | null;
  /** 判定結果 */
  judgeResult: '良好' | '不良';
  /** 作業者が入力した不確かさ値 */
  recordedValue: number;
}

/**
 * 1 フィールドの実験指示情報
 */
export interface InstructionField {
  key: string;
  /** property_set 内の displayName。存在しない場合はキーをそのまま使用 */
  label: string;
  /** xsiType 文字列（例: "FloatValue", "StringValue"）*/
  xsiType: string | null;
  /** 実験計画（想定値）。未設定の場合は null */
  plannedValue: string | null;
  /** 実際の記録値。template_data の property_set.properties[n].content.value から取得 */
  actualValue: string | null;
  /** 単位（units 属性） */
  unit: string | null;
  /**
   * 不確かさ判定結果一覧（experiment_uncertainty_judge から取得）。定量評価。
   * 0件 = 未判定、1件以上 = 判定済み（複数の uncertainty_key が設定されている場合は複数件）
   */
  uncertaintyJudges?: UncertaintyJudgeSummary[];
  /**
   * 定性評価の不確かさ基準名（uncertainty_criteria.uncertainty_name）。
   * experiment_instruction_detail.uncertainty_key から解決する。未設定時は null。
   */
  qualitativeCriteriaName?: string | null;
  /**
   * 定性評価の付与値（確か / 曖昧 / 不確か 等）。
   * experiment_instruction_detail.uncertainty_assigned_value から取得。未設定時は null。
   */
  qualitativeAssignedValue?: string | null;
}

/**
 * 1 テンプレートの実験指示情報
 */
export interface InstructionTemplate {
  templateId: string;
  templateName: string | null;
  templateType: string;
  fields: InstructionField[];
  /** template_data の place_id（訂正時にバックエンドへ渡すために必要） */
  placeId: string | null;
  /** トランジションID（experiment_instruction_detail.transition_id から取得） */
  transitionId: string | null;
  /** トランジション表示名（experiment_instruction_detail.transition_name から取得。未設定時はtransitionIdで代替） */
  transitionName: string | null;
}

/**
 * 1 タスクの実験指示情報
 */
export interface InstructionTask {
  taskNo: number;
  /** task_status の数値 */
  taskStatus: number | null;
  reviewedAt: string | null;
  reviewUserId: string | null;
  reviewResult: string | null;
  templates: InstructionTemplate[];
  /** 実験作業者ID（project_task_detail.experiment_user_id） */
  experimentUserId: string | null;
  /** 実験終了日時（project_task_detail.experiment_end_at, ISO文字列） */
  experimentEndAt: string | null;
}

/**
 * 1 メソッドの実験指示情報
 */
export interface InstructionMethod {
  methodId: string;
  tasks: InstructionTask[];
}

/**
 * getExperimentInstructions の戻り値
 */
export interface ExperimentInstructionsResult {
  methods: InstructionMethod[];
}

/**
 * getProjectMethods の戻り値
 */
export interface ProjectMethod {
  id: string;
}

/**
 * approveTask / recordNg の戻り値
 */
export interface TaskReviewResult {
  /** 更新後の task_status */
  taskStatus: number | null;
  reviewedAt: string | null;
  reviewUserId: string | null;
  reviewResult: string | null;
}

// ============================================================
// 実験計画関連の型定義
// experimentPlanService で使用
// ============================================================

import type { ExperimentPlanValues } from './database';

/**
 * 実験計画 DTO（Service 層の出力）
 */
export interface ExperimentPlanDto {
  taskNo: number;
  plannedValues: ExperimentPlanValues;
  createdAt: Date | undefined;
  updatedAt: Date | undefined;
}

/**
 * getExperimentPlans の戻り値
 */
export interface GetExperimentPlansResult {
  methodId: string;
  plans: ExperimentPlanDto[];
}

/**
 * upsertExperimentPlan の入力
 */
export interface UpsertExperimentPlanInput {
  organizationId: string;
  projectId: string;
  methodId: string;
  taskNo: number;
  plannedValues: ExperimentPlanValues;
  userId: string;
  /**
   * ExperimentPlanDialog から渡されるテンプレート定義一覧。
   * planned_values の fieldKey から template_id / template_name / xsi_type を解決するために使用する。
   * 省略された場合は experiment_instruction_detail の upsert をスキップする。
   */
  templates?: TemplateDef[];
  /**
   * ExperimentPlanDialog から渡されるトランジション定義一覧。
   * planned_values の transitionId から transition_name を解決するために使用する。
   * 省略された場合は transition_name が null になる。
   */
  transitions?: Array<{ id: string; name: string }>;
}

// ============================================================
// ExperimentPlanDialog 用データ型
// getPlanDialogData (experimentInstructionController) で使用
// ============================================================

/**
 * ExperimentPlanDialog の1フィールド定義
 */
export interface TemplateField {
  /** プロパティキー（MAIMLの property.key） */
  key: string;
  /** 表示ラベル（description ?? key） */
  label: string;
  /** 入力タイプ */
  type: 'text' | 'number' | 'select';
  /** 単位（オプション） */
  units?: string;
  /** 必須フラグ（デフォルト false） */
  required?: boolean;
  /** select 型の場合の選択肢 */
  options?: string[];
  /** デフォルト値（MAIMLの Property.value から設定） */
  defaultValue?: string | number | boolean;
  /**
   * MAIMLの xsi:type 文字列（例: 'doubleType', 'floatType', 'stringEnumType'）
   * 入力タイプの判定に使われた元の値。フロントエンドでの表示用に保持する。
   */
  xsiType?: string;
  /**
   * MAIMLテンプレートに設定されたデフォルト不確かさ一覧。
   * MAIML の property.uncertainty[] から変換。
   * DBに保存済みの値がある場合はそちらを優先し、このフィールドは初期値として使用する。
   */
  defaultUncertainties?: Array<{
    /** 不確かさ基準キー（uncertainty.key） */
    criteriaKey: string;
    /** 不確かさ基準名（DB の uncertainty_name、なければ key） */
    criteriaName: string;
    /** 評価タイプ */
    evalType: 'quantitative' | 'qualitative';
    /** 説明文（MAIML の uncertainty.description / commentの初期値として使用） */
    description?: string;
    /** 定量評価値 */
    ucValue?: number;
    /** 定性評価値 */
    qualitativeValue?: string;
    /** 単位 */
    unit?: string;
  }>;
}

/**
 * ExperimentPlanDialog の1テンプレート定義
 */
export interface TemplateDef {
  /** テンプレートID（MAIMLの template.id） */
  id: string;
  /** 表示ラベル（name ?? id） */
  label: string;
  /** テンプレートカテゴリ */
  category: 'material' | 'condition' | 'result';
  /** フィールド一覧 */
  fields: TemplateField[];
  /**
   * このテンプレートに紐づく Place ID の一覧
   * MAIMLの placeRefs[].id から抽出する
   * トランジション選択時のテンプレート絞り込みに使用
   */
  placeIds: string[];
}

/**
 * getPlanDialogData API のレスポンス data 部分
 * GET /api/v1/projects/:projectId/methods/:methodId/plan-dialog-data
 */
export interface PlanDialogData {
  /** メソッドのトランジション一覧 */
  transitions: Array<{
    id: string;
    name: string;
    /** 直接依存するトランジションIDの配列（Petri Net の Arc から計算）*/
    prerequisiteTransitionIds: string[];
    /**
     * このトランジションに流入する Place ID の一覧（入力Place）
     * Arc.target === transitionId の Arc の source（Place）を収集する
     * テンプレート絞り込みに使用（入力Place紐づきテンプレートは入力可能）
     */
    inputPlaceIds: string[];
    /**
     * このトランジションから流出する Place ID の一覧（出力Place）
     * Arc.source === transitionId の Arc の target（Place）を収集する
     * テンプレート絞り込みに使用（出力Place紐づきテンプレートは表示するがdisabled）
     */
    outputPlaceIds: string[];
  }>;
  /** テンプレート定義一覧 */
  templates: TemplateDef[];
  /** Creator 選択肢（value: document.creators の id, label: name || id） */
  creatorRefs: Array<{ value: string; label: string }>;
  /** Instrument 選択肢（value: document.instruments の id, label: name || id） */
  instrumentRefs: Array<{ value: string; label: string }>;
  /** Owner 選択肢（value: document.owners の id, label: name || id） */
  ownerRefs: Array<{ value: string; label: string }>;
  /**
   * MAIMLのdata層から抽出したインスタンス一覧。
   * data.results[].materials / conditions / results の各インスタンスを変換したもの。
   * 各インスタンスの ref フィールドがテンプレートIDに対応する。
   * data層がない場合は空配列またはundefined。
   */
  dataInstances?: Array<{
    /** MAIMLインスタンスのid */
    instanceId: string;
    /** テンプレートへの参照（templateIdに対応） */
    templateRef: string;
    /** カテゴリ */
    category: 'material' | 'condition' | 'result';
    /** インスタンス名（任意） */
    name?: string;
    /** プロパティ一覧 */
    properties: Array<{
      key: string;
      value: string | number | boolean | null;
      units?: string;
    }>;
  }>;
  /**
   * Conditionテンプレートから抽出した基本情報の初期値
   * 以下のキーを持つプロパティが存在する場合に設定される:
   *   - Alchemia:SupervisorDirectiveCaution / OperationNote / CheckItem / ProhibitedAction / OtherNotes
   */
  defaultBasicInfo?: {
    creatorRefs?: string[];
    instrumentRefs?: string[];
    ownerRefs?: string[];
    /**
     * 注意事項の初期値
     * Conditionテンプレートに注意事項キー（Alchemia:SupervisorDirectiveCaution 等）が
     * 設定されている場合に生成される
     */
    notes?: Array<{
      /** NoteType の値（例: 'Alchemia:SupervisorDirectiveCaution'） */
      type: string;
      /** デフォルト内容（MAIMLの prop.value） */
      content: string;
    }>;
  };
}

// ============================================================
// 名前空間 (namespace) 関連リクエストボディ型
// ============================================================

/**
 * POST /api/v1/namespaces リクエストボディ
 *
 * @remarks namespaceController.createNamespace で使用
 */

/**
 * 状態記録ダイアログ用 休止状態ペア
 *
 * @remarks progressController.getTransitionStateRecords のレスポンスで使用
 */
export interface PauseEntryRecord {
  /** 休止状態（paused）の遷移時刻（ISO8601形式）、未記録の場合は null */
  pauseTime: string | null;
  /** 動作再開（running）の遷移時刻（ISO8601形式）、未記録の場合は null */
  resumeTime: string | null;
}

/**
 * 状態記録ダイアログ用 トランジション状態遷移時刻レスポンス
 *
 * @remarks
 * GET /api/v1/progress/projects/:projectId/methods/:methodId/transitions/:transitionId/state-records
 * のレスポンス data フィールドの型。
 * maiml_event_log から抽出した各状態の最新遷移時刻を返す。
 * 未記録のフィールドは null を返す。
 */
export interface TransitionStateRecordsResult {
  /** 準備状態（preparing）への遷移時刻（ISO8601形式）、未記録は null */
  preparingTime: string | null;
  /** 準備完了状態（ready）への遷移時刻（ISO8601形式）、未記録は null */
  readyTime: string | null;
  /** 動作状態（running）への最初の遷移時刻（ISO8601形式）、未記録は null */
  runningTime: string | null;
  /** 休止状態・動作再開のペア配列（複数回の休止に対応） */
  pauseEntries: PauseEntryRecord[];
  /** 終状態（completed）への遷移時刻（ISO8601形式）、未記録は null */
  completedTime: string | null;
  /** 異常終了状態（error）への遷移時刻（ISO8601形式）、未記録は null */
  errorTime: string | null;
}

export interface CreateNamespaceBody {
  prefix: string;
  uri: string;
  description?: string;
  scopeKey?: string;
}

/**
 * PATCH /api/v1/namespaces/:prefix リクエストボディ
 *
 * @remarks namespaceController.updateNamespace で使用
 */
export interface UpdateNamespaceBody {
  /** 変更後の prefix（省略時は現在の prefix を維持） */
  newPrefix?: string;
  /** 説明文（省略時は null に更新） */
  description?: string;
}

/**
 * POST /api/v1/namespaces/terms リクエストボディ
 *
 * @remarks namespaceController.createTerm で使用
 */
export interface CreateTermBody {
  prefix: string;
  localName: string;
  displayName?: string;
  /** フロントエンドから送信される表示名フィールド（displayName の別名）。displayName より優先される。 */
  displayNameJa?: string;
  description?: string;
  typeHint?: string;
  unitHint?: string;
  /** true のとき SupervisorDirective{localName} の指示用語を同時登録する */
  createDirectiveTerm?: boolean;
  /** 左ツリーで選択中のスコープキー（organization_group_cd または userId）。指定時は正しい namespace_id を特定するために使用 */
  scopeKey?: string;
}

/**
 * PUT /api/v1/namespaces/terms/:prefix/:localName リクエストボディ
 *
 * @remarks namespaceController.updateTerm で使用
 */
export interface UpdateTermBody {
  displayName?: string;
  /** フロントエンドから送信される表示名フィールド（displayName の別名）。displayName より優先される。 */
  displayNameJa?: string;
  description?: string;
  typeHint?: string;
  unitHint?: string;
}

/**
 * PATCH /api/v1/namespaces/terms/:prefix/:localName/active リクエストボディ
 *
 * @remarks namespaceController.toggleTermActive で使用
 */
export interface ToggleTermActiveBody {
  isActive: boolean;
}

/**
 * PATCH /api/v1/namespaces/terms/:prefix/:localName/active パスパラメータ
 *
 * @remarks namespaceController.toggleTermActive で使用
 */
export interface TermActiveParams {
  prefix: string;
  localName: string;
}

// ============================================================
// 組織グループ (organization-group) 関連リクエストボディ型
// ============================================================

/**
 * POST /api/v1/organization-groups リクエストボディ
 *
 * @remarks organizationGroupController.createOrganizationGroup で使用
 */
export interface CreateOrganizationGroupBody {
  organization_group_cd: string;
  organization_group_name: string;
  parent_group_cd?: string | null;
}

/**
 * PUT /api/v1/organization-groups/:groupCd リクエストボディ
 *
 * @remarks organizationGroupController.updateOrganizationGroup で使用
 */
export interface UpdateOrganizationGroupBody {
  organization_group_name?: string;
  parent_group_cd?: string | null;
  layer?: string | null;
}

/**
 * PATCH /api/v1/organization-groups/:groupCd/status リクエストボディ
 *
 * @remarks organizationGroupController.updateOrganizationGroupStatus で使用
 */
export interface UpdateGroupStatusBody {
  isActive: boolean;
}

/**
 * PATCH /api/v1/organization-groups/:groupCd/status リクエストボディ
 *
 * @remarks organizationGroupController.updateOrganizationGroupStatus で使用
 */
export interface UpdateOrganizationGroupStatusBody {
  isActive: boolean;
}

/**
 * PATCH /api/v1/namespaces/:prefix/active リクエストボディ
 *
 * @remarks namespaceController.toggleNamespaceActive で使用
 */
export interface ToggleNamespaceActiveBody {
  isActive: boolean;
}

/**
 * POST /api/v1/namespaces/prefixes/share リクエストボディ
 *
 * @remarks namespaceController.sharePrefixes で使用
 */
export interface SharePrefixesBody {
  targetScopeKey: string;
  prefixes: string[];
}

/**
 * PUT /api/v1/organization-groups/:groupCd/members リクエストボディ
 *
 * @remarks organizationGroupController.setOrganizationGroupMembers で使用
 */
export interface SetGroupMembersBody {
  userIds: string[];
}

/**
 * PUT /api/v1/organization-groups/:groupCd/chief リクエストボディ
 *
 * @remarks organizationGroupController.updateOrganizationGroupChief で使用
 */
export interface UpdateGroupChiefBody {
  chiefUserId: string;
}

// ============================================================
// 不確かさ評価関連の型定義
// ============================================================

/**
 * 定量評価の1件分（convertPropertyForFallback が返す toleranceValues[] の要素型）
 *
 * @remarks
 * experimentDataService.ts の convertPropertyForFallback 内で組み立て、
 * フロントエンドの WorkRecordPanel.convertRawProperty で
 * quantitativeUncertainties[] にマッピングする。
 */
export interface ToleranceValueEntry {
  /** 不確かさ基準Key（MAIMLの uncertainty.key） */
  uncertaintyKey: string;
  /** 許容値（MAIMLの uncertainty.value を String() 変換した値。null = 未設定） */
  toleranceValue: string | null;
  /** 不確かさ説明（MAIMLの uncertainty.description。null = 未設定） */
  uncertaintyNote: string | null;
  /** 不確かさ基準名（uncertainty_criteria.termDisplayName。null = 未設定） */
  uncertaintyName: string | null;
}

// ============================================================
// 記録値訂正関連の型定義
// experimentInstructionService / experimentInstructionController で使用
// ============================================================

/**
 * 記録値訂正の1レコード（placeId + data の組み合わせ）
 */
export interface CorrectRecordItem {
  /** プレースID（template_data の place_id） */
  placeId: string;
  /** 訂正後のデータ */
  data: {
    templateId: string;
    templateType: string;
    properties: unknown[];
  };
}

/**
 * correctRecord サービスメソッドの入力型
 */
export interface CorrectRecordInput {
  records: CorrectRecordItem[];
}

/**
 * correctRecord サービスメソッドの戻り値
 */
export interface CorrectRecordResult {
  corrected: number;
}


