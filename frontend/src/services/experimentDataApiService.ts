import axios from 'axios';
import {
  SaveBatchExperimentDataRequest,
  SaveBatchExperimentDataResponse,
} from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * 実験データを一括保存する
 *
 * @param projectName プロジェクト名
 * @param methodId メソッドID
 * @param taskNo タスク連番（1以上の整数）
 * @param request 保存リクエストボディ
 * @returns 保存結果（保存件数・保存レコード一覧）
 *
 * @remarks
 * API: POST /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data
 * 権限: experiment_worker のみ書込可
 * トランザクション: All or Nothing（1件でも失敗したら全体ロールバック）
 */
export async function saveBatchExperimentData(
  projectName: string,
  methodId: string,
  taskNo: number,
  request: SaveBatchExperimentDataRequest
): Promise<SaveBatchExperimentDataResponse> {
  const url =
    `${API_BASE_URL}/api/v1/experiments/projects/` +
    `${encodeURIComponent(projectName)}/methods/` +
    `${encodeURIComponent(methodId)}/tasks/${taskNo}/data`;

  const response = await axios.post<SaveBatchExperimentDataResponse>(url, request, {
    withCredentials: true,
  });

  return response.data;
}
