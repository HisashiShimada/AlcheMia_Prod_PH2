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

/** デフォルト重み */
export const DEFAULT_WEIGHTS: SearchWeights = {
  input: 0.28,
  transition: 0.40,
  output: 0.22,
  structure: 0.10,
};

/** 重みプリセット定義 */
export const WEIGHT_PRESETS = [
  { label: 'バランス（デフォルト）', weights: DEFAULT_WEIGHTS },
  { label: '手法重視', weights: { input: 0.15, transition: 0.60, output: 0.15, structure: 0.10 } },
  { label: '入出力重視', weights: { input: 0.40, transition: 0.20, output: 0.35, structure: 0.05 } },
  { label: '構造重視', weights: { input: 0.20, transition: 0.30, output: 0.20, structure: 0.30 } },
];

export interface UseSemanticSearchReturn {
  /** 検索結果 */
  hits: SemanticSearchHit[];
  /** ローディング状態 */
  loading: boolean;
  /** エラー */
  error: string | null;
  /** 検索実行済みか */
  searched: boolean;
  /** 検索実行時間(ms) */
  elapsedMs: number | null;
  /** インデックス統計 */
  stats: IndexStatsResponse | null;
  /** ヘルス情報 */
  health: SemanticSearchHealth | null;
  /** 検索履歴 */
  history: SearchHistoryItem[];
  /** 検索実行 */
  search: (request: SemanticSearchRequest) => Promise<void>;
  /** 統計取得 */
  fetchStats: () => Promise<void>;
  /** ヘルスチェック */
  fetchHealth: () => Promise<void>;
  /** 結果クリア */
  clearResults: () => void;
}

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
