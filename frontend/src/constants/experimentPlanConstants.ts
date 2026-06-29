/**
 * experimentPlanConstants.ts
 * ExperimentPlanDialog で使用する定数定義
 *
 * ExperimentPlanDialog.tsx から分離した定数を集約するファイル。
 */

import type { CustomPropType } from '@/types/experimentPlanDialog';

/** 全体タブのキー定数 */
export const TAB_KEY_ALL = 'all';

/** カスタムプロパティタイプ選択肢 */
export const CUSTOM_PROP_TYPE_OPTIONS: { value: CustomPropType; label: string }[] = [
  { value: 'stringType', label: '文字列 (string)' },
  { value: 'intType', label: '整数 (int)' },
  { value: 'floatType', label: '実数 (float)' },
  { value: 'doubleType', label: '実数 (double)' },
  { value: 'booleanType', label: '真偽値 (boolean)' },
  { value: 'dateType', label: '日付 (date)' },
  { value: 'dateTimeType', label: '日時 (dateTime)' },
];
