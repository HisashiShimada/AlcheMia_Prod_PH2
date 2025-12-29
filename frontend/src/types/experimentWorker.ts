// 優先度の型
export type Priority = 'high' | 'medium' | 'normal' | 'low';

// 対象タイプ
export type TargetType = 'file' | 'method' | 'transition' | 'task';

// 指示タイプ
export type InstructionType = 'safety' | 'setup' | 'measurement' | 'cleanup' | 'general';

// プロパティタイプ
export type PropertyType = 
  | 'stringType' 
  | 'intType' 
  | 'floatType' 
  | 'booleanType' 
  | 'dateType' 
  | 'dateTimeType'
  | 'contentDoubleListType'
  | 'propertyListType'
  | 'insertion';

// テンプレートカテゴリ
export type TemplateCategory = 'Materials' | 'Conditions' | 'Results';

// ユーザー情報
export interface User {
  userId: string;
  userName: string;
  role?: string;
}

// 指示データ
export interface Instruction {
  instructionId: string;
  targetType: TargetType;
  transitionId?: string;
  transitionName?: string;
  methodId?: string;
  methodName?: string;
  taskId?: string;
  taskName?: string;
  content: string;
  priority: Priority;
  instructionType: InstructionType;
  createdAt: string;
  updatedAt: string | null;
  createdBy: User;
  isRead: boolean;
}

// 作業割り当て
export interface WorkAssignment {
  workId: string;
  fileKey: string;
  fileName: string;
  assignedBy: User;
  assignedAt: string;
  confirmedAt: string | null;
  status: string;
}

// トランジション詳細
export interface TransitionDetail {
  transitionId: string;
  transitionName: string;
  category: string;
  description: string;
  isExperimentRelevant: boolean;
  estimatedDuration: string;
  requiredEquipment: string[];
  safetyNotes: string;
}

// トランジション（シンプル版）
export interface Transition {
  transitionId: string;
  transitionName: string;
  description?: string;
  category?: string;
  estimatedDuration?: string;
  templates?: Template[];
  // Phase 6追加: 実験記録タブ用のプロパティ
  status?: ProgressStatus; // ステータス
  progressRate?: number; // 進捗率（浸食率）
  inputMaterialsCount?: number; // 入力済材料数
  totalMaterialsCount?: number; // 材料の総数
  inputIngredientsCount?: number; // 入力済素材数
  totalIngredientsCount?: number; // 素材の総数
  inputResultsCount?: number; // 入力済結果数
  totalResultsCount?: number; // 結果の総数
}

// メソッド
export interface Method {
  methodId: string;
  methodName: string;
  description: string;
  category: string;
  transitions: Transition[];
  tasks?: Task[]; // Phase 2: タスク一覧（実験作業タブ用）
}

// プロパティ定義
export interface Property {
  key: string;
  label: string;
  type: PropertyType;
  units?: string;
  required?: boolean;
  defaultValue?: string | number | boolean | null;
  options?: string[];
  min?: number;
  max?: number;
  nestedProperties?: Property[];
}

// テンプレート定義
export interface Template {
  templateId: string;
  category: TemplateCategory;
  name: string;
  description?: string;
  properties: Property[];
}

// 実験データ値
export interface ExperimentDataValue {
  [key: string]: string | number | boolean | Date | null | number[][] | ExperimentDataValue | ExperimentDataValue[];
}

// 実験記録データ
export interface ExperimentRecord {
  recordId?: string;
  transitionId: string;
  templateId: string;
  category: TemplateCategory;
  data: ExperimentDataValue;
  createdAt?: string;
  updatedAt?: string;
}

// 過去の実験結果データ（ドロップダウン用）
export interface PastExperimentData {
  recordId: string;
  transitionId: string;
  templateId: string;
  data: ExperimentDataValue;
  createdAt: string;
}

// プロジェクトデータ
export interface ProjectData {
  projectId: string;
  projectName: string;
  description?: string; // プロジェクトの説明
  fileName: string;
  workAssignment: WorkAssignment;
  instructions: Instruction[];
  transitionDetails: Record<string, TransitionDetail>;
  methods?: Method[];
  progressData?: TransitionProgress[];
}

// 統計情報
export interface Stats {
  total: number;
  file: number;
  method: number;
  transition: number;
  unread: number;
}

// 進捗ステータス
export type ProgressStatus = 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'issue';

// トランジションステータス（実験データ記録用）
export type TransitionStatus = 
  | 'initial'           // 初期状態
  | 'preparing'         // 準備状態
  | 'ready'             // 準備完了状態
  | 'running'           // 動作状態
  | 'paused'            // 休止状態
  | 'completed'         // 終状態
  | 'error';            // 異常終了状態

// トランジション進捗情報
export interface TransitionProgress {
  transitionId: string;
  transitionName: string;
  taskId?: string; // タスクID（Phase 6で追加）
  taskName?: string; // タスク名（Phase 6で追加）
  methodId: string;
  methodName: string;
  progressRate: number; // 0-100
  status: ProgressStatus;
  reportCount: number; // 進捗報告数
  issueCount: number; // 未解決課題数
  inputMaterialsCount?: number; // 入力済み材料数（Phase 6で追加）
  inputIngredientsCount?: number; // 入力済み素材数（Phase 6で追加）
  inputResultsCount?: number; // 入力済み結果数（Phase 6で追加）
}

// ===== Phase 1: 実験作業タブ用の型定義 =====

// タスクステータス（実験作業タブ用）
export type TaskStatus = 
  | 'not_started'       // 開始前
  | 'started'           // 開始
  | 'in_progress'       // 作業中
  | 'completed'         // 完了
  | 'forced_terminated' // 強制終了
  | 'suspended';        // 中断

// タスクデータ（実験作業タブ用）
export interface Task {
  taskId: string;              // タスクID
  projectId?: string;          // プロジェクトID（Phase 7追加: プロジェクト選択連動用）
  methodId?: string;           // メソッドID（Phase 7追加: プロジェクト選択連動用）
  methodName: string;          // メソッド名（Phase 1追加: グループ化・折りたたみ用）
  taskName: string;            // タスク名
  sampleNumber: string;        // サンプル番号
  notes: string;               // 備考
  status: TaskStatus;          // ステータス
  progressRate: number;        // 進捗率（0-100）
  progressReport: string;      // 進捗報告の状態（例: "実験記録報告"）
  recordNumber: string;        // 実験記録番号
}

// ワークフロー統計（実験作業タブ用）
export interface WorkflowStatistics {
  notStarted: number;    // 開始前のトランジション数
  started: number;       // 開始数
  inProgress: number;    // 作業中数
  completed: number;     // 完了数
  progressRate: number;  // 進捗率（%）
}

// ===== Phase: 問題報告モーダル用の型定義 =====

// 問題タイプ（問題報告モーダル用）
export type IssueType = 
  | 'material_shortage'    // 材料不足
  | 'equipment_failure'    // 機器故障
  | 'procedure_unclear'    // 手順不明確
  | 'safety_concern'       // 安全性の懸念
  | 'quality_issue'        // 品質問題
  | 'time_constraint'      // 時間制約
  | 'other';               // その他

// 問題報告データ（問題報告モーダル用）
export interface IssueReportData {
  taskId: string;          // タスクID
  issueType: IssueType;    // 問題タイプ
  comment: string;         // コメント
  reportedAt?: string;     // 報告日時（バックエンドで設定）
  reportedBy?: string;     // 報告者（バックエンドで設定）
}
