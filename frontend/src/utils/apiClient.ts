/**
 * API クライアント
 * 
 * このファイルはAPI呼び出しを行うための関数を提供します。
 */
import type { FileInfo } from '@/types/file';
import { getTranslation } from '@/contexts/LanguageContext';
import { mapErrorToMessage } from '@/utils/errorMapper';

export type { FileInfo };

// API ベースURL（環境変数から取得）
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/**
 * トランジション番号に対応するステータスラベル文字列を返す
 * バックエンドの数値ステータス → フロントエンドの表示文字列へのマッピング
 */
function getTransitionStatusLabel(status: number): string {
  const TRANSITION_STATUS_KEYS: Record<number, string> = {
    0: 'progressStatus.notStarted',
    1: 'progressStatus.preparing',
    2: 'progressStatus.ready',
    3: 'progressStatus.running',
    4: 'progressStatus.paused',
    5: 'progressStatus.completed',
    6: 'progressStatus.error',
  };
  const key = TRANSITION_STATUS_KEYS[status] ?? 'progressStatus.notStarted';
  return getTranslation(key);
}

/**
 * トランジション進捗データを取得
 * GET /api/v1/progress/projects/:projectId/methods/:methodId/tasks/:taskNo/transitions
 *
 * @description
 * バックエンドの進捗APIを呼び出す。
 * バックエンドレスポンス（snake_case・数値ステータス）を
 * フロントエンド期待形式（camelCase・文字列ステータス）に変換して返す。
 *
 * @param projectId - プロジェクトID
 * @param methodId  - メソッドID
 * @param taskNo    - タスク連番（1以上の整数）
 * @returns フロントエンド期待形式のトランジション進捗データ
 */
export async function fetchTransitionStatus(
  projectId: string,
  methodId: string,
  taskNo: number
): Promise<unknown> {
  console.log('🌐 [fetchTransitionStatus] 実API呼び出し:', {
    projectId,
    methodId,
    taskNo,
  });

  const response = await fetch(
    `${API_BASE_URL}/progress/projects/${encodeURIComponent(projectId)}/methods/${encodeURIComponent(methodId)}/tasks/${taskNo}/transitions`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      mapErrorToMessage(errorData.error?.code) ||
        `${getTranslation('apiClient.fetchTransitionError')}: ${response.status}`
    );
  }

  const result = await response.json();

  console.log('✅ [fetchTransitionStatus] APIレスポンス取得成功:', {
    success: result.success,
    transitionsCount: result.data?.transitions?.length,
  });

  // バックエンドレスポンス → フロントエンド期待形式へ変換
  const rawTransitions: Array<{
    transition_id: string;
    transition_name: string;
    status: number;
    progress: number;
    last_updated: string | null;
    material_count?: number;
    condition_count?: number;
    result_count?: number;
  }> = result.data?.transitions ?? [];

  const transitionStatus = rawTransitions.map((t) => ({
    transitionId: t.transition_id,
    transitionName: t.transition_name,
    progressStatus: getTransitionStatusLabel(t.status),
    latestStatus: getTransitionStatusLabel(t.status),
    progressPercentage: t.progress ?? 0,
  }));

  return {
    success: true,
    data: {
      transitionStatus,
    },
  };
}

/**
 * 実験記録データを取得
 *
 * @description
 * 指定されたワークID（タスク）に紐づく実験記録データを返す。
 *
 * ## ⚠️ 現状: モックデータを返しています
 *
 * ### 理由
 * この関数が想定していた `GET /api/experiment-records/by-work-id/:workId` は
 * バックエンドに実装されておらず、対応するエンドポイントが存在しない。
 *
 * ### TODO: バックエンドAPI実装後の対応方針
 * 1. バックエンドに一括取得API を追加:
 *    `GET /api/v1/experiments/projects/:projectId/methods/:methodId/tasks/:taskNo/all-records`
 * 2. この関数のシグネチャを `fetchExperimentRecords(projectName, methodId, taskNo)` に変更
 * 3. 上記APIを呼び出すよう実装を変更
 * 4. `PetriNetVisualization.tsx` の呼び出し箇所も合わせて変更
 *
 * @param workId - ワークID（タスクの識別子）※現状は未使用（バックエンドAPIが未実装のためモックを返す）
 */
export async function fetchExperimentRecords(workId: string): Promise<unknown> {
  console.log('📦 [fetchExperimentRecords] モックデータを返却（バックエンドAPI未実装）:', { workId });

  // モックファイルは削除済みのため空データを返す
  return {
    success: true,
    data: {
      materials: [],
      conditions: [],
      results: [],
    },
  };
}
