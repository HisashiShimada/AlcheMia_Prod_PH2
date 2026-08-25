/**
 * aggregationRule.ts
 *
 * 集約ルール・階層別サマリー関連の型定義
 *
 * @remarks
 * DDL: backend/src/sql/ddl/aggregation_rules.sql
 * 主キー: (organization_id, rule_id, version)
 *
 * @module aggregationRule
 */

// ─────────────────────────────────────────────────────────────────────────────
// DB テーブル型
// ─────────────────────────────────────────────────────────────────────────────

/**
 * aggregation_rules テーブルの型定義
 */
export interface AggregationRule {
  rule_id: string;
  organization_id: string;
  version: number;
  is_active: boolean;
  score_good: number;
  score_caution: number;
  score_bad: number;
  target_rollup: string;
  level_status_rule: string;
  level_score_rule: string;
  missing_handling: string;
  transition_hierarchy: string;
  create_user_id: string | null;
  create_at: Date;
  update_user_id: string | null;
  update_at: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// API リクエスト / レスポンス型
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/aggregation-rules リクエストボディ
 */
export interface CreateAggregationRuleInput {
  score_good?: number;
  score_caution?: number;
  score_bad?: number;
  target_rollup?: string;
  level_status_rule?: string;
  level_score_rule?: string;
  missing_handling?: string;
  transition_hierarchy?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 集計結果型（aggregationCalculatorService で使用）
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 階層別サマリー（1階層分の集計結果）
 */
export interface LevelSummary {
  level: string;
  total: number;
  good: number;
  caution: number;
  bad: number;
  missing: number;
  statusRepresentative: string | null;
  scoreAverage: number | null;
}

/**
 * 要注意項目（良好以外の評価を severity でソート済み）
 */
export interface AttentionItem {
  evaluationUnit: string;
  methodId: string | null;
  taskNo: number | null;
  transitionId: string | null;
  evaluationValue: string;
  comment: string | null;
  severity: string;
}

/**
 * 断面スナップショット（全体評価登録時に JSONB として凍結保存する）
 */
export interface AggregationSnapshot {
  levels: LevelSummary[];
  /** 集計入力となった SubEvaluationRow[] の凍結値 */
  sourceEvaluations: unknown[];
  attentionItems: AttentionItem[];
}

/**
 * 階層別サマリーのプレビューレスポンス（未登録の動的算出）
 */
export interface SummaryPreviewResponse {
  levels: LevelSummary[];
  attentionItems: AttentionItem[];
  appliedRule: AggregationRule;
}

