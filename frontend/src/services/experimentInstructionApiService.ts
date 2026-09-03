/**
 * experimentInstructionApiService.ts
 * 実験指示タブ用 API サービス
 *
 * @remarks
 * バックエンドの experimentInstructionController.ts に接続する。
 * エンドポイント:
 *   GET  /api/v1/projects/:projectId/experiment-instructions   ← ネスト形式
 *   GET  /api/v1/projects/:projectId/methods
 *   PUT  /api/v1/projects/:projectId/tasks/:methodId/:taskNumber/approve
 *   PUT  /api/v1/projects/:projectId/tasks/:methodId/:taskNumber/ng
 *
 */

import { createApiClient } from '@/utils/authUtils';
import type {
  InstructionMethodResponse,
  ProjectMethod,
  ApproveTaskResponse,
  RecordNgResponse,
  RecordNgRequest,
  GetExperimentInstructionsResponse,
  GetProjectMethodsResponse,
  UncertaintyJudgeSummaryResponse,
  GetUncertaintyJudgeSummaryResponse,
  CorrectRecordRequest,
  CorrectRecordResponse,
} from '@/types/experimentInstruction';

// ─────────────────────────────────────────────────────────────
// API 関数
// ─────────────────────────────────────────────────────────────

/**
 * 実験指示一覧を取得（ネスト形式）
 * GET /api/v1/projects/:projectId/experiment-instructions
 */
export async function getExperimentInstructions(
  projectId: string
): Promise<InstructionMethodResponse[]> {
  const apiClient = createApiClient();
  const url = `/projects/${encodeURIComponent(projectId)}/experiment-instructions`;

  const response = await apiClient.get<GetExperimentInstructionsResponse>(url);

  return response.data.data.methods;
}

/**
 * プロジェクトのメソッドID一覧を取得
 * GET /api/v1/projects/:projectId/methods
 */
export async function getProjectMethods(
  projectId: string
): Promise<ProjectMethod[]> {
  const apiClient = createApiClient();
  const url = `/projects/${encodeURIComponent(projectId)}/methods`;

  const response = await apiClient.get<GetProjectMethodsResponse>(url);

  return response.data.data;
}

/**
 * タスクを承認する
 * PUT /api/v1/projects/:projectId/tasks/:methodId/:taskNumber/approve
 */
export async function approveTask(
  projectId: string,
  methodId: string,
  taskNumber: number
): Promise<ApproveTaskResponse> {
  const apiClient = createApiClient();
  const url =
    `/projects/${encodeURIComponent(projectId)}` +
    `/tasks/${encodeURIComponent(methodId)}/${taskNumber}/approve`;

  const response = await apiClient.put<ApproveTaskResponse>(url);

  return response.data;
}

/**
 * タスクに NG を記録する
 * PUT /api/v1/projects/:projectId/tasks/:methodId/:taskNumber/ng
 */
export async function recordNg(
  projectId: string,
  methodId: string,
  taskNumber: number,
  body: RecordNgRequest
): Promise<RecordNgResponse> {
  const apiClient = createApiClient();
  const url =
    `/projects/${encodeURIComponent(projectId)}` +
    `/tasks/${encodeURIComponent(methodId)}/${taskNumber}/ng`;

  const response = await apiClient.put<RecordNgResponse>(url, body);

  return response.data;
}

/**
 * 定量評価（不確かさ判定）集計を取得する
 * GET /api/v1/projects/:projectId/uncertainty-judge-summary
 */
export async function getUncertaintyJudgeSummary(
  projectId: string
): Promise<UncertaintyJudgeSummaryResponse> {
  const apiClient = createApiClient();
  const url = `/projects/${encodeURIComponent(projectId)}/uncertainty-judge-summary`;

  const response = await apiClient.get<GetUncertaintyJudgeSummaryResponse>(url);

  return response.data.data;
}

/**
 * 記録値（実績値）を訂正する
 * PATCH /api/v1/projects/:projectId/experiment-instructions/:methodId/:taskNumber/correct
 */
export async function correctRecord(
  projectId: string,
  methodId: string,
  taskNumber: number,
  body: CorrectRecordRequest
): Promise<CorrectRecordResponse> {
  const apiClient = createApiClient();
  const url =
    `/projects/${encodeURIComponent(projectId)}` +
    `/experiment-instructions/${encodeURIComponent(methodId)}/${taskNumber}/correct`;

  const response = await apiClient.patch<CorrectRecordResponse>(url, body);
  return response.data;
}

