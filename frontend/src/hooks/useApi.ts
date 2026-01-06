/**
 * API呼び出し用カスタムフック
 * データ取得、ローディング状態、エラー管理を統合
 */

import { useState, useEffect, useCallback } from 'react';
import type { DataState } from '@/types/api';

/**
 * API呼び出しフック
 * @param apiFunction - API呼び出し関数
 * @param dependencies - useEffectの依存配列（省略時は初回のみ実行）
 * @param options - オプション設定
 * @returns データ、ローディング状態、エラー、再取得関数
 */
export function useApi<T>(
  apiFunction: () => Promise<T>,
  dependencies: React.DependencyList = [],
  options: {
    /** 自動実行するか（falseの場合、refetch()を手動で呼ぶ必要がある） */
    enabled?: boolean;
    /** エラー時のコールバック */
    onError?: (error: Error) => void;
    /** 成功時のコールバック */
    onSuccess?: (data: T) => void;
  } = {}
): DataState<T> & { refetch: () => Promise<void> } {
  const { enabled = true, onError, onSuccess } = options;

  const [state, setState] = useState<DataState<T>>({
    data: null,
    isLoading: enabled,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await apiFunction();
      setState({ data: result, isLoading: false, error: null });
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      setState({ data: null, isLoading: false, error: err });
      
      if (onError) {
        onError(err);
      } else {
        console.error('[useApi] API呼び出しエラー:', err);
      }
    }
  }, [apiFunction, onError, onSuccess]);

  useEffect(() => {
    if (enabled) {
      // Data fetching in useEffect is a valid pattern
      // eslint-disable-next-line
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...dependencies]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch,
  };
}

/**
 * 遅延API呼び出しフック（手動実行専用）
 * @param apiFunction - API呼び出し関数（パラメータ付き）
 * @param options - オプション設定
 * @returns 実行関数、データ、ローディング状態、エラー
 */
export function useLazyApi<T, P extends unknown[] = []>(
  apiFunction: (...params: P) => Promise<T>,
  options: {
    /** エラー時のコールバック */
    onError?: (error: Error) => void;
    /** 成功時のコールバック */
    onSuccess?: (data: T) => void;
  } = {}
): {
  execute: (...params: P) => Promise<T | null>;
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  reset: () => void;
} {
  const { onError, onSuccess } = options;

  const [state, setState] = useState<DataState<T>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const execute = useCallback(
    async (...params: P): Promise<T | null> => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const result = await apiFunction(...params);
        setState({ data: result, isLoading: false, error: null });
        
        if (onSuccess) {
          onSuccess(result);
        }
        
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        setState({ data: null, isLoading: false, error: err });
        
        if (onError) {
          onError(err);
        } else {
          console.error('[useLazyApi] API呼び出しエラー:', err);
        }
        
        return null;
      }
    },
    [apiFunction, onError, onSuccess]
  );

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null });
  }, []);

  return {
    execute,
    data: state.data,
    isLoading: state.isLoading,
    error: state.error,
    reset,
  };
}

/**
 * 複数API呼び出しフック
 * @param apiFunctions - API呼び出し関数の配列
 * @param dependencies - useEffectの依存配列
 * @param options - オプション設定
 * @returns データ配列、ローディング状態、エラー、再取得関数
 */
export function useMultipleApi<T extends unknown[]>(
  apiFunctions: { [K in keyof T]: () => Promise<T[K]> },
  dependencies: React.DependencyList = [],
  options: {
    /** 自動実行するか */
    enabled?: boolean;
    /** エラー時のコールバック */
    onError?: (error: Error) => void;
    /** 成功時のコールバック */
    onSuccess?: (data: T) => void;
  } = {}
): DataState<T> & { refetch: () => Promise<void> } {
  const { enabled = true, onError, onSuccess } = options;

  const [state, setState] = useState<DataState<T>>({
    data: null,
    isLoading: enabled,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const results = await Promise.all(
        apiFunctions.map(fn => fn())
      );
      setState({ data: results as T, isLoading: false, error: null });
      
      if (onSuccess) {
        onSuccess(results as T);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      setState({ data: null, isLoading: false, error: err });
      
      if (onError) {
        onError(err);
      } else {
        console.error('[useMultipleApi] API呼び出しエラー:', err);
      }
    }
  }, [apiFunctions, onError, onSuccess]);

  useEffect(() => {
    if (enabled) {
      // Data fetching in useEffect is a valid pattern
      // eslint-disable-next-line
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...dependencies]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch,
  };
}
