/**
 * useOverallEvaluation.ts
 *
 * プロジェクト全体評価・階層別サマリー取得フック
 *
 * @remarks
 * GET /api/v1/project-overall-evaluations/:projectId/summary を呼び出し、
 * 動的に算出された LevelSummary・AttentionItem を返す。
 */

import { useState, useEffect, useCallback } from 'react';
import { getSummaryPreview } from '@/services/projectOverallEvaluationApiService';
import type { SummaryResponse } from '@/types/projectOverallEvaluation';
import type { UseOverallEvaluationReturn } from '@/types/hooks';

/**
 * 階層別サマリー・要注意項目を取得するフック
 *
 * @param projectId - 対象プロジェクトID
 */
export function useOverallEvaluation(projectId: string): UseOverallEvaluationReturn {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getSummaryPreview(projectId)
      .then((data) => {
        if (!cancelled) {
          setSummary(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          // E8001 はルール未設定のため無視（空サマリーとして扱う）
          if (err?.response?.data?.error?.code === 'E8001') {
            setSummary({ levels: [], attentionItems: [] });
          } else {
            setError(err instanceof Error ? err : new Error('Unknown error'));
          }
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, refreshKey]);

  return { summary, isLoading, error, refetch };
}
