/**
 * aggregationRule.ts (Frontend Types)
 *
 * 集約ルール・階層別サマリー関連の型定義（フロントエンド）
 */

// ─────────────────────────────────────────────────────────────────────────────
// 集約ルール
// ─────────────────────────────────────────────────────────────────────────────

export interface AggregationRule {
  rule_id: string;
  organization_id: string;
  version: number;
  status: string;
  score_good: number;
  score_caution: number;
  score_bad: number;
  target_rollup: string;
  level_status_rule: string;
  level_score_rule: string;
  missing_handling: string;
  transition_hierarchy: string;
  created_by: string | null;
  created_at: string;
}

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
// 集計結果型
// ─────────────────────────────────────────────────────────────────────────────

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

export interface AttentionItem {
  evaluationUnit: string;
  methodId: string | null;
  taskNo: number | null;
  transitionId: string | null;
  evaluationValue: string;
  comment: string | null;
  severity: string;
}

export interface SummaryPreviewResponse {
  levels: LevelSummary[];
  attentionItems: AttentionItem[];
  appliedRule: AggregationRule;
}

// ─────────────────────────────────────────────────────────────────────────────
// コンポーネント Props 型
// ─────────────────────────────────────────────────────────────────────────────

/**
 * EvaluationSummaryBar コンポーネントの Props 型
 * 使用箇所: components/project/subcomponents/EvaluationSummaryBar.tsx
 */
export interface EvaluationSummaryBarProps {
  /** 階層別サマリーデータ */
  summaries: LevelSummary[];
}

/**
 * AttentionItemList コンポーネントの Props 型
 * 使用箇所: components/project/subcomponents/AttentionItemList.tsx
 */
export interface AttentionItemListProps {
  /** 要注意項目リスト（既に severity 降順ソート済みであること） */
  items: AttentionItem[];
}

/**
 * AggregationRuleSettings コンポーネントの Props 型
 * 使用箇所: components/SystemManagement/AggregationRuleSettings.tsx
 */
export interface AggregationRuleSettingsProps {
  /** プレビュー対象プロジェクトID（省略時はプレビュー無効） */
  previewProjectId?: string;
}
