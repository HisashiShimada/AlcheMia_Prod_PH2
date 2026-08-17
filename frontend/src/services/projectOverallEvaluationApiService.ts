/**
 * projectOverallEvaluationApiService.ts
 * プロジェクト全体評価 API サービス
 *
 * @remarks
 * エンドポイント:
 *   GET  /api/v1/project-overall-evaluations/:projectId         ← 全体評価一覧
 *   GET  /api/v1/project-overall-evaluations/:projectId/summary ← 動的サマリー
 *   POST /api/v1/project-overall-evaluations                    ← 全体評価登録
 */

import { createApiClient } from '@/utils/authUtils';
import type {
  ProjectOverallEvaluation,
  CreateProjectOverallEvaluationInput,
  SummaryResponse,
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
