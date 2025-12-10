// 優先度の型
export type Priority = 'high' | 'medium' | 'normal' | 'low';

// 対象タイプ
export type TargetType = 'file' | 'method' | 'transition';

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
}

// メソッド
export interface Method {
  methodId: string;
  methodName: string;
  description: string;
  category: string;
  transitions: Transition[];
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

// トランジション進捗情報
export interface TransitionProgress {
  transitionId: string;
  transitionName: string;
  methodId: string;
  methodName: string;
  progressRate: number; // 0-100
  status: ProgressStatus;
  reportCount: number; // 進捗報告数
  issueCount: number; // 未解決課題数
}
