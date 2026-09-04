/**
 * experimentPlan.ts
 * 実験計画ダイアログの型定義
 */

import type { RefOption } from './experimentPlanDialog';

/**
 * 注意事項のタイプ定義
 */
export const NoteType = {
  CAUTION:           'Alchemia:SupervisorDirectiveCaution',
  OPERATION_NOTE:    'Alchemia:SupervisorDirectiveOperationNote',
  CHECK_ITEM:        'Alchemia:SupervisorDirectiveCheckItem',
  PROHIBITED_ACTION: 'Alchemia:SupervisorDirectiveProhibitedAction',
  OTHER_NOTES:       'Alchemia:SupervisorDirectiveOtherNotes',
} as const;

export type NoteTypeValue = typeof NoteType[keyof typeof NoteType];

/**
 * 注意事項のラベル定義
 */
export const NOTE_TYPE_LABELS: Record<NoteTypeValue, string> = {
  [NoteType.CAUTION]:           '安全上の注意事項',
  [NoteType.OPERATION_NOTE]:    '操作手順上の注記',
  [NoteType.CHECK_ITEM]:        '実施前後の確認事項',
  [NoteType.PROHIBITED_ACTION]: '禁止事項',
  [NoteType.OTHER_NOTES]:       'その他注意事項',
};

/**
 * プロパティ値
 */
export interface PropertyValue {
  key: string;
  label: string;
  value: string | number;
}

/**
 * 注意事項アイテム
 */
export interface NoteItem {
  id: string;
  type: NoteTypeValue;
  content: string;
  properties: PropertyValue[];
}

/**
 * テンプレート値（選択トランジションに紐づくテンプレートの入力値）
 */
export type TemplateValues = Record<string, string | number | boolean>;

/**
 * 不確かさ付与情報（実験計画ダイアログ保存用）
 * planned_values JSONB の __uncertainty__ キーに格納する1件分の不確かさ情報
 *
 * @remarks
 * TemplateInputPanel で使用する AssignPayload と同一構造のため、
 * UncertaintyAssignment は AssignPayload の別名として定義する。
 * DB保存時は AssignPayload をそのまま JSONB に格納し、復元時も型キャストで戻す。
 */
export interface UncertaintyAssignment {
  /** 不確かさ基準キー */
  criteriaKey: string;
  /** 不確かさ基準名 */
  criteriaName: string;
  /** 評価種別: 定量 / 定性 */
  evalType: 'quantitative' | 'qualitative';
  /** 定量評価値（定量の場合） */
  ucValue?: number;
  /** 定性評価値（定性の場合） */
  qualitativeValue?: string;
  /** コメント */
  comment?: string;
  /** 単位 */
  unit?: string;
}

/**
 * 実験計画データ（タブごとの保存単位）
 */
export interface ExperimentPlanTabData {
  /** 選択されたトランジションIDリスト */
  selectedTransitions: string[];
  /** CreatorRef（複数選択）*/
  creatorRefs: string[];
  /** InstrumentRef（複数選択）*/
  instrumentRefs: string[];
  /** OwnerRef（複数選択）*/
  ownerRefs: string[];
  /** 注意事項リスト */
  notes: NoteItem[];
  /** テンプレート入力値 */
  templateValues: TemplateValues;
  /**
   * 不確かさ付与情報（TemplateInputPanel の AssignPayload[] と同一構造で保存）
   * key: valueKey（`${templateId}_${fieldKey}` または `custom_${cpId}`）
   * value: 付与した不確かさの配列（複数付与対応）
   */
  assignedUncertainty: Record<string, import('@/components/uncertainty/UncertaintyCriteriaSelectorModal').AssignPayload[]>;
}

/**
 * 実験計画データ（全体 + 各タスク番号）
 */
export interface ExperimentPlanData {
  /** メソッドID */
  methodId: string;
  /** タスク番号（全体の場合はundefined）*/
  taskNumber?: number;
  /** タブデータ */
  tabData: ExperimentPlanTabData;
}

/**
 * 実験計画保存リクエスト
 */
export interface SaveExperimentPlanRequest {
  methodId: string;
  taskNumber?: number;
  selectedTransitions: string[];
  creatorRefs: string[];
  instrumentRefs: string[];
  ownerRefs: string[];
  notes: NoteItem[];
  templateValues: TemplateValues;
}

/**
 * 実験計画保存レスポンス（モック）
 */
export interface SaveExperimentPlanResponse {
  success: boolean;
  message: string;
}

/**
 * テンプレートフィールドの種類
 * MAIML Property/Content の xsi:type から判別する
 */
export type TemplateFieldType = 'text' | 'number' | 'select';

/**
 * テンプレートフィールド定義
 * MAIML Template の Property / Content 1件に対応
 */
export interface TemplateField {
  /** フィールドキー（Property/Content の key 属性） */
  key: string;
  /** 表示ラベル（key をフォールバックに使用） */
  label: string;
  /** 入力種別 */
  type: TemplateFieldType;
  /** 単位（units 属性） */
  units?: string;
  /** 説明文 */
  description?: string;
  /** 必須フラグ */
  required?: boolean;
  /** select の選択肢（contentStringEnumType の value から生成） */
  options?: string[];
  /**
   * デフォルト値（MAIML の Property/Content の value から取得）
   * select 型は value が選択肢リストを意味するため設定されない
   */
  defaultValue?: string | number;
  /**
   * MAIMLの xsi:type 文字列（例: 'doubleType', 'floatType', 'stringEnumType'）
   * バックエンドで detectFieldType により type('text'/'number'/'select') に変換される前の元の値。
   */
  xsiType?: string;
  /**
   * MAIMLテンプレートに設定されたデフォルト不確かさ（バックエンドの convertTemplate で生成）
   * experimentInstructionService の convertTemplate により property.uncertainty[] から変換される。
   * ダイアログ初回表示時の assignedUncertainty 初期値として使用する。
   */
  defaultUncertainties?: Array<{
    /** 不確かさ基準キー（MAIML uncertainty.key） */
    criteriaKey: string;
    /** 不確かさ基準名（uncertainty.description または key） */
    criteriaName: string;
    /** 評価種別 */
    evalType: 'quantitative' | 'qualitative';
    /** 定量評価値（定量の場合） */
    ucValue?: number;
    /** 定性評価値（定性の場合） */
    qualitativeValue?: string;
    /** 単位（uncertainty.units） */
    unit?: string;
    /** MAIMLのuncertainty.descriptionをcommentの初期値として使用するための説明文 */
    description?: string;
  }>;
}

/**
 * テンプレート定義
 * MAIML の materialTemplate / conditionTemplate / resultTemplate 1件に対応
 */
export interface TemplateDef {
  /** MAIML の template id */
  id: string;
  /** 表示ラベル（name または id をフォールバック） */
  label: string;
  /** テンプレートのカテゴリ（material / condition / result） */
  category: 'material' | 'condition' | 'result';
  /** フィールド一覧 */
  fields: TemplateField[];
  /**
   * このテンプレートが紐づく Place IDの配列
   * バックエンドの experimentInstructionService で設定される。
   * フロントエンドでは inputPlaceIds / outputPlaceIds との照合に使用する。
   */
  placeIds?: string[];
}

/**
 * ExperimentPlanDialogのプロパティ
 */
export interface ExperimentPlanDialogProps {
  open: boolean;
  projectId: string;
  methodId: string;
  /** 対象メソッドのタスク一覧 */
  taskNumbers: number[];
  /**
   * MAIMLのdocument.creatorsから生成したCreatorRef選択肢
   * TaskRegistrationTab側でmaimlRootを解析してpropsで渡す
   */
  creatorRefOptions?: RefOption[];
  /**
   * MAIMLのdocument.instrumentsから生成したInstrumentRef選択肢
   */
  instrumentRefOptions?: RefOption[];
  /**
   * MAIMLのdocument.ownersから生成したOwnerRef選択肢
   */
  ownerRefOptions?: RefOption[];
  /**
   * 対象メソッドのテンプレート一覧
   * (materialTemplates / conditionTemplates / resultTemplates を統合済み)
   * TaskRegistrationTab側でmaimlRootを解析してpropsで渡す
   */
  methodTemplates?: TemplateDef[];
  /** ダイアログを閉じるコールバック */
  onClose: () => void;
  /** 保存完了コールバック */
  onSave?: () => void;
  /** 操作無効フラグ */
  disabled?: boolean;
  /**
   * メソッドID選択UIの表示制御
   * true の場合、ダイアログ内最上部にメソッドID選択ドロップダウンを表示する。
   * 実験指示タブから開く場合に使用。
   * false（デフォルト）の場合は従来通り（タスク登録タブからの呼び出し）。
   */
  allowMethodSelection?: boolean;
  /**
   * メソッドID選択肢（allowMethodSelection=true 時に使用）
   * { id: メソッドID, name: 表示名 } の配列
   */
  methodOptions?: Array<{ id: string; name: string }>;
  /**
   * メソッドID変更コールバック（allowMethodSelection=true 時に使用）
   * 実験指示タブ側でメソッドID変更時のデータ再取得などに使用する。
   */
  onMethodChange?: (methodId: string) => void;
}
