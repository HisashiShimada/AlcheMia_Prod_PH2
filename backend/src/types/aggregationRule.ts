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
  /** ACTIVE | DEPRECATED */
  status: 'ACTIVE' | 'DEPRECATED';
  score_good: number;
  score_caution: number;
  score_bad: number;
  /** WORST_CASE | MAJORITY | AVERAGE */
  target_rollup: 'WORST_CASE' | 'MAJORITY' | 'AVERAGE';
  /** WORST_CASE | MAJORITY */
  level_status_rule: 'WORST_CASE' | 'MAJORITY';
  /** MEAN | MIN */
  level_score_rule: 'MEAN' | 'MIN';
  /** SEPARATE_COUNT | EXCLUDE_DENOMINATOR | TREAT_AS_GOOD */
  missing_handling: 'SEPARATE_COUNT' | 'EXCLUDE_DENOMINATOR' | 'TREAT_AS_GOOD';
  /** MERGE | SPLIT */
  transition_hierarchy: 'MERGE' | 'SPLIT';
  created_by: string | null;
  created_at: Date;
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
  target_rollup?: AggregationRule['target_rollup'];
  level_status_rule?: AggregationRule['level_status_rule'];
  level_score_rule?: AggregationRule['level_score_rule'];
  missing_handling?: AggregationRule['missing_handling'];
  transition_hierarchy?: AggregationRule['transition_hierarchy'];
}

// ─────────────────────────────────────────────────────────────────────────────
// 集計結果型（aggregationCalculatorService で使用）
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 階層別サマリー（1階層分の集計結果）
 */
export interface LevelSummary {
  level: 'method' | 'task' | 'transition';
  total: number;
  good: number;
  caution: number;
  bad: number;
  missing: number;
  statusRepresentative: '良好' | '要確認' | '不良' | null;
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
  evaluationValue: '要確認' | '不良';
  comment: string | null;
  severity: 'bad' | 'caution';
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
