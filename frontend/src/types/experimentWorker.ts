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
  // API仕様に基づく確認済みフラグ（API: is_acknowledged）
  isAcknowledged: boolean;           // 確認済みフラグ
  acknowledgedAt?: string;            // 確認日時（ISO 8601）
  acknowledgedBy?: string;            // 確認者ID
  acknowledgedByName?: string;        // 確認者名
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
  workOrder?: number; // 作業順序（フロー図での並び順と接続に使用）
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
  experimentOrder: number; // 実験順序（1から開始）
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

// プロジェクト状態
export type ProjectStatus = 
  | 'planning'           // 計画中
  | 'waiting_task'       // タスク実行待ち
  | 'executing_task'     // タスク実行中
  | 'waiting_approval'   // 承認待ち
  | 'completed';         // 完了

// プロジェクトデータ
export interface ProjectData {
  projectId: string;
  projectName: string;
  description?: string; // プロジェクトの説明
  fileName: string;
  status: ProjectStatus; // プロジェクト状態
  workAssignment: WorkAssignment;
  instructions: Instruction[];
  transitionDetails: Record<string, TransitionDetail>;
  methods?: Method[];
  progressData?: TransitionProgress[];
}

/**
 * プロジェクト状態のヘルパー関数
 */

/**
 * 編集可能な状態かどうかを判定
 * @param status プロジェクト状態
 * @returns 編集可能な場合true
 */
export function isEditableStatus(status: ProjectStatus): boolean {
  return ['waiting_task', 'executing_task'].includes(status);
}

/**
 * プロジェクト選択可能な状態かどうかを判定
 * @param status プロジェクト状態
 * @returns 選択可能な場合true
 */
export function isSelectableStatus(status: ProjectStatus): boolean {
  return ['waiting_task', 'executing_task', 'waiting_approval'].includes(status);
}

/**
 * 実験記録の参照・操作が可能な状態かどうかを判定
 * タスク実行待ち・実行中・承認待ちの場合に記録を参照・操作できる
 * @param status プロジェクト状態
 * @returns 記録を参照・操作可能な場合true
 */
export function isRecordViewableStatus(status: ProjectStatus): boolean {
  return ['waiting_task', 'executing_task', 'waiting_approval'].includes(status);
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

/**
 * トランジションステータス（実験データ記録用）
 * 数値型（TransitionStatusEnumに対応）
 * 0: 初期状態, 1: 準備中, 2: 準備完了, 3: 実行中, 4: 一時停止, 5: 完了, 6: エラー
 */
export type TransitionStatus = number;

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
  | 'in_progress'       // 作業中
  | 'completed'         // 完了
  | 'forced_terminated'; // 強制終了

// タスクデータ（実験作業タブ用）
export interface Task {
  taskId: string;              // タスクID
  projectId?: string;          // プロジェクトID（Phase 7追加: プロジェクト選択連動用）
  methodId?: string;           // メソッドID（Phase 7追加: プロジェクト選択連動用）
  methodName: string;          // メソッド名（Phase 1追加: グループ化・折りたたみ用）
  taskNo: string;              // タスクNo（Phase 8追加: タスク一覧テーブル表示用）
  taskName: string;            // タスク名
  sampleNumber: string;        // サンプル番号
  notes: string;               // 備考
  status: TaskStatus;          // ステータス
  assignedUserId?: string;     // 割り当てユーザーID
  assignedUserName?: string;   // 割り当てユーザー名
  createdAt?: string;          // 作成日時（ISO8601形式）
  updatedAt: string;           // 更新日時（ISO8601形式、楽観的ロック用に必須）
  progressRate: number;        // 進捗率（0-100）
  transitionStatuses?: TransitionStatus[]; // トランジションステータス一覧
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
// code_master テーブルの code_division='issue_type' の code_value（整数）
export type IssueType = number;

// 問題報告データ（問題報告モーダル用）
export interface IssueReportData {
  taskId: string;          // タスクID
  issueType: IssueType;    // 問題タイプ
  comment: string;         // コメント
  reportedAt?: string;     // 報告日時（バックエンドで設定）
  reportedBy?: string;     // 報告者（バックエンドで設定）
}

// ===== Phase: 問題管理（参照・コメント）用の型定義 =====

// 問題状態（未解決/解決済）
export type IssueStatus = 'unresolved' | 'resolved';

// 問題対象タイプ（プロジェクト/タスク/トランジション）
export type IssueTargetType = 'project' | 'task' | 'transition';

// 問題コメント
export interface IssueComment {
  commentId: string;       // コメントID
  issueId: string;         // 問題ID
  content: string;         // コメント内容
  createdBy: User;         // 記入者
  createdAt: string;       // 記入時刻
}

// 問題
export interface Issue {
  issueId: string;         // 問題ID
  transitionId: string;    // トランジションID
  transitionName: string;  // トランジション名
  projectId?: string;      // プロジェクトID（対象がプロジェクトの場合）
  projectName?: string;    // プロジェクト名（対象がプロジェクトの場合）
  taskId?: string;         // タスクID（対象がタスクの場合）
  taskName?: string;       // タスク名（対象がタスクの場合）
  title: string;           // タイトル
  content: string;         // 内容
  status: IssueStatus;     // 状態（未解決/解決済）
  targetType: IssueTargetType; // 対象（プロジェクト/タスク/トランジション）
  issueType?: IssueType;   // 問題タイプ（材料不足/機器故障/etc.）
  reportedBy: User;        // 報告者
  reportedAt: string;      // 報告時刻
  comments: IssueComment[]; // コメント一覧
}

// 問題報告フォームデータ
export interface IssueReportFormData {
  title: string;           // タイトル
  targetType: IssueTargetType; // 対象
  issueType: IssueType;    // 問題タイプ
  content: string;         // 内容
}
