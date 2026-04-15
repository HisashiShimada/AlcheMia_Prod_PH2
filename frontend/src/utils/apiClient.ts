/**
 * API クライアント
 * 
 * このファイルはAPI呼び出しを行うための関数を提供します。
 */
import type { FileInfo } from '@/types/file';

export type { FileInfo };

/**
 * API遅延シミュレーション
 * 実際のAPI呼び出しのような遅延を再現
 */
const simulateApiDelay = (ms: number = 200) => 
  new Promise(resolve => setTimeout(resolve, ms));

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
 * モックAPIを使用するかどうかを判定
 *
 * 常に実APIを使用するため false を返す。
 */
export function shouldUseMockAPI(): boolean {
  return false;
}

/**
 * トランジション進捗データを取得
 * GET /api/v1/progress/projects/:projectId/methods/:methodId/tasks/:taskNo/transitions
 *
 * @description
 * fileKey からプロジェクト名を抽出し、バックエンドの進捗APIを呼び出す。
 * バックエンドレスポンス（snake_case・数値ステータス）を
 * フロントエンド期待形式（camelCase・文字列ステータス）に変換して返す。
 *
 * @param fileKey   - MAIMLファイルキー（例: orgId/projects/projectName/projectName.maiml）
 * @param methodId  - メソッドID
 * @param taskNo    - タスク連番（1以上の整数）
 * @returns フロントエンド期待形式のトランジション進捗データ
 */
export async function fetchTransitionStatus(
  fileKey: string,
  methodId: string,
  taskNo: number
): Promise<unknown> {
  // fileKey からプロジェクト名を抽出
  // 例: "550e8400-.../projects/sample_project/sample_project.maiml" → "sample_project"
  const projectNameFromKey = fileKey.split('/projects/')[1]?.split('/')[0];
  if (!projectNameFromKey) {
    throw new Error(
      `fileKey からプロジェクト名を抽出できませんでした。fileKey: ${fileKey}`
    );
  }

  console.log('🌐 [fetchTransitionStatus] 実API呼び出し:', {
    fileKey,
    projectName: projectNameFromKey,
    methodId,
    taskNo,
  });

  const response = await fetch(
    `${API_BASE_URL}/progress/projects/${encodeURIComponent(projectNameFromKey)}/methods/${encodeURIComponent(methodId)}/tasks/${taskNo}/transitions`,
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
  await simulateApiDelay();

  console.log('📦 [fetchExperimentRecords] モックデータを返却（バックエンドAPI未実装）:', { workId });

  try {
    const mockData = await import('@/data/mock/mockExperimentRecords.json');
    return {
      success: true,
      data: mockData.default || mockData,
    };
  } catch (error) {
    console.warn('⚠️ mockExperimentRecords.json not found, returning empty data');
    return {
      success: true,
      data: {
        materials: [],
        conditions: [],
        results: [],
      },
    };
  }
}
