/**
 * aggregationRuleService.ts
 *
 * 集約ルールに関するビジネスロジック
 *
 * @module aggregationRuleService
 * @version 1.0.0
 */

import * as aggregationRuleRepository from '../repositories/aggregationRuleRepository';
import * as experimentEvaluationRepository from '../repositories/experimentEvaluationRepository';
import * as aggregationCalculatorService from './aggregationCalculatorService';
import type { AggregationRule, CreateAggregationRuleInput, SummaryPreviewResponse } from '../types/aggregationRule';

// ─────────────────────────────────────────────────────────────────────────────
// サービス関数
// ─────────────────────────────────────────────────────────────────────────────

/**
 * テナントの ACTIVE ルールを取得する
 * 存在しない場合はデフォルト値の仮ルール（DB未登録）を返す。
 *
 * @param organizationId - 組織ID
 */
export async function getActiveRule(
  organizationId: string
): Promise<AggregationRule | null> {
  return aggregationRuleRepository.findActive(organizationId);
}

/**
 * テナントのルール履歴一覧を取得する
 *
 * @param organizationId - 組織ID
 */
export async function getAllRules(
  organizationId: string
): Promise<AggregationRule[]> {
  return aggregationRuleRepository.findAll(organizationId);
}

/**
 * 新版の集約ルールを作成して ACTIVE に設定する（旧版は DEPRECATED へ）
 *
 * @param organizationId - 組織ID
 * @param input          - ルールパラメータ
 * @param userId         - 作成者ユーザーID
 * @returns 作成されたルールレコード
 */
export async function createRule(
  organizationId: string,
  input: CreateAggregationRuleInput,
  userId: string | null
): Promise<AggregationRule> {
  // 既存の ACTIVE ルールを取得して版番号を決定
  const existing = await aggregationRuleRepository.findActive(organizationId);
  const nextVersion = existing ? existing.version + 1 : 1;

  // 旧 ACTIVE を DEPRECATED に遷移
  if (existing) {
    await aggregationRuleRepository.deprecateOld(organizationId);
  }

  // 新版を挿入
  return aggregationRuleRepository.insert(organizationId, nextVersion, input, userId);
}

/**
 * 登録済みデータに対するプレビュー算出
 * 現在の ACTIVE ルール（または仮のルールパラメータ）でサマリーを動的に算出する。
 *
 * @param organizationId - 組織ID
 * @param projectId      - プロジェクトID
 * @param previewRule    - プレビュー用ルール（指定しない場合は ACTIVE ルールを使用）
 * @returns プレビューレスポンス
 */
export async function previewSummary(
  organizationId: string,
  projectId: string,
  previewRule?: CreateAggregationRuleInput
): Promise<SummaryPreviewResponse> {
  // 適用ルールを決定
  const baseRule = await aggregationRuleRepository.findActive(organizationId);
  if (!baseRule) {
    const err = new Error('No active aggregation rule found') as Error & { code: string };
    err.code = 'E8001';
    throw err;
  }

  // プレビュー用ルールが指定されている場合は上書き
  const effectiveRule: AggregationRule = previewRule
    ? {
        ...baseRule,
        score_good:           previewRule.score_good           ?? baseRule.score_good,
        score_caution:        previewRule.score_caution        ?? baseRule.score_caution,
        score_bad:            previewRule.score_bad            ?? baseRule.score_bad,
        target_rollup:        previewRule.target_rollup        ?? baseRule.target_rollup,
        level_status_rule:    previewRule.level_status_rule    ?? baseRule.level_status_rule,
        level_score_rule:     previewRule.level_score_rule     ?? baseRule.level_score_rule,
        missing_handling:     previewRule.missing_handling     ?? baseRule.missing_handling,
        transition_hierarchy: previewRule.transition_hierarchy ?? baseRule.transition_hierarchy,
      }
    : baseRule;

  // 下位評価データを取得
  const evaluations = await experimentEvaluationRepository.findByProject(organizationId, projectId);

  // サマリーを動的算出
  const levels         = aggregationCalculatorService.calculateLevelSummaries(evaluations, effectiveRule);
  const attentionItems = aggregationCalculatorService.extractAttentionItems(evaluations);

  return {
    levels,
    attentionItems,
    appliedRule: effectiveRule,
  };
}
