/**
 * aggregationRuleApiService.ts
 * 集約ルール API サービス
 *
 * @remarks
 * エンドポイント:
 *   GET  /api/v1/aggregation-rules/active  ← ACTIVE ルール取得
 *   GET  /api/v1/aggregation-rules         ← 履歴一覧取得
 *   POST /api/v1/aggregation-rules         ← 新版作成
 *   POST /api/v1/aggregation-rules/preview ← プレビュー算出
 */

import { createApiClient } from '@/utils/authUtils';
import type { AggregationRule, CreateAggregationRuleInput, SummaryPreviewResponse } from '@/types/aggregationRule';

const BASE_URL = '/api/v1/aggregation-rules';

/**
 * テナントの ACTIVE ルールを取得する
 */
export async function getActiveRule(): Promise<AggregationRule | null> {
  const api = createApiClient();
  const res = await api.get<{ success: boolean; data: AggregationRule | null }>(
    `${BASE_URL}/active`
  );
  return res.data.data;
}

/**
 * ルール履歴一覧を取得する
 */
export async function getAllRules(): Promise<AggregationRule[]> {
  const api = createApiClient();
  const res = await api.get<{ success: boolean; data: AggregationRule[] }>(BASE_URL);
  return res.data.data;
}

/**
 * 新版の集約ルールを作成する（旧版は DEPRECATED）
 */
export async function createRule(input: CreateAggregationRuleInput): Promise<AggregationRule> {
  const api = createApiClient();
  const res = await api.post<{ success: boolean; data: AggregationRule }>(BASE_URL, input);
  return res.data.data;
}

/**
 * 登録済みデータに対するプレビュー算出
 *
 * @param projectId   - 対象プロジェクトID
 * @param previewRule - プレビュー用ルールパラメータ（省略時は ACTIVE ルールを使用）
 */
export async function previewSummary(
  projectId: string,
  previewRule?: Partial<CreateAggregationRuleInput>
): Promise<SummaryPreviewResponse> {
  const api = createApiClient();
  const res = await api.post<{ success: boolean; data: SummaryPreviewResponse }>(
    `${BASE_URL}/preview`,
    { projectId, previewRule }
  );
  return res.data.data;
}
