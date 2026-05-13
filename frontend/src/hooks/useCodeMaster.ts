/**
 * useCodeMaster Hook
 * 
 * コードマスターSelectオプション取得のためのカスタムフック
 * 
 * @module useCodeMaster
 * @version 1.0.0
 * @date 2026-02-20
 */

import { useState, useEffect, useCallback } from 'react';
import { getSelectOptions } from '@/services/codeMasterApiService';
import type { SelectOption } from '@/types/common';

/**
 * useCodeMaster Hook の戻り値型
 */
export interface UseCodeMasterResult {
  options: SelectOption[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * コードマスターSelectオプション取得フック
 * 
 * @param codeDivision - コード区分
 * @param enabled - 自動フェッチを有効にするか（デフォルト: true）
 * @returns {UseCodeMasterResult} Selectオプション、ローディング状態、エラー、再取得関数
 * 
 * @example
 * ```typescript
 * const { options, loading, error } = useCodeMaster('experiment_condition');
 * 
 * if (loading) return <Spin />;
 * if (error) return <div>エラー: {error.message}</div>;
 * 
 * return (
 *   <Select options={options} />
 * );
 * ```
 */
export const useCodeMaster = (
  codeDivision: string,
  enabled: boolean = true
): UseCodeMasterResult => {
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchOptions = useCallback(async () => {
    if (!codeDivision) {
      setError(new Error('codeDivisionが指定されていません'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getSelectOptions(codeDivision);
      setOptions(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('コードマスター取得に失敗しました');
      setError(error);
      console.error('Failed to fetch code master options:', error);
    } finally {
      setLoading(false);
    }
  }, [codeDivision]);

  useEffect(() => {
    if (enabled && codeDivision) {
      fetchOptions();
    }
  }, [codeDivision, enabled, fetchOptions]);

  return {
    options,
    loading,
    error,
    refetch: fetchOptions,
  };
};
