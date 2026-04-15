import { createApiClient } from '@/utils/authUtils';
import {
  SaveBatchExperimentDataRequest,
  SaveBatchExperimentDataResponse,
  GetTemplateDataResponse,
} from '@/types/api';

/**
 * 実験データを一括保存する
 *
 * @param projectId プロジェクトID
 * @param methodId メソッドID
 * @param taskNo タスク連番（1以上の整数）
 * @param request 保存リクエストボディ
 * @returns 保存結果（保存件数・保存レコード一覧）
 *
 * @remarks
 * API: POST /api/v1/experiments/projects/:projectId/methods/:methodId/tasks/:taskNo/data
 * 権限: experiment_worker のみ書込可
 * トランザクション: All or Nothing（1件でも失敗したら全体ロールバック）
 */
export async function saveBatchExperimentData(
  projectId: string,
  methodId: string,
  taskNo: number,
  request: SaveBatchExperimentDataRequest
): Promise<SaveBatchExperimentDataResponse> {
  const apiClient = createApiClient();
  const url =
    `/experiments/projects/` +
    `${encodeURIComponent(projectId)}/methods/` +
    `${encodeURIComponent(methodId)}/tasks/${taskNo}/data`;

  const response = await apiClient.post<SaveBatchExperimentDataResponse>(url, request);

  return response.data;
}

/**
 * テンプレート実績一覧を取得する（ダイアログオープン時のフォーム初期値復元用）
 *
 * @param projectId プロジェクトID
 * @param methodId メソッドID
 * @param taskNo タスク連番（1以上の整数）
 * @param transitionId トランジションID
 * @returns 隣接プレースの実績データ一覧
 *
 * @remarks
 * API: GET /api/v1/experiments/projects/:projectId/methods/:methodId/tasks/:taskNo/data?transitionId=xxx
 * 権限: experiment_worker 読取専用
 * 用途: DataRecordDialog を開いた際に、過去の入力済みデータをフォームに復元する
 */
export async function getTemplateData(
  projectId: string,
  methodId: string,
  taskNo: number,
  transitionId: string
): Promise<GetTemplateDataResponse> {
  const apiClient = createApiClient();
  const url =
    `/experiments/projects/` +
    `${encodeURIComponent(projectId)}/methods/` +
    `${encodeURIComponent(methodId)}/tasks/${taskNo}/data` +
    `?transitionId=${encodeURIComponent(transitionId)}`;

  const response = await apiClient.get<GetTemplateDataResponse>(url);

  return response.data;
}
