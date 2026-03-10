/**
 * instructionRegistration.ts
 * 指示登録に関する型定義
 */

import { TaskDetail } from './taskRegistration';

/**
 * 指示タイプの定数（code_master.instruction_type）
 * code_value: 0=一般, 1=セットアップ, 2=測定, 3=安全, 4=清掃
 */
export const INSTRUCTION_TYPES = {
  GENERAL: 0,
  SETUP: 1,
  MEASUREMENT: 2,
  SAFETY: 3,
  CLEANUP: 4,
} as const;

/**
 * 優先度の定数（code_master.instruction_priority）
 * code_value: 0=低, 1=通常, 2=中, 3=高
 */
export const INSTRUCTION_PRIORITIES = {
  LOW: 0,
  NORMAL: 1,
  MEDIUM: 2,
  HIGH: 3,
} as const;

/**
 * 対象タイプの定数（code_master.instruction_target）
 * code_value: 0=ファイル全体, 1=特定タスク, 2=特定トランジション
 */
export const TARGET_TYPES = {
  FILE: 0,
  TASK: 1,
  TRANSITION: 2,
} as const;

/**
 * トランジション情報の型
 */
export interface TransitionInfo {
  id: string;
  displayName: string;
  category: string;
  description?: string;
  isExperimentRelevant: boolean;
}

/**
 * 指示データ
 */
export interface InstructionData {
  id: string | number;
  content: string;
  priority: number; // code_master.instruction_priority の code_value
  type: number; // code_master.instruction_type の code_value
  targetType: number; // code_master.instruction_target の code_value
  methodId: string;
  transitionId: string;
  taskNumber?: number;
  instruction_status?: number; // 0: 未送信, 1: 送信済
  isSent?: boolean; // 送信済フラグ（後方互換性のため保持）
  isNewlyAdded?: boolean; // 新規追加フラグ（DBから取得した指示と区別するため）
}

/**
 * 送信する指示データの型
 */
export interface SubmitInstructionData {
  instructionId: string;
  content: string;
  priority: string;
  instructionType: string;
  type: string;
  timestamp: string;
  targetType: string;
  transitionId: string | null;
  targetTransitionId?: string;
  taskNumber?: number;
}

/**
 * 指示登録データの保存形式
 */
export interface InstructionRegistrationData {
  projectId: string;
  projectName: string;
  instructions: InstructionData[];
  savedAt: string;
}

/**
 * 指示編集ダイアログのプロパティ
 */
export interface InstructionEditDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  instruction?: InstructionData;
  tasks: TaskDetail[];
  availableTransitions: TransitionInfo[];
  onClose: () => void;
  onSave: (instruction: InstructionData, keepDialogOpen?: boolean) => void;
  /**
   * 固定するメソッドID（指定時はメソッド選択を無効化）
   * タスク登録タブから指示追加する際に使用
   */
  fixedMethodId?: string;
  /**
   * 保存モード
   * - 'immediate': 即時DB保存（指示登録タブのデフォルト動作）
   * - 'local': ローカルstateに保存（タスク登録タブで使用）
   */
  saveMode?: 'immediate' | 'local';
}
