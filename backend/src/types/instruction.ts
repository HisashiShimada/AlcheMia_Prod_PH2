/**
 * 指示送信（タスク作成）APIの型定義
 */

/**
 * 指示対象タイプ
 * 0: ファイル全体
 * 1: タスク（task_no指定）
 * 2: トランジション（transition_id指定）
 */
export enum TargetType {
  FILE = 0,
  TASK = 1,
  TRANSITION = 2
}

/**
 * 指示優先度
 * 0: 低
 * 1: 通常
 * 2: 中
 * 3: 高
 */
export enum Priority {
  LOW = 0,
  NORMAL = 1,
  MEDIUM = 2,
  HIGH = 3
}

/**
 * 指示タイプ
 * 0: 一般
 * 1: セットアップ
 * 2: 測定
 * 3: 安全
 * 4: 清掃
 */
export enum InstructionType {
  GENERAL = 0,
  SETUP = 1,
  MEASUREMENT = 2,
  SAFETY = 3,
  CLEANUP = 4
}

/**
 * 実験条件タイプ
 * 0: 全て同一条件
 * 1: 実験ごとに変更
 */
export enum ExperimentCondition {
  SAME = 0,
  VARIABLE = 1
}

/**
 * タスク入力データ
 */
export interface TaskInput {
  /** メソッドID（255文字以内） */
  methodId: string;
  
  /** 実験条件タイプ（0: 全て同一条件、1: 実験ごとに変更） */
  experimentCondition: ExperimentCondition;
  
  /** 試行回数（1〜999、省略時は1） */
  trialCount?: number;
}

/**
 * 指示入力データ
 */
export interface InstructionInput {
  /** 指示内容（1〜1000文字） */
  content: string;
  
  /** 優先度（0: 低、1: 通常、2: 中、3: 高） */
  priority: Priority;
  
  /** 指示タイプ（0: 一般、1: セットアップ、2: 測定、3: 安全、4: 清掃） */
  type: InstructionType;
  
  /** 対象タイプ（0: ファイル全体、1: タスク、2: トランジション） */
  targetType: TargetType;
  
  /** トランジションID（targetType=2の場合必須） */
  transitionId: string | null;
  
  /** タスク番号（targetType=1の場合必須、1以上） */
  taskNumber: number | null;
}

/**
 * 指示作成リクエスト
 */
export interface CreateInstructionRequest {
  /** タスクリスト（最低1件、最大100件） */
  tasks: TaskInput[];
  
  /** 指示リスト（最低1件） */
  instructions: InstructionInput[];
}

/**
 * 指示作成入力データ（サービス層用）
 * CreateInstructionRequestのエイリアス
 */
export interface CreateInstructionInput {
  /** タスクリスト（最低1件、最大100件） */
  tasks: TaskInput[];
  
  /** 指示リスト（最低1件） */
  instructions: InstructionInput[];
}

/**
 * 指示作成サマリー
 */
export interface InstructionCreationSummary {
  /** 作成されたタスクの総数 */
  totalTasks: number;
  
  /** 正常に作成されたタスクの数 */
  createdTasks: number;
}

/**
 * 指示作成レスポンス
 */
export interface CreateInstructionResponse {
  /** 成功フラグ */
  success: true;
  
  /** レスポンスデータ */
  data: {
    /** 作成サマリー */
    summary: InstructionCreationSummary;
  };
  
  /** メタデータ */
  meta: {
    /** タイムスタンプ（ISO 8601形式） */
    timestamp: string;
    
    /** リクエストID */
    requestId: string;
  };
}

/**
 * プロジェクトドメインモデル
 */
export interface Project {
  organization_id: string;
  project_id: string;
  project_name: string;
  project_status: number;
  project_overview?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * 指示ドメインモデル
 */
export interface Instruction {
  organization_id: string;
  project_id: string;
  experiment_instruction_id: string;
  method_id: string | null;
  priority: number;
  type: number;
  task_no: number | null;
  transition_id: string | null;
  instructions: string;
  instruction_user_id: string;
  instruction_date: Date;
}

/**
 * タスクドメインモデル
 */
export interface Task {
  organization_id: string;
  project_id: string;
  method_id: string;
  experiment_condition: number;
  attempts_count: number;
}

/**
 * タスク詳細ドメインモデル
 */
export interface TaskDetail {
  organization_id: string;
  project_id: string;
  method_id: string;
  task_no: number;
  task_status: number;
  experiment_start_at: Date | null;
  experiment_end_at: Date | null;
  experiment_user_id: string | null;
  reviewed_at: Date | null;
  review_user_id: string | null;
}
