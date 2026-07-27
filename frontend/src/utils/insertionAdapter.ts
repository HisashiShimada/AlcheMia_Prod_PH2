/**
 * insertionAdapter.ts
 *
 * CustomPropertyValue（ExperimentPlanDialog の insertion カスタムプロパティ）と
 * Insertion（useInsertionEditor / InsertionEditorCompact が扱う型）の相互変換ユーティリティ。
 *
 * 背景:
 *   - CustomPropValue.hash は string 型（後方互換のため単一文字列）
 *   - Insertion.hash は Hash オブジェクト型 { method?: string; value: string }
 *   この差異を吸収し、両コンポーネントが共通フックで動作できるようにする。
 */

import type { Insertion } from '@/types/maiml-unified';
import type { CustomPropValue } from '@/types/experimentPlanDialog';

/** デフォルトのハッシュメソッド */
const DEFAULT_HASH_METHOD =
  process.env.NEXT_PUBLIC_INSERTION_DEFAULT_HASH_METHOD ?? 'SHA-256';

/**
 * CustomPropValue（insertion コンテナ）→ Insertion 変換
 *
 * @param cp - insertion コンテナのカスタムプロパティ値
 * @returns Insertion オブジェクト
 */
export function toInsertion(cp: CustomPropValue): Insertion {
  return {
    uri: cp.uri ?? (typeof cp.value === 'string' ? cp.value : '') ?? '',
    hash: {
      method: DEFAULT_HASH_METHOD,
      value: cp.hash ?? '',
    },
    format: cp.format ?? '',
  };
}

/**
 * Insertion → CustomPropValue（insertion コンテナ）部分更新の変換
 *
 * onChange で受け取った Insertion を CustomPropValue の差分パッチとして返す。
 * id / key / containerType / type / units は変更しないため Partial<Omit<CustomPropValue, 'id'>> を返す。
 *
 * @param v - useInsertionEditor / InsertionEditorCompact から通知された新しい Insertion
 * @returns CustomPropValue への部分パッチ
 */
export function fromInsertion(v: Insertion): Partial<Omit<CustomPropValue, 'id'>> {
  return {
    uri: v.uri,
    hash: v.hash?.value ?? '',
    format: v.format ?? '',
    // value は URI をそのまま表示用に使用（ファイル名またはS3キー）
    value: v.uri,
  };
}
