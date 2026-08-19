/**
 * projectOverallEvaluation.ts (Frontend Types)
 *
 * プロジェクト全体評価関連の型定義（フロントエンド）
 */

import type { LevelSummary, AttentionItem } from './aggregationRule';

// ─────────────────────────────────────────────────────────────────────────────
// 全体評価レコード
// ─────────────────────────────────────────────────────────────────────────────

export interface ProjectOverallEvaluation {
  evaluation_id: string;
  organization_id: string;
  project_id: string;
  evaluation_scope: string;
  evaluated_by: string | null;
  evaluated_at: string;
  overall_digital: string | null;
  overall_score: number | null;
  overall_analog: string | null;
  applied_rule_id: string | null;
  applied_rule_version: number | null;
  applied_rule_snapshot: Record<string, unknown> | null;
  aggregation_snapshot: {
    levels: LevelSummary[];
    sourceEvaluations: unknown[];
    attentionItems: AttentionItem[];
  } | null;
  create_user_id: string | null;
  create_at: string;
}

export interface CreateProjectOverallEvaluationInput {
  projectId: string;
  overallDigital?: string;
  overallScore?: number;
  overallAnalog?: string;
}

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
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 下位評価（SubEvaluation）型
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 下位評価レコード（GET レスポンス）
 * evaluation_scope の有効な値は SubEvaluationScopeValues（constants/aggregationRule.ts）を参照。
 */
export interface SubEvaluationRow {
  evaluation_id: string;
  organization_id: string;
  project_id: string;
  evaluation_scope: string;
  method_id: string | null;
  task_no: number | null;
  transition_id: string | null;
  evaluated_by: string | null;
  evaluated_at: string | null;
  overall_digital: string | null;
  overall_analog: string | null;
  create_user_id: string | null;
  create_at: string | null;
  /** evaluation_scope と同値（aggregator 互換フィールド） */
  evaluation_unit: string;
  /** overall_digital と同値（aggregator 互換フィールド） */
  evaluation_value: string | null;
  /** overall_analog と同値（aggregator 互換フィールド） */
  comment: string | null;
}

/**
 * 下位評価1件分の保存入力
 * evaluationScope の有効な値は SubEvaluationScopeValues（constants/aggregationRule.ts）を参照。
 */
export interface SubEvaluationInput {
  evaluationScope: string;
  methodId?: string;
  taskNo?: number;
  transitionId?: string;
  evaluationValue?: string;
  comment?: string;
}

/**
 * POST /api/v1/project-overall-evaluations/:projectId/sub-evaluations リクエストボディ
 */
export interface SaveSubEvaluationsRequest {
  evaluations: SubEvaluationInput[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 評価値共通定数
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 下位評価の固定選択肢（良好 / 要確認 / 不要）
 * EvaluationRegistrationTab・EvaluationDialog の InputModal で共通利用
 */
export const SUB_EVAL_VALUE_OPTIONS: Array<{ label: string; value: string }> = [
  { label: '良好',   value: '良好'   },
  { label: '要確認', value: '要確認' },
  { label: '不要',   value: '不要'   },
];

/**
 * 評価値 → Ant Design Tag color マップ
 * EvaluationRegistrationTab・EvaluationDialog の EvalValueTag で共通利用
 */
export const SUB_EVAL_VALUE_COLOR: Record<string, string> = {
  '良好':   'success',
  '要確認': 'warning',
  '不要':   'default',
};

// ─────────────────────────────────────────────────────────────────────────────
// コンポーネント Props 型
// ─────────────────────────────────────────────────────────────────────────────

/**
 * OverallEvaluationTab コンポーネントの Props 型
 * 使用箇所: components/project/OverallEvaluationTab.tsx
 */
export interface OverallEvaluationTabProps {
  /** 対象プロジェクトID */
  projectId: string;
  /** 表示用プロジェクト名 */
  projectName: string;
  /** 編集権限フラグ。false の場合は変更系ボタンを非活性にする */
  isEditable?: boolean;
  /** プロジェクト完了フラグ。true の場合は変更系ボタンを非活性にする */
  isProjectCompleted?: boolean;
  /** チェックアウト中フラグ。true の場合は変更系ボタンを非活性にする */
  isCheckoutLocked?: boolean;
}
