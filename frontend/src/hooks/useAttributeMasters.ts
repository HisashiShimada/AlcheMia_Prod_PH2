/**
 * useAttributeMasters - Attributeマスタデータ取得フック
 *
 * NestedPropertyEditorの属性追加ダイアログ向けに、Attributeマスタ一覧を
 * 取得・キャッシュするカスタムフック。
 * 親コンポーネントで1回だけ呼び出し、attributeRecords を NestedPropertyEditor に
 * Props として渡すことで多重APIコールを防ぐ。
 *
 * @version 1.0.0
 * @date 2026-04-09
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchAttributeMasters } from '@/services/masterApiService';
import type { AttributeRecord } from '@/types/masterDataTypes';

// ===== 固定属性名（Attributeマスタの選択肢から除外する属性名） =====
const FIXED_ATTRIBUTE_NAMES = new Set(['key', 'xsi:type', 'id', 'ref', 'axis', 'size']);

// ===== フック戻り値型 =====
export interface UseAttributeMastersResult {
  /** Attributeマスタ全レコード（isActive=true のみ） */
  attributeRecords: AttributeRecord[];
  /** ローディング中フラグ */
  loading: boolean;
  /** エラーメッセージ（取得成功時は null） */
  error: string | null;
  /** マスタから動的生成される属性名一覧（固定属性名を除く・重複除去済み） */
  getAttributeNames: () => string[];
  /** 指定した属性名に対応する属性値一覧 */
  getAttributeValues: (attributeName: string) => AttributeValueOption[];
  /** マスタデータを再取得する */
  reload: () => void;
}

/** 属性値の選択肢型 */
export interface AttributeValueOption {
  /** 実際に XML に書き込む属性値 */
  value: string;
  /** プルダウンに表示するラベル（remark がある場合は "value（remark）" 形式） */
  label: string;
}

/**
 * Attributeマスタ取得フック
 *
 * @example
 * ```tsx
 * // 親コンポーネントで1回取得
 * const { attributeRecords, loading } = useAttributeMasters();
 *
 * // NestedPropertyEditor に Props として渡す
 * <NestedPropertyEditor
 *   attributeRecords={attributeRecords}
 *   ...
 * />
 * ```
 */
export function useAttributeMasters(): UseAttributeMastersResult {
  const [attributeRecords, setAttributeRecords] = useState<AttributeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // apply_department_filter=true でログインユーザーの部署 or 部署指定なしのデータのみ取得
      const records = await fetchAttributeMasters(true);
      setAttributeRecords(records);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Attributeマスタの取得に失敗しました';
      setError(message);
      setAttributeRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // マウント時に1回だけ取得
  useEffect(() => {
    load();
  }, [load]);

  /**
   * マスタから動的生成される属性名一覧を返す
   * 固定属性名（key / xsi:type / id / ref / axis / size）は除外
   */
  const getAttributeNames = useCallback((): string[] => {
    const names = new Set<string>();
    for (const record of attributeRecords) {
      if (record.attributeName && !FIXED_ATTRIBUTE_NAMES.has(record.attributeName)) {
        names.add(record.attributeName);
      }
    }
    return Array.from(names).sort();
  }, [attributeRecords]);

  /**
   * 指定した属性名に対応する属性値の選択肢一覧を返す
   * @param attributeName - 対象の属性名（例: 'units', 'formatString'）
   */
  const getAttributeValues = useCallback(
    (attributeName: string): AttributeValueOption[] => {
      return attributeRecords
        .filter((r) => r.attributeName === attributeName)
        .map((r) => ({
          value: r.attributeValue,
          label: r.attributeRemark
            ? `${r.attributeValue}（${r.attributeRemark}）`
            : r.attributeValue,
        }));
    },
    [attributeRecords]
  );

  return {
    attributeRecords,
    loading,
    error,
    getAttributeNames,
    getAttributeValues,
    reload: load,
  };
}
