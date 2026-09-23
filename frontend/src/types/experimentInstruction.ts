/**
 * experimentInstruction.ts
 * 実験指示タブ（指示一覧 > 実験指示）の型定義
 *
 * @remarks
 * バックエンド experimentInstructionService.ts のネスト形式レスポンスに対応する。
 *
 * レスポンス構造:
 *   { methods: InstructionMethodResponse[] }
 *
 *   InstructionMethodResponse
 *     └── tasks: InstructionTaskResponse[]
 *           └── templates: InstructionTemplateResponse[]
 *                 └── fields: InstructionFieldResponse[]
 */

// ─────────────────────────────────────────────────────────────
// API レスポンス型（ネスト形式）
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/projects/:projectId/uncertainty-judge-summary レスポンスデータ型
 *
 * 定量評価（experiment_uncertainty_judge）のプロジェクト集計
 * - 各プロパティの最新判定のみをカウント
 * - 判定値は '良好' | '不良' の2値
 */
export interface UncertaintyJudgeSummaryResponse {
  /** 総判定件数（最新判定のみ） */
  total: number;
  /** 良好件数 */
  good: number;
  /** 不良件数 */
  bad: number;
  /** 良好率（%、小数第1位） */
  goodRate: number;
  /** 不良率（%、小数第1位） */
  badRate: number;
}

/** GET /api/v1/projects/:projectId/uncertainty-judge-summary のレスポンス全体 */
export interface GetUncertaintyJudgeSummaryResponse {
  success: boolean;
  data: UncertaintyJudgeSummaryResponse;
}

/** 不確かさ判定サマリー（実験指示タブ表示用） */
export interface UncertaintyJudgeSummary {
  instructionKey: string;
  /** 不確かさ基準名（uncertainty_criteria.description から取得）。取得できない場合は undefined */
  criteriaName?: string;
  toleranceUpper: number | null;
  toleranceLower: number | null;
  judgeResult: '良好' | '不良';
  recordedValue: number;
}

/** 1 フィールドの実験指示情報 */
export interface InstructionFieldResponse {
  /** MAIMLプロパティキー（例: "ns1:Temperature"） */
  key: string;
  /** 表示ラベル */
  label: string;
  /** xsiType 文字列（例: "FloatValue", "StringValue"）*/
  xsiType: string | null;
  /** 実験計画（想定値）。未設定の場合は null */
  plannedValue: string | null;
  /** 実際の記録値。未記録の場合は null */
  actualValue: string | null;
  /** 単位 */
  unit: string | null;
  /**
   * 不確かさ判定結果一覧（experiment_uncertainty_judge から取得）。定量評価。
   * 0件 = 未判定、1件以上 = 判定済み
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

/** 1 テンプレートの実験指示情報 */
export interface InstructionTemplateResponse {
  templateId: string;
  templateName: string | null;
  templateType: string;
  fields: InstructionFieldResponse[];
  /** template_data の place_id（訂正時にバックエンドへ渡すために必要） */
  placeId: string | null;
  /** トランジションID（experiment_instruction_detail.transition_id から取得） */
  transitionId: string | null;
  /** トランジション表示名（experiment_instruction_detail.transition_name から取得。未設定時はtransitionIdで代替） */
  transitionName: string | null;
}

/** 1 タスクの実験指示情報 */
export interface InstructionTaskResponse {
  taskNo: number;
  /** task_status の数値（0〜6）。null = 未設定 */
  taskStatus: number | null;
  reviewedAt: string | null;
  reviewUserId: string | null;
  reviewResult: string | null;
  templates: InstructionTemplateResponse[];
  /** 実験作業者ID（project_task_detail.experiment_user_id） */
  experimentUserId: string | null;
  /** 実験終了日時（project_task_detail.experiment_end_at, ISO文字列） */
  experimentEndAt: string | null;
}

/** 1 メソッドの実験指示情報 */
export interface InstructionMethodResponse {
  methodId: string;
  tasks: InstructionTaskResponse[];
}

/** GET /api/v1/projects/:projectId/experiment-instructions のレスポンス全体 */
export interface GetExperimentInstructionsResponse {
  success: boolean;
  data: {
    methods: InstructionMethodResponse[];
  };
}

// ─────────────────────────────────────────────────────────────
// その他 API レスポンス型
// ─────────────────────────────────────────────────────────────

/**
 * メソッド情報
 */
export interface ProjectMethod {
  /** メソッドID */
  id: string;
  /** メソッド名（現時点では id と同値） */
  name?: string;
}

export interface GetProjectMethodsResponse {
  success: boolean;
  data: ProjectMethod[];
}

/** タスク承認レスポンス */
export interface ApproveTaskResponse {
  success: boolean;
  data?: {
    taskStatus: number | null;
    reviewedAt: string | null;
    reviewUserId: string | null;
    reviewResult: string | null;
  };
}

/** NG記録レスポンス */
export interface RecordNgResponse {
  success: boolean;
  data?: {
    taskStatus: number | null;
    reviewedAt: string | null;
    reviewUserId: string | null;
    reviewResult: string | null;
  };
}

/**
 * NG記録リクエスト
 */
export interface RecordNgRequest {
  ngReason: string;
}

// ─────────────────────────────────────────────────────────────
// フロントエンドUI用の集約型
// ─────────────────────────────────────────────────────────────

/**
 * タスクグループ（ExperimentPlanDialog 等に渡す用）
 */
export interface TaskGroup {
  /** グループキー（"methodId__taskNo" 形式） */
  key: string;
  methodId: string;
  taskNo: number;
  taskStatus: number | null;
  /** 2桁ゼロ埋め文字列（表示・比較用） */
  taskStatusStr: string;
}

// ─────────────────────────────────────────────────────────────
// フィルタ・ソート条件
// ─────────────────────────────────────────────────────────────

/**
 * 実験指示タブのフィルタ条件
 */
export interface ExperimentInstructionFilter {
  /** フィルタするメソッドID（undefined = すべて） */
  methodId?: string;
  /** フィルタするタスクステータス（undefined = すべて） */
  taskStatus?: string;
}

// ─────────────────────────────────────────────────────────────
// 記録値訂正 API 型定義
// ─────────────────────────────────────────────────────────────

/**
 * 記録値訂正の1レコード（placeId + data の組み合わせ）
 */
export interface CorrectRecordItem {
  /** プレースID（template_data の place_id） */
  placeId: string;
  /** トランジションID（experiment_instruction_detail の actual_value 更新に使用） */
  transitionId: string;
  /** 訂正後のデータ */
  data: {
    templateId: string;
    templateType: string;
    properties: unknown[];
  };
}

/**
 * 記録値訂正 API リクエスト
 * PATCH /api/v1/projects/:projectId/experiment-instructions/:methodId/:taskNo/correct
 */
export interface CorrectRecordRequest {
  records: CorrectRecordItem[];
}

/**
 * 記録値訂正 API レスポンス
 */
export interface CorrectRecordResponse {
  success: boolean;
  data: {
    corrected: number;
  };
}

