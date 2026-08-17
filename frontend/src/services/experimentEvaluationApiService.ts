/**
 * experimentEvaluationApiService.ts
 * 実験評価 API サービス
 *
 * @remarks
 * バックエンドの experimentEvaluationController.ts に接続する。
 * エンドポイント:
 *   GET  /api/v1/experiment-evaluations/:projectId   ← 評価一覧取得
 *   POST /api/v1/experiment-evaluations              ← 評価結果保存（UPSERT）
 */

import { createApiClient } from '@/utils/authUtils';

// ─────────────────────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────────────────────

/** 評価単位 */
export type EvaluationUnit =
  | 'project'
  | 'method'
  | 'task'
  | 'transition_method'
  | 'transition_task';

/** 評価結果レコード（取得時） */
export interface ExperimentEvaluationRow {
  organization_id: string;
  project_id: string;
  evaluation_unit: EvaluationUnit;
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
  evaluated_at: string | null;
  display_color: string | null;
}

/** 評価結果の UPSERT 入力（単件） */
export interface EvaluationInput {
  evaluationUnit: EvaluationUnit;
  methodId?: string;
  taskNo?: number;
  transitionId?: string;
  nameSpaceId: string;
  uncertaintyKey: string;
  ucVersion: number;
  evaluationValue?: string;
  comment?: string;
  uncertaintyXml?: Record<string, unknown>;
}

/** POST /api/v1/experiment-evaluations のリクエストボディ */
export interface SaveEvaluationsRequest {
  projectId: string;
  evaluations: EvaluationInput[];
}

// ─────────────────────────────────────────────────────────────
// API 呼び出し関数
// ─────────────────────────────────────────────────────────────

/**
 * プロジェクトの評価結果一覧を取得する
 *
 * @param projectId - プロジェクトID
 * @returns 評価結果一覧
 */
export async function getEvaluationsByProject(
  projectId: string
): Promise<ExperimentEvaluationRow[]> {
  const api = createApiClient();
  const response = await api.get<{ success: boolean; data: ExperimentEvaluationRow[] }>(
    `/experiment-evaluations/${encodeURIComponent(projectId)}`
  );
  return response.data.data;
}

/**
 * 評価結果を一括保存（UPSERT）する
 *
 * @param request - 保存リクエスト
 * @returns 保存後のレコード配列
 */
export async function saveEvaluations(
  request: SaveEvaluationsRequest
): Promise<ExperimentEvaluationRow[]> {
  const api = createApiClient();
  const response = await api.post<{ success: boolean; data: ExperimentEvaluationRow[] }>(
    '/experiment-evaluations',
    request
  );
  return response.data.data;
}

