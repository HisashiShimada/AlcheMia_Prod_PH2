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
  overall_digital: '良好' | '要確認' | '不良' | null;
  overall_score: number | null;
  overall_analog: string | null;
  applied_rule_id: string;
  applied_rule_version: number;
  applied_rule_snapshot: Record<string, unknown>;
  aggregation_snapshot: {
    levels: LevelSummary[];
    sourceEvaluations: unknown[];
    attentionItems: AttentionItem[];
  };
  create_user_id: string | null;
  create_at: string;
}

export interface CreateProjectOverallEvaluationInput {
  projectId: string;
  overallDigital?: '良好' | '要確認' | '不良';
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
