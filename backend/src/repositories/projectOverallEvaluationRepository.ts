/**
 * projectOverallEvaluationRepository.ts
 *
 * project_overall_evaluations テーブルへのデータアクセスを提供
 *
 * @remarks
 * DDL: backend/src/sql/ddl/project_overall_evaluations.sql
 * 主キー: (organization_id, evaluation_id)
 *
 * @module projectOverallEvaluationRepository
 * @version 1.0.0
 */

import { getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';
import type {
  ProjectOverallEvaluation,
  SubEvaluationRow,
  InsertSubEvaluationInput,
  UpdateSubEvaluationInput,
} from '../types/projectOverallEvaluation';
import type { AggregationRule, AggregationSnapshot } from '../types/aggregationRule';

// ─────────────────────────────────────────────────────────────────────────────
// Repository メソッド
// ─────────────────────────────────────────────────────────────────────────────

/**
 * プロジェクトの全体評価一覧を取得する（新しい順）
 *
 * @param organizationId - 組織ID
 * @param projectId      - プロジェクトID
 * @returns 全体評価一覧
 */
export async function findByProject(
  organizationId: string,
  projectId: string
): Promise<ProjectOverallEvaluation[]> {
  const pgp = getPgp();
  const sql = await loadSqlFile('project_overall_evaluations/findByProject.sql');
  return pgp.any<ProjectOverallEvaluation>(sql, [organizationId, projectId]);
}

/**
 * 全体評価を登録する（断面凍結）
 *
 * @param organizationId          - 組織ID
 * @param projectId               - プロジェクトID
 * @param evaluatedBy             - 評価者ユーザーID
 * @param overallDigital          - デジタル評価値
 * @param overallScore            - 数値スコア（任意）
 * @param overallAnalog           - アナログ評価（自由文章）
 * @param appliedRule             - 適用ルール（凍結元）
 * @param aggregationSnapshot     - 集計断面（凍結）
 * @param createUserId            - 作成者ユーザーID
 * @returns 作成されたレコード
 */
export async function insert(
  organizationId: string,
  projectId: string,
  evaluatedBy: string | null,
  overallDigital: '良好' | '要確認' | '不良' | null,
  overallScore: number | null,
  overallAnalog: string | null,
  appliedRule: AggregationRule,
  aggregationSnapshot: AggregationSnapshot,
  createUserId: string | null
): Promise<ProjectOverallEvaluation> {
  const pgp = getPgp();
  const sql = await loadSqlFile('project_overall_evaluations/insert.sql');
  return pgp.one<ProjectOverallEvaluation>(sql, [
    organizationId,                         // $1
    projectId,                              // $2
    'MAIML_PROJECT',                        // $3 evaluation_scope
    evaluatedBy,                            // $4
    overallDigital,                         // $5
    overallScore,                           // $6
    overallAnalog,                          // $7
    appliedRule.rule_id,                    // $8
    appliedRule.version,                    // $9
    JSON.stringify(appliedRule),            // $10 applied_rule_snapshot
    JSON.stringify(aggregationSnapshot),    // $11 aggregation_snapshot
    createUserId,                           // $12
  ]);
}

/**
 * 下位評価一覧を取得する（evaluation_scope が MAIML_PROJECT 以外）
 *
 * @param organizationId - 組織ID
 * @param projectId      - プロジェクトID
 * @returns 下位評価一覧
 */
export async function findSubEvaluationsByProject(
  organizationId: string,
  projectId: string
): Promise<SubEvaluationRow[]> {
  const pgp = getPgp();
  const sql = await loadSqlFile('project_overall_evaluations/findSubEvaluationsByProject.sql');
  const rows = await pgp.any<Omit<SubEvaluationRow, 'evaluation_unit' | 'evaluation_value' | 'comment'> & {
    evaluation_scope: string;
    overall_digital: '良好' | '要確認' | '不良' | null;
    overall_analog: string | null;
  }>(sql, [organizationId, projectId]);

  // aggregationCalculatorService 互換フィールドを付与して返す
  return rows.map((row) => ({
    ...row,
    evaluation_unit:  row.evaluation_scope,
    evaluation_value: row.overall_digital,
    comment:          row.overall_analog,
  }));
}

/**
 * 下位評価を新規INSERTする
 *
 * @param input - INSERT する下位評価データ（テーブル型Object）
 * @returns 作成されたレコード
 */
export async function insertSubEvaluation(
  input: InsertSubEvaluationInput
): Promise<SubEvaluationRow> {
  const pgp = getPgp();
  const sql = await loadSqlFile('project_overall_evaluations/insertSubEvaluation.sql');
  const row = await pgp.one<Omit<SubEvaluationRow, 'evaluation_unit' | 'evaluation_value' | 'comment'> & {
    evaluation_scope: string;
    overall_digital: '良好' | '要確認' | '不良' | null;
    overall_analog: string | null;
  }>(sql, [
    input.organization_id,   // $1
    input.project_id,        // $2
    input.evaluation_scope,  // $3
    input.method_id,         // $4
    input.task_no,           // $5
    input.transition_id,     // $6
    input.evaluated_by,      // $7
    input.overall_digital,   // $8
    input.overall_analog,    // $9
    input.create_user_id,    // $10
  ]);
  return {
    ...row,
    evaluation_unit:  row.evaluation_scope,
    evaluation_value: row.overall_digital,
    comment:          row.overall_analog,
  };
}

/**
 * 下位評価を更新する
 *
 * @param input - UPDATE する下位評価データ（テーブル型Object）
 * @returns 更新されたレコード
 */
export async function updateSubEvaluation(
  input: UpdateSubEvaluationInput
): Promise<SubEvaluationRow> {
  const pgp = getPgp();
  const sql = await loadSqlFile('project_overall_evaluations/updateSubEvaluation.sql');
  const row = await pgp.one<Omit<SubEvaluationRow, 'evaluation_unit' | 'evaluation_value' | 'comment'> & {
    evaluation_scope: string;
    overall_digital: '良好' | '要確認' | '不良' | null;
    overall_analog: string | null;
  }>(sql, [
    input.organization_id,  // $1
    input.evaluation_id,    // $2
    input.project_id,       // $3
    input.overall_digital,  // $4
    input.overall_analog,   // $5
    input.evaluated_by,     // $6
  ]);
  return {
    ...row,
    evaluation_unit:  row.evaluation_scope,
    evaluation_value: row.overall_digital,
    comment:          row.overall_analog,
  };
}
