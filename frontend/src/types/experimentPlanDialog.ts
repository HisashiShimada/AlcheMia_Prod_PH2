/**
 * experimentPlanDialog.ts
 * ExperimentPlanDialog コンポーネント関連の型定義
 *
 * ExperimentPlanDialog.tsx から分離したインライン型定義を集約するファイル。
 * 型定義規約: .clinerules/development/typescript.md
 */

import type { theme } from 'antd';
import type { ExperimentPlanTabData, TemplateDef } from './experimentPlan';

/** 継承の上書きフラグが追跡するフィールド名 */
export type InheritableField =
  | 'creatorRefs'
  | 'instrumentRefs'
  | 'ownerRefs'
  | 'notes'
  | 'templateValues';

/** トランジション行の型 */
export interface TransitionRow {
  id: string;
  name: string;
  /** 前提となるトランジションIDの配列（空配列 = 依存なし） */
  prerequisiteTransitionIds?: string[];
}

/**
 * 実行順序リストの要素型
 * isFixed を廃止し、prerequisiteTransitionIds による依存関係制約に移行
 */
export interface TransitionOrderItem {
  id: string;
  name: string;
  order: number;
  /**
   * ステップ番号（依存の深さ）
   * - 依存なし → ステップ1
   * - 全依存先の最大ステップ+1 → 自身のステップ
   */
  step: number;
  /** 前提となるトランジションIDの配列（空配列 = 依存なし） */
  prerequisiteTransitionIds: string[];
}

/** カスタムプロパティ型（テンプレート入力で追加できるプロパティ） */
export type CustomPropType =
  | 'stringType'
  | 'intType'
  | 'floatType'
  | 'doubleType'
  | 'booleanType'
  | 'dateType'
  | 'dateTimeType';

/** カスタムプロパティ値 */
export interface CustomPropValue {
  id: string;
  key: string;
  type: CustomPropType;
  value: string;
  units: string;
}

/** Ref追加エリアコンポーネントのProps（Creator / Instrument / Owner 共通） */
export interface RefSectionProps {
  title: string;
  options: string[];
  selectedValues: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  disabled?: boolean;
  testIdPrefix: string;
}

/** FieldValueInput コンポーネントのProps */
export interface FieldValueInputProps {
  /** MAIML の xsi:type 文字列（例: 'doubleType', 'booleanType', 'dateType'） */
  xsiType: string | undefined;
  /** field.type（バックエンドで変換済み: 'text' | 'number' | 'select'） */
  fieldType: 'text' | 'number' | 'select';
  /** select 型の選択肢 */
  options?: string[];
  /** 現在の値 */
  value: string | number | boolean | undefined;
  /** 値変更コールバック */
  onChange: (value: string | number | boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  testId?: string;
}

/** TemplateInputPanel コンポーネントのProps */
export interface TemplateInputPanelProps {
  /** MAIMLから生成したテンプレート定義一覧 */
  methodTemplates: TemplateDef[];
  /** テンプレートの入力値 `{templateId_fieldKey: value}` 形式 */
  templateValues: Record<string, string | number | boolean>;
  onValueChange: (key: string, value: string | number | boolean) => void;
  /** カスタムプロパティ（templateId → CustomPropValue[]） */
  customProps: Record<string, CustomPropValue[]>;
  onCustomPropsChange: (templateId: string, props: CustomPropValue[]) => void;
  disabled?: boolean;
}

/** SortableTransitionRow コンポーネントのProps */
export interface SortableTransitionRowProps {
  id: string;
  order: number;
  /** ステップ番号（依存の深さから計算） */
  step: number;
  name: string;
  /** 前提となるトランジションIDの配列（空配列 = 依存なし） */
  prerequisiteTransitionIds: string[];
  /** 依存関係のルックアップ用（ツールチップに名前・順序を表示するため全件渡す） */
  allTransitionOrderItems: TransitionOrderItem[];
  maxOrder: number;
  onOrderChange: (id: string, newOrder: number) => void;
  disabled: boolean;
  token: ReturnType<typeof theme.useToken>['token'];
}

// ExperimentPlanTabData の再エクスポート（後方互換性のため）
export type { ExperimentPlanTabData };
