/**
 * experimentEvaluation Service
 *
 * 実験評価に関するビジネスロジック
 *
 * @remarks
 * experiment_evaluation テーブルへの読み書きロジックを提供する。
 *
 * @module experimentEvaluationService
 * @version 1.0.0
 */

import * as experimentEvaluationRepository from '../repositories/experimentEvaluationRepository';
import type { UpsertEvaluationInput, ExperimentEvaluation, ExperimentEvaluationRow } from '../repositories/experimentEvaluationRepository';

// ─────────────────────────────────────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────────────────────────────────────

/**
 * saveEvaluations の入力型（リクエストボディの評価1件分）
 */
export interface EvaluationInput {
  evaluationUnit: string;
  methodId?: string;
  taskNo?: number;
  transitionId?: string;
  nameSpaceId: string;
  uncertaintyKey: string;
  ucVersion: number;
  evaluationValue?: string;
  comment?: string;
  uncertaintyXml?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// サービス関数
// ─────────────────────────────────────────────────────────────────────────────

/**
 * プロジェクトの評価結果一覧を取得する
 *
 * @param organizationId - 組織ID
 * @param projectId - プロジェクトID
 * @returns 評価結果一覧
 */
export async function getByProject(
  organizationId: string,
  projectId: string
): Promise<ExperimentEvaluationRow[]> {
  return experimentEvaluationRepository.findByProject(organizationId, projectId);
}

/**
 * 評価結果を一括UPSERT（保存）する
 *
 * @param organizationId - 組織ID
 * @param userId - 操作ユーザーID
 * @param projectId - プロジェクトID
 * @param evaluations - 評価データ配列
 * @returns 保存後の評価結果配列
 */
export async function saveEvaluations(
  organizationId: string,
  userId: string | undefined,
  projectId: string,
  evaluations: EvaluationInput[]
): Promise<ExperimentEvaluation[]> {
  const now = new Date();

  const inputs: UpsertEvaluationInput[] = evaluations.map((e) => {
    const input: UpsertEvaluationInput = {
      organization_id: organizationId,
      project_id: projectId,
      evaluation_unit: e.evaluationUnit,
      method_id: e.methodId ?? null,
      task_no: e.taskNo ?? null,
      transition_id: e.transitionId ?? null,
      name_space_id: e.nameSpaceId,
      uncertainty_key: e.uncertaintyKey,
      uc_version: e.ucVersion,
      evaluation_value: e.evaluationValue ?? null,
      comment: e.comment ?? null,
      uncertainty_xml: e.uncertaintyXml ?? null,
      evaluated_by: userId ?? null,
      evaluated_at: now,
      user_id: userId ?? '',
    };
    return input;
  });

  return experimentEvaluationRepository.upsertEvaluations(inputs);
}

