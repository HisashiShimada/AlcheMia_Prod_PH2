/**
 * projectOverallEvaluationService.ts
 *
 * プロジェクト全体評価に関するビジネスロジック
 *
 * @module projectOverallEvaluationService
 * @version 1.1.0
 */

import * as projectOverallEvaluationRepository from '../repositories/projectOverallEvaluationRepository';
import * as aggregationRuleRepository from '../repositories/aggregationRuleRepository';
import * as aggregationCalculatorService from './aggregationCalculatorService';
import type { ProjectOverallEvaluation } from '../types/projectOverallEvaluation';
import type {
  CreateProjectOverallEvaluationInput,
  SummaryResponse,
  SubEvaluationRow,
  SubEvaluationInput,
  InsertSubEvaluationInput,
  UpdateSubEvaluationInput,
} from '../types/projectOverallEvaluation';

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
 * プロジェクトの下位評価一覧を取得する
 *
 * @param organizationId - 組織ID
 * @param projectId      - プロジェクトID
 */
export async function getSubEvaluationsByProject(
  organizationId: string,
  projectId: string
): Promise<SubEvaluationRow[]> {
  return projectOverallEvaluationRepository.findSubEvaluationsByProject(organizationId, projectId);
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

  const evaluations = await projectOverallEvaluationRepository.findSubEvaluationsByProject(
    organizationId,
    projectId
  );

  return {
    levels:         aggregationCalculatorService.calculateLevelSummaries(evaluations, rule),
    attentionItems: aggregationCalculatorService.extractAttentionItems(evaluations),
  };
}

/**
 * 下位評価を一括保存する（find → insert / update で upsert を実現）
 *
 * @param organizationId - 組織ID
 * @param userId         - 操作ユーザーID
 * @param projectId      - プロジェクトID
 * @param evaluations    - 保存する下位評価配列
 * @returns 保存後の下位評価レコード配列
 */
export async function saveSubEvaluations(
  organizationId: string,
  userId: string | null,
  projectId: string,
  evaluations: SubEvaluationInput[]
): Promise<SubEvaluationRow[]> {
  // 既存レコードを全件取得してインメモリ照合（upsert キー）
  const existing = await projectOverallEvaluationRepository.findSubEvaluationsByProject(
    organizationId,
    projectId
  );

  const results: SubEvaluationRow[] = [];

  for (const input of evaluations) {
    const scope      = input.evaluationScope;
    const methodId   = input.methodId   ?? null;
    const taskNo     = input.taskNo     ?? null;
    const transitionId = input.transitionId ?? null;
    const digital    = input.evaluationValue ?? null;
    const analog     = input.comment ?? null;

    // 既存レコード検索（upsert キー）
    const found = existing.find(
      (e) =>
        e.evaluation_scope === scope &&
        (e.method_id    ?? '') === (methodId    ?? '') &&
        String(e.task_no    ?? '') === String(taskNo    ?? '') &&
        (e.transition_id ?? '') === (transitionId ?? '')
    );

    if (found) {
      // 既存レコードがあれば update（テーブル型Object引数で渡す）
      const updateInput: UpdateSubEvaluationInput = {
        organization_id: organizationId,
        evaluation_id:   found.evaluation_id,
        project_id:      projectId,
        overall_digital: digital,
        overall_analog:  analog,
        evaluated_by:    userId,
      };
      const updated = await projectOverallEvaluationRepository.updateSubEvaluation(updateInput);
      results.push(updated);
    } else {
      // なければ insert（テーブル型Object引数で渡す）
      const insertInput: InsertSubEvaluationInput = {
        organization_id:  organizationId,
        project_id:       projectId,
        evaluation_scope: scope,
        method_id:        methodId,
        task_no:          taskNo,
        transition_id:    transitionId,
        evaluated_by:     userId,
        overall_digital:  digital,
        overall_analog:   analog,
        create_user_id:   userId,
      };
      const inserted = await projectOverallEvaluationRepository.insertSubEvaluation(insertInput);
      results.push(inserted);
    }
  }

  return results;
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
  const evaluations = await projectOverallEvaluationRepository.findSubEvaluationsByProject(
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
