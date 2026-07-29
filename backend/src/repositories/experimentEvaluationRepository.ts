/**
 * experimentEvaluation Repository
 *
 * experiment_evaluation テーブルへのデータアクセスを提供
 *
 * @remarks
 * DDL: docs/design/db/ddl/experiment_evaluation.sql
 * 主キー: (organization_id, project_id, evaluation_unit,
 *          COALESCE(method_id,''), COALESCE(task_no::TEXT,''),
 *          COALESCE(transition_id,''), name_space_id, uncertainty_key)
 *
 * @module experimentEvaluationRepository
 * @version 1.0.0
 */

import { getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';

// ─────────────────────────────────────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────────────────────────────────────

/**
 * experiment_evaluation テーブルの型定義
 *
 * @remarks
 * DDL: docs/design/db/ddl/experiment_evaluation.sql
 */
export interface ExperimentEvaluation {
  organization_id: string;
  project_id: string;
  /** 評価単位: 'project' | 'method' | 'task' | 'transition_method' | 'transition_task' */
  evaluation_unit: string;
  method_id: string | null;
  task_no: number | null;
  transition_id: string | null;
  name_space_id: string;
  uncertainty_key: string;
  uc_version: number;
  evaluation_value: string | null;
  comment: string | null;
  /** <Uncertainty>タグのXML構造（JSONB形式） */
  uncertainty_xml: Record<string, unknown> | null;
  evaluated_by: string | null;
  evaluated_at: Date | null;
  create_user_id: string | null;
  create_at: Date | null;
  update_user_id: string | null;
  update_at: Date | null;
}

/**
 * findByProject の結果行（intuition_selector の display_color を追加）
 */
export interface ExperimentEvaluationRow extends ExperimentEvaluation {
  display_color: string | null;
}

/**
 * UPSERT リクエストの型
 */
export interface UpsertEvaluationInput {
  organization_id: string;
  project_id: string;
  evaluation_unit: string;
  method_id: string | null;
  task_no: number | null;
  transition_id: string | null;
  name_space_id: string;
  uncertainty_key: string;
  uc_version: number;
  evaluation_value: string | null;
  comment: string | null;
  uncertainty_xml: Record<string, unknown> | null;
  evaluated_by: string | null;
  evaluated_at: Date | null;
  user_id: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository メソッド
// ─────────────────────────────────────────────────────────────────────────────

/**
 * プロジェクトの評価結果を一覧取得する
 *
 * @param organizationId - 組織ID
 * @param projectId      - プロジェクトID
 * @returns 評価結果一覧（display_color 付き）
 */
export async function findByProject(
  organizationId: string,
  projectId: string
): Promise<ExperimentEvaluationRow[]> {
  const pgp = getPgp();
  const sql = await loadSqlFile('experiment_evaluation/findByProject.sql');
  return pgp.any<ExperimentEvaluationRow>(sql, [organizationId, projectId]);
}

/**
 * 評価結果を UPSERT する（単件）
 *
 * @param input - UPSERT する評価データ
 * @returns UPSERT 後のレコード
 */
export async function upsertEvaluation(
  input: UpsertEvaluationInput
): Promise<ExperimentEvaluation> {
  const pgp = getPgp();
  const sql = await loadSqlFile('experiment_evaluation/upsert.sql');
  return pgp.one<ExperimentEvaluation>(sql, [
    input.organization_id,   // $1
    input.project_id,        // $2
    input.evaluation_unit,   // $3
    input.method_id,         // $4
    input.task_no,           // $5
    input.transition_id,     // $6
    input.name_space_id,     // $7
    input.uncertainty_key,   // $8
    input.uc_version,        // $9
    input.evaluation_value,  // $10
    input.comment,           // $11
    input.uncertainty_xml ? JSON.stringify(input.uncertainty_xml) : null, // $12
    input.evaluated_by,      // $13
    input.evaluated_at,      // $14
    input.user_id,           // $15
  ]);
}

/**
 * 評価結果を複数件まとめて UPSERT する（一括保存）
 *
 * @param inputs - UPSERT する評価データ配列
 * @param userId - 操作ユーザーID
 * @returns UPSERT 後のレコード配列
 */
export async function upsertEvaluations(
  inputs: UpsertEvaluationInput[]
): Promise<ExperimentEvaluation[]> {
  const results: ExperimentEvaluation[] = [];
  for (const input of inputs) {
    const row = await upsertEvaluation(input);
    results.push(row);
  }
  return results;
}
