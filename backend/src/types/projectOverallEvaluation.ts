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
  applied_rule_id: string;
  applied_rule_version: number;
  /** ルールパラメータの凍結値（JSONB） */
  applied_rule_snapshot: AggregationRule;
  /** 集計結果の断面（JSONB） */
  aggregation_snapshot: AggregationSnapshot;
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
