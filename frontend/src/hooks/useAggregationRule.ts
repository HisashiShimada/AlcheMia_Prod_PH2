/**
 * useAggregationRule.ts
 *
 * 集約ルール管理フック
 *
 * @remarks
 * ACTIVE ルールの取得・新版作成・プレビュー算出を提供する。
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getActiveRule,
  createRule,
  previewSummary,
} from '@/services/aggregationRuleApiService';
import type { AggregationRule, CreateAggregationRuleInput, SummaryPreviewResponse } from '@/types/aggregationRule';
import type { UseAggregationRuleReturn } from '@/types/hooks';

/**
 * 集約ルール管理フック
 */
export function useAggregationRule(): UseAggregationRuleReturn {
  const [activeRule, setActiveRule] = useState<AggregationRule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getActiveRule()
      .then((rule) => {
        if (!cancelled) {
          setActiveRule(rule);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setIsLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [refreshKey]);

  const createNewRule = useCallback(async (input: CreateAggregationRuleInput) => {
    const rule = await createRule(input);
    setActiveRule(rule);
    return rule;
  }, []);

  const previewRule = useCallback(
    (projectId: string, input?: Partial<CreateAggregationRuleInput>) =>
      previewSummary(projectId, input),
    []
  );

  return { activeRule, isLoading, error, refetch, createNewRule, previewRule };
}
