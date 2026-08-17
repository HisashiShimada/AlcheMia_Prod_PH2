/**
 * projectOverallEvaluationService.ts
 *
 * プロジェクト全体評価に関するビジネスロジック
 *
 * @module projectOverallEvaluationService
 * @version 1.0.0
 */

import * as projectOverallEvaluationRepository from '../repositories/projectOverallEvaluationRepository';
import * as aggregationRuleRepository from '../repositories/aggregationRuleRepository';
import * as experimentEvaluationRepository from '../repositories/experimentEvaluationRepository';
import * as aggregationCalculatorService from './aggregationCalculatorService';
import type { ProjectOverallEvaluation } from '../types/projectOverallEvaluation';
import type { CreateProjectOverallEvaluationInput, SummaryResponse } from '../types/projectOverallEvaluation';

// ─────────────────────────────────────────────────────────────────────────────
// サービス関数
// ─────────────────────────────────────────────────────────────────────────────

/**
 * プロジェクトの全体評価一覧を取得する（最新順）
 *
 * @param organizationId - 組織ID
 * @param projectId      - プロジェクトID
 */
export async function getByProject(
  organizationId: string,
  projectId: string
): Promise<ProjectOverallEvaluation[]> {
  return projectOverallEvaluationRepository.findByProject(organizationId, projectId);
}

/**
 * 階層別サマリーのプレビューを取得する（未登録の動的算出）
 *
 * @param organizationId - 組織ID
 * @param projectId      - プロジェクトID
 * @returns 階層別サマリー・要注意項目
 */
export async function getSummaryPreview(
  organizationId: string,
  projectId: string
): Promise<SummaryResponse> {
  const rule = await aggregationRuleRepository.findActive(organizationId);
  if (!rule) {
    const err = new Error('No active aggregation rule found') as Error & { code: string };
    err.code = 'E8001';
    throw err;
  }

  const evaluations = await experimentEvaluationRepository.findByProject(organizationId, projectId);

  return {
    levels:         aggregationCalculatorService.calculateLevelSummaries(evaluations, rule),
    attentionItems: aggregationCalculatorService.extractAttentionItems(evaluations),
  };
}

/**
 * 全体評価を登録する（断面を凍結して保存）
 *
 * @param organizationId - 組織ID
 * @param userId         - 操作ユーザーID
 * @param input          - 登録入力
 * @returns 登録された全体評価レコード
 */
export async function createOverallEvaluation(
  organizationId: string,
  userId: string | null,
  input: CreateProjectOverallEvaluationInput
): Promise<ProjectOverallEvaluation> {
  // ACTIVE ルールを取得（断面凍結用）
  const rule = await aggregationRuleRepository.findActive(organizationId);
  if (!rule) {
    const err = new Error('No active aggregation rule found') as Error & { code: string };
    err.code = 'E8001';
    throw err;
  }

  // 下位評価データを取得して集計断面を生成
  const evaluations = await experimentEvaluationRepository.findByProject(
    organizationId,
    input.projectId
  );
  const aggregationSnapshot = aggregationCalculatorService.buildAggregationSnapshot(evaluations, rule);

  // レコードを登録（断面凍結）
  return projectOverallEvaluationRepository.insert(
    organizationId,
    input.projectId,
    userId,
    input.overallDigital ?? null,
    input.overallScore   ?? null,
    input.overallAnalog  ?? null,
    rule,
    aggregationSnapshot,
    userId
  );
}
