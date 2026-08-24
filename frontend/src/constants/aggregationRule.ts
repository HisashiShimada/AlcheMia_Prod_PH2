/**
 * aggregationRule.ts
 *
 * 集約ルール・評価スコープ関連の定数定義（フロントエンド）
 *
 * @remarks
 * interface フィールドの型は string を使用し、有効な値の集合をここで管理する。
 * コード内で値を参照する際はこのファイルからインポートして使用すること。
 */

// ============================================================
// aggregation_rules.status
// ============================================================

/**
 * 集約ルールのステータス定数
 */
export const AggregationRuleStatus = {
  /** 有効（現在適用中） */
  ACTIVE:     'ACTIVE',
  /** 非推奨（旧版） - @deprecated is_active = false を使用すること */
  DEPRECATED: 'DEPRECATED',
} as const;

// ============================================================
// aggregation_rules.target_rollup
// ============================================================

/**
 * 対象集約方式定数
 */
export const TargetRollup = {
  /** 最悪ケース優先 */
  WORST_CASE: 'WORST_CASE',
  /** 多数決 */
  MAJORITY:   'MAJORITY',
  /** 平均 */
  AVERAGE:    'AVERAGE',
} as const;

// ============================================================
// aggregation_rules.level_status_rule
// ============================================================

/**
 * 階層ステータスルール定数
 */
export const LevelStatusRule = {
  /** 最悪ケース優先 */
  WORST_CASE: 'WORST_CASE',
  /** 多数決 */
  MAJORITY:   'MAJORITY',
} as const;

// ============================================================
// aggregation_rules.level_score_rule
// ============================================================

/**
 * 階層スコアルール定数
 */
export const LevelScoreRule = {
  /** 平均 */
  MEAN: 'MEAN',
  /** 最小 */
  MIN:  'MIN',
} as const;

// ============================================================
// aggregation_rules.missing_handling
// ============================================================

/**
 * 欠損値処理ルール定数
 */
export const MissingHandling = {
  /** 欠損を別カウント */
  SEPARATE_COUNT:       'SEPARATE_COUNT',
  /** 分母から除外 */
  EXCLUDE_DENOMINATOR:  'EXCLUDE_DENOMINATOR',
  /** 良好として扱う */
  TREAT_AS_GOOD:        'TREAT_AS_GOOD',
} as const;

// ============================================================
// aggregation_rules.transition_hierarchy
// ============================================================

/**
 * トランジション階層扱い定数
 */
export const TransitionHierarchy = {
  /** トランジションをメソッドに統合 */
  MERGE: 'MERGE',
  /** トランジションを独立階層として分離 */
  SPLIT: 'SPLIT',
} as const;

// ============================================================
// project_overall_evaluations.evaluation_scope（下位評価）
// ============================================================

/**
 * 下位評価スコープ定数
 */
export const SubEvaluationScopeValues = {
  METHOD:            'METHOD',
  TASK:              'TASK',
  TRANSITION_METHOD: 'TRANSITION_METHOD',
  TRANSITION_TASK:   'TRANSITION_TASK',
} as const;
