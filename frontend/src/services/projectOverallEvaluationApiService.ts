/**
 * projectOverallEvaluationApiService.ts
 * プロジェクト全体評価 API サービス
 *
 * @remarks
 * エンドポイント:
 *   GET  /api/v1/project-overall-evaluations/:projectId                    ← 全体評価一覧
 *   GET  /api/v1/project-overall-evaluations/:projectId/summary            ← 動的サマリー
 *   POST /api/v1/project-overall-evaluations                               ← 全体評価登録
 *   GET  /api/v1/project-overall-evaluations/:projectId/sub-evaluations    ← 下位評価一覧
 *   POST /api/v1/project-overall-evaluations/:projectId/sub-evaluations    ← 下位評価一括保存
 */

import { createApiClient } from '@/utils/authUtils';
import type {
  ProjectOverallEvaluation,
  CreateProjectOverallEvaluationInput,
  SummaryResponse,
  ExportToMaimlResult,
  SubEvaluationRow,
  SaveSubEvaluationsRequest,
} from '@/types/projectOverallEvaluation';

const BASE_URL = '/api/v1/project-overall-evaluations';

/**
 * プロジェクトの全体評価一覧を取得する（最新順）
 */
export async function getByProject(projectId: string): Promise<ProjectOverallEvaluation[]> {
  const api = createApiClient();
  const res = await api.get<{ success: boolean; data: ProjectOverallEvaluation[] }>(
    `${BASE_URL}/${encodeURIComponent(projectId)}`
  );
  return res.data.data;
}

/**
 * 階層別サマリーのプレビューを取得する（未登録の動的算出）
 */
export async function getSummaryPreview(projectId: string): Promise<SummaryResponse> {
  const api = createApiClient();
  const res = await api.get<{ success: boolean; data: SummaryResponse }>(
    `${BASE_URL}/${encodeURIComponent(projectId)}/summary`
  );
  return res.data.data;
}

/**
 * 全体評価を登録する（断面を凍結して保存）
 */
export async function createOverallEvaluation(
  input: CreateProjectOverallEvaluationInput
): Promise<ProjectOverallEvaluation> {
  const api = createApiClient();
  const res = await api.post<{ success: boolean; data: ProjectOverallEvaluation }>(
    BASE_URL,
    input
  );
  return res.data.data;
}

/**
 * 品質評価データを MAiML ファイルの <eventLog> に書き込む
 */
export async function exportToMaiml(projectId: string): Promise<ExportToMaimlResult> {
  const api = createApiClient();
  const res = await api.post<{ success: boolean; data: ExportToMaimlResult }>(
    `${BASE_URL}/${encodeURIComponent(projectId)}/export-to-maiml`
  );
  return res.data.data;
}

/**
 * プロジェクトの下位評価一覧を取得する
 */
export async function getSubEvaluationsByProject(projectId: string): Promise<SubEvaluationRow[]> {
  const api = createApiClient();
  const res = await api.get<{ success: boolean; data: SubEvaluationRow[] }>(
    `${BASE_URL}/${encodeURIComponent(projectId)}/sub-evaluations`
  );
  return res.data.data;
}

/**
 * 下位評価を一括保存する
 */
export async function saveSubEvaluations(
  projectId: string,
  request: SaveSubEvaluationsRequest
): Promise<SubEvaluationRow[]> {
  const api = createApiClient();
  const res = await api.post<{ success: boolean; data: SubEvaluationRow[] }>(
    `${BASE_URL}/${encodeURIComponent(projectId)}/sub-evaluations`,
    request
  );
  return res.data.data;
}
