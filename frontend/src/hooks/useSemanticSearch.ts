/**
 * セマンティック検索カスタムフック
 *
 * @description セマンティック検索の状態管理とAPI呼び出しを担当
 */

import { useState, useCallback } from 'react';
import {
  searchTransitionSets,
  getIndexStats,
  checkHealth,
} from '@/services/semanticSearchService';
import type {
  SemanticSearchRequest,
  SemanticSearchHit,
  SearchWeights,
  IndexStatsResponse,
  SemanticSearchHealth,
  SearchHistoryItem,
} from '@/types/semanticSearch';
import type { UseSemanticSearchReturn } from '@/types/hooks';

/** デフォルト重み */
export const DEFAULT_WEIGHTS: SearchWeights = {
  input: 0.28,
  transition: 0.40,
  output: 0.22,
  structure: 0.10,
};

/** 重みプリセット定義（オブジェクト形式） */
export const WEIGHT_PRESETS: Record<string, { name: string; description: string; weights: SearchWeights }> = {
  balanced: {
    name: 'バランス',
    description: '全軸をバランスよく評価（デフォルト）',
    weights: DEFAULT_WEIGHTS,
  },
  procedureFocused: {
    name: '手順重視',
    description: '実験手順・操作の類似性を重視',
    weights: { input: 0.15, transition: 0.60, output: 0.15, structure: 0.10 },
  },
  inputFocused: {
    name: '入力重視',
    description: '材料・入力条件の類似性を重視',
    weights: { input: 0.50, transition: 0.25, output: 0.15, structure: 0.10 },
  },
  outputFocused: {
    name: '出力重視',
    description: '出力データの類似性を重視',
    weights: { input: 0.15, transition: 0.25, output: 0.50, structure: 0.10 },
  },
  structureFocused: {
    name: '構造重視',
    description: 'ペトリネット構造の類似性を重視',
    weights: { input: 0.10, transition: 0.05, output: 0.05, structure: 0.80 },
  },
};

/**
 * セマンティック検索カスタムフック
 */
export function useSemanticSearch(): UseSemanticSearchReturn {
  const [hits, setHits] = useState<SemanticSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [stats, setStats] = useState<IndexStatsResponse | null>(null);
  const [health, setHealth] = useState<SemanticSearchHealth | null>(null);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  const search = useCallback(async (request: SemanticSearchRequest) => {
    setLoading(true);
    setError(null);
    try {
      const response = await searchTransitionSets(request);
      setHits(response.hits);
      setElapsedMs(response.query_info.elapsed_ms);
      setSearched(true);

      // 履歴に追加（最大10件）
      setHistory((prev) => [
        {
          id: `${Date.now()}`,
          timestamp: new Date(),
          request,
          resultCount: response.total,
        },
        ...prev.slice(0, 9),
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'セマンティック検索でエラーが発生しました';
      setError(msg);
      setHits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await getIndexStats();
      setStats(data);
    } catch (err) {
      console.error('[useSemanticSearch] fetchStats error:', err);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const data = await checkHealth();
      setHealth(data);
    } catch (err) {
      console.error('[useSemanticSearch] fetchHealth error:', err);
    }
  }, []);

  const clearResults = useCallback(() => {
    setHits([]);
    setSearched(false);
    setError(null);
    setElapsedMs(null);
  }, []);

  return {
    hits,
    loading,
    error,
    searched,
    elapsedMs,
    stats,
    health,
    history,
    search,
    fetchStats,
    fetchHealth,
    clearResults,
  };
}
