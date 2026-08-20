/**
 * システム共通名前空間定数
 *
 * Alchemia グローバル名前空間に関する定数を定義する。
 * - SYSTEM_ORGANIZATION_ID: Alchemia 名前空間を所有する固定 UUID（organization テーブルにレコードなし）
 * - SYSTEM_NAMESPACE_URI: 保護判定に使用する URI（この URI と一致する namespace は変更・削除不可）
 * - SYSTEM_NAMESPACE_PREFIX: Alchemia 名前空間の prefix 文字列
 * - SYSTEM_INSTRUCTION_KEYS: Alchemia 名前空間が提供する 6 件の指示キー一覧
 * - SYSTEM_INSTRUCTION_KEY_LABELS: 各キーの表示名
 *
 * @module systemNamespace
 */

/** Alchemia システム名前空間を所有する固定 organization_id */
export const SYSTEM_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000000' as const;

/** Alchemia システム名前空間の URI（保護判定に使用） */
export const SYSTEM_NAMESPACE_URI = 'https://Alchemia.co.jp' as const;

/** Alchemia システム名前空間の prefix */
export const SYSTEM_NAMESPACE_PREFIX = 'Alchemia' as const;

/**
 * Alchemia 名前空間が提供するシステム共通指示キー（6 件）
 * MAIML の property key として使用する完全修飾形式
 */
export const SYSTEM_INSTRUCTION_KEYS = [
  'Alchemia:SupervisorDirectiveContent',
  'Alchemia:SupervisorDirectiveCaution',
  'Alchemia:SupervisorDirectiveOperationNote',
  'Alchemia:SupervisorDirectiveCheckItem',
  'Alchemia:SupervisorDirectiveProhibitedAction',
  'Alchemia:SupervisorDirectiveOtherNotes',
] as const;

export type SystemInstructionKey = typeof SYSTEM_INSTRUCTION_KEYS[number];

/** 各システム指示キーの表示名 */
export const SYSTEM_INSTRUCTION_KEY_LABELS: Record<SystemInstructionKey, string> = {
  'Alchemia:SupervisorDirectiveContent':         '通常指示',
  'Alchemia:SupervisorDirectiveCaution':         '安全上の注意事項',
  'Alchemia:SupervisorDirectiveOperationNote':   '操作手順上の注記',
  'Alchemia:SupervisorDirectiveCheckItem':       '実施前後の確認事項',
  'Alchemia:SupervisorDirectiveProhibitedAction': '禁止事項',
  'Alchemia:SupervisorDirectiveOtherNotes':      'その他注意事項',
};
