/**
 * API クライアント
 * 
 * このファイルはAPI呼び出しを行うための関数を提供します。
 */
import type { FileInfo } from '@/types/file';

export type { FileInfo };

// API ベースURL（環境変数から取得）
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/**
 * トランジション番号に対応するステータスラベル文字列を返す
 * バックエンドの数値ステータス → フロントエンドの表示文字列へのマッピング
 */
function getTransitionStatusLabel(status: number): string {
  const TRANSITION_STATUS_LABELS: Record<number, string> = {
    0: '未開始',
    1: '準備中',
    2: '準備完了',
    3: '実行中',
    4: '一時停止',
    5: '完了',
    6: 'エラー',
  };
  return TRANSITION_STATUS_LABELS[status] ?? '未開始';
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
      errorData.error?.message ||
        `トランジション進捗の取得に失敗しました: ${response.status}`
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

