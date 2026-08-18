/**
 * projectOverallEvaluation.ts
 *
 * プロジェクト全体評価関連の型定義
 *
 * @remarks
 * DDL: backend/src/sql/ddl/project_overall_evaluations.sql
 * 主キー: (organization_id, evaluation_id)
 *
 * @module projectOverallEvaluation
 */

import type { AggregationSnapshot, AggregationRule, LevelSummary, AttentionItem } from './aggregationRule';

// ─────────────────────────────────────────────────────────────────────────────
// DB テーブル型
// ─────────────────────────────────────────────────────────────────────────────

/**
 * project_overall_evaluations テーブルの型定義
 */
export interface ProjectOverallEvaluation {
  evaluation_id: string;
  organization_id: string;
  project_id: string;
  evaluation_scope: string;
  evaluated_by: string | null;
  evaluated_at: Date;
  overall_digital: '良好' | '要確認' | '不良' | null;
  overall_score: number | null;
  overall_analog: string | null;
  applied_rule_id: string | null;
  applied_rule_version: number | null;
  /** ルールパラメータの凍結値（JSONB）- 全体評価のみ設定、下位評価では NULL */
  applied_rule_snapshot: AggregationRule | null;
  /** 集計結果の断面（JSONB）- 全体評価のみ設定、下位評価では NULL */
  aggregation_snapshot: AggregationSnapshot | null;
  create_user_id: string | null;
  create_at: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// API リクエスト / レスポンス型
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/project-overall-evaluations リクエストボディ
 */
export interface CreateProjectOverallEvaluationInput {
  projectId: string;
  overallDigital?: '良好' | '要確認' | '不良';
  overallScore?: number;
  overallAnalog?: string;
}

/**
 * GET /api/v1/project-overall-evaluations/:projectId/summary レスポンス
 * （動的算出・未登録）
 */
export interface SummaryResponse {
  levels: LevelSummary[];
  attentionItems: AttentionItem[];
}

/**
 * POST /api/v1/project-overall-evaluations/:projectId/export-to-maiml レスポンス
 * 品質評価データを MAiML ファイルの <eventLog> に書き込んだ結果
 */
export interface ExportToMaimlResult {
  /** <eventLog> に書き込まれた品質評価エントリ数（全体評価 + 階層別）*/
  written: number;
  /** 処理結果の説明メッセージ */
  message: string;
  /** スキップされた場合は true（MAiML ファイル未存在等） */
  skipped?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// 下位評価（SubEvaluation）型
// aggregationCalculatorService / maimlQualityWriter が参照するフィールドを
// ExperimentEvaluationRow と同名で定義することでロジック変更不要にする。
// ─────────────────────────────────────────────────────────────────────────────

/** evaluation_scope の値（下位評価スコープのみ） */
export type SubEvaluationScope =
  | 'METHOD'
  | 'TASK'
  | 'TRANSITION_METHOD'
  | 'TRANSITION_TASK';

/**
 * project_overall_evaluations テーブルの下位評価行型
 * （evaluation_scope が MAIML_PROJECT 以外のレコード）
 *
 * @remarks
 * DDL: backend/src/sql/ddl/project_overall_evaluations.sql
 * aggregationCalculatorService が参照するフィールドは
 * ExperimentEvaluationRow と同名で定義している。
 */
export interface SubEvaluationRow {
  evaluation_id: string;
  organization_id: string;
  project_id: string;
  /** evaluation_scope の値（METHOD / TASK / TRANSITION_METHOD / TRANSITION_TASK） */
  evaluation_scope: string;
  method_id: string | null;
  task_no: number | null;
  transition_id: string | null;
  evaluated_by: string | null;
  evaluated_at: Date | null;
  overall_digital: '良好' | '要確認' | '不良' | null;
  overall_analog: string | null;
  create_user_id: string | null;
  create_at: Date | null;

  // ── aggregationCalculatorService 互換フィールド ───────────────────────────
  /** evaluation_scope と同値（aggregationCalculatorService の evaluation_unit 参照に対応） */
  evaluation_unit: string;
  /** overall_digital と同値（aggregationCalculatorService の evaluation_value 参照に対応） */
  evaluation_value: string | null;
  /** overall_analog と同値（aggregationCalculatorService の comment 参照に対応） */
  comment: string | null;
}

/**
 * 下位評価1件分の保存入力型
 * （POST /api/v1/project-overall-evaluations/:projectId/sub-evaluations の evaluations 配列要素）
 */
export interface SubEvaluationInput {
  /** 評価スコープ */
  evaluationScope: SubEvaluationScope;
  /** メソッドID（METHOD / TASK / TRANSITION_* で必須） */
  methodId?: string;
  /** タスク番号（TASK / TRANSITION_TASK で必須） */
  taskNo?: number;
  /** トランジションID（TRANSITION_* で必須） */
  transitionId?: string;
  /** デジタル評価値 */
  evaluationValue?: '良好' | '要確認' | '不良';
  /** コメント（アナログ評価） */
  comment?: string;
}

/**
 * POST /api/v1/project-overall-evaluations/:projectId/sub-evaluations リクエストボディ
 */
export interface SaveSubEvaluationsInput {
  projectId: string;
  evaluations: SubEvaluationInput[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository 入力型（database.md 規約: テーブル型Object引数）
// ─────────────────────────────────────────────────────────────────────────────

/**
 * insertSubEvaluation の入力型
 * （Repository がテーブル型Object引数を受け取る規約に準拠）
 */
export interface InsertSubEvaluationInput {
  organization_id: string;
  project_id: string;
  evaluation_scope: string;
  method_id: string | null;
  task_no: number | null;
  transition_id: string | null;
  evaluated_by: string | null;
  overall_digital: '良好' | '要確認' | '不良' | null;
  overall_analog: string | null;
  create_user_id: string | null;
}

/**
 * updateSubEvaluation の入力型
 * （Repository がテーブル型Object引数を受け取る規約に準拠）
 */
export interface UpdateSubEvaluationInput {
  organization_id: string;
  evaluation_id: string;
  project_id: string;
  overall_digital: '良好' | '要確認' | '不良' | null;
  overall_analog: string | null;
  evaluated_by: string | null;
}
