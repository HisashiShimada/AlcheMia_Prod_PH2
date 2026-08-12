/**
 * instructionRegistration.ts
 * 指示登録に関する型定義
 */

import { TaskDetail } from './taskRegistration';
import {
  InstructionTypeCode,
  InstructionPriority,
  InstructionTarget,
} from '@/constants/codeMaster';

/**
 * 指示タイプの定数（code_master.instruction_type）
 * @deprecated codeMaster.ts の InstructionTypeCode を使用してください
 */
export const INSTRUCTION_TYPES = InstructionTypeCode;

/**
 * 優先度の定数（code_master.instruction_priority）
 * @deprecated codeMaster.ts の InstructionPriority を使用してください
 */
export const INSTRUCTION_PRIORITIES = InstructionPriority;

/**
 * 対象タイプの定数（code_master.instruction_target）
 * @deprecated codeMaster.ts の InstructionTarget を使用してください
 */
export const TARGET_TYPES = InstructionTarget;

/**
 * トランジション情報の型
 */
export interface TransitionInfo {
  id: string;
  displayName: string;
  category: string;
  description?: string;
  isExperimentRelevant: boolean;
  /** 所属メソッドID（トランジション選択肢のフィルタリングに使用） */
  methodId?: string;
}

/**
 * 指示対象（UI制御用）
 * 未選択の場合は全体指示として扱う
 */
export const INSTRUCTION_GRANULARITY = {
  OVERALL:    'overall',
  METHOD:     'method',
  TRANSITION: 'transition',
  TASK:       'task',
} as const;

export type InstructionGranularityValue =
  typeof INSTRUCTION_GRANULARITY[keyof typeof INSTRUCTION_GRANULARITY];

export const INSTRUCTION_GRANULARITY_LABELS: Record<InstructionGranularityValue, string> = {
  overall:    '全体',
  method:     'メソッド',
  transition: 'トランジション',
  task:       'タスク',
};

/**
 * 指示種別定数（MAIMLのpropertyタグキー）
 * プロジェクト指示ダイアログのドロップダウンで使用する
 * ※ experimentPlan.ts の NoteType と同一値だが、「注意事項」概念から独立して定義
 */
export const INSTRUCTION_KEY = {
  GENERAL:           'SupervisorDirectiveContent',
  CAUTION:           'mgr-instruction:caution',
  OPERATION_NOTE:    'mgr-instruction:operationNote',
  CHECK_ITEM:        'mgr-instruction:checkItem',
  PROHIBITED_ACTION: 'mgr-instruction:prohibitedAction',
  OTHER_NOTES:       'mgr-instruction:OtherNotes',
} as const;

export type InstructionKeyValue = typeof INSTRUCTION_KEY[keyof typeof INSTRUCTION_KEY];

export const INSTRUCTION_KEY_LABELS: Record<InstructionKeyValue, string> = {
  'SupervisorDirectiveContent':       '通常指示',
  'mgr-instruction:caution':          '安全上の注意事項',
  'mgr-instruction:operationNote':    '操作手順上の注記',
  'mgr-instruction:checkItem':        '実施前後の確認事項',
  'mgr-instruction:prohibitedAction': '禁止事項',
  'mgr-instruction:OtherNotes':       'その他注意事項',
};

/**
 * 指示データ
 */
export interface InstructionData {
  id: string | number;
  content: string;
  targetType: number; // code_master.instruction_target の code_value
  methodId: string;
  transitionId: string;
  taskNumber?: number;
  instruction_status?: number; // 0: 未送信, 1: 送信済
  isSent?: boolean; // 送信済フラグ（後方互換性のため保持）
  isNewlyAdded?: boolean; // 新規追加フラグ（DBから取得した指示と区別するため）
  /** MAIMLのpropertyタグキー（指示種別）。必須 */
  instructionKey: string;
  /** 指示対象（UI制御用）。未設定時は全体指示 */
  granularity?: InstructionGranularityValue;
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
