/**
 * experimentPlanApiService.ts
 * 実験計画APIサービス（仮実装 - モック）
 * TODO: 本実装時に実際のAPIエンドポイントに接続する
 */

import type {
  SaveExperimentPlanRequest,
  SaveExperimentPlanResponse,
} from '@/types/experimentPlan';

/**
 * 実験計画を保存（仮実装）
 * TODO: POST /api/v1/projects/:projectId/experiment-plans
 */
export async function saveExperimentPlan(
  projectId: string,
  data: SaveExperimentPlanRequest
): Promise<SaveExperimentPlanResponse> {
  // TODO: 本実装時に実際のAPIエンドポイントに接続
  console.log('[MOCK] saveExperimentPlan called:', { projectId, data });

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: '実験計画を保存しました（モック）',
      });
    }, 500);
  });
}

/**
 * MAIMLからCreatorRef一覧を取得（仮実装）
 * TODO: MAIMLパース結果から取得するAPIに接続
 */
export async function getCreatorRefs(
  projectId: string,
  methodId: string
): Promise<string[]> {
  console.log('[MOCK] getCreatorRefs called:', { projectId, methodId });

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(['creator_001', 'creator_002', 'creator_003']);
    }, 300);
  });
}

/**
 * MAIMLからInstrumentRef一覧を取得（仮実装）
 * TODO: MAIMLパース結果から取得するAPIに接続
 */
export async function getInstrumentRefs(
  projectId: string,
  methodId: string
): Promise<string[]> {
  console.log('[MOCK] getInstrumentRefs called:', { projectId, methodId });

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(['instrument_001', 'instrument_002']);
    }, 300);
  });
}

/**
 * MAIMLからOwnerRef一覧を取得（仮実装）
 * TODO: MAIMLパース結果から取得するAPIに接続
 */
export async function getOwnerRefs(
  projectId: string,
  methodId: string
): Promise<string[]> {
  console.log('[MOCK] getOwnerRefs called:', { projectId, methodId });

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(['owner_001', 'owner_002']);
    }, 300);
  });
}

// ──────────────────────────────────────────────────────────────
// バックエンドAPI接続（モックエンドポイント）
// ──────────────────────────────────────────────────────────────

import { createApiClient } from '@/utils/authUtils';
import type { TemplateDef } from '@/types/experimentPlan';

/**
 * ExperimentPlanDialog 用データ（transitions / templates / refs）を一括取得
 * GET /api/v1/projects/:projectId/methods/:methodId/plan-dialog-data
 */
export interface PlanDialogData {
  transitions: Array<{
    id: string;
    name: string;
    /** 直接依存するトランジションIDの配列（空配列 = 依存なし） */
    prerequisiteTransitionIds: string[];
  }>;
  templates: TemplateDef[];
  creatorRefs: string[];
  instrumentRefs: string[];
  ownerRefs: string[];
}

// ─── フォールバック用モックデータ ───────────────────────────────
// バックエンドが未接続 / APIが prerequisiteTransitionIds を返さない場合に使用する
// 依存グラフ:
//   TR_A（材料準備A）─┐
//                      ├─→ TR_C（混合）─→ TR_D（加熱）─→ TR_E（測定）
//   TR_B（材料準備B）─┘
export const MOCK_PLAN_DIALOG_DATA: PlanDialogData = {
  transitions: [
    { id: 'trans-001', name: '材料準備A', prerequisiteTransitionIds: [] },
    { id: 'trans-002', name: '材料準備B', prerequisiteTransitionIds: [] },
    { id: 'trans-003', name: '混合',      prerequisiteTransitionIds: ['trans-001', 'trans-002'] },
    { id: 'trans-004', name: '加熱',      prerequisiteTransitionIds: ['trans-003'] },
    { id: 'trans-005', name: '測定',      prerequisiteTransitionIds: ['trans-004'] },
  ],
  templates: [],
  creatorRefs: ['creator_001', 'creator_002', 'creator_003'],
  instrumentRefs: ['instrument_001', 'instrument_002'],
  ownerRefs: ['owner_001', 'owner_002'],
};

export async function getPlanDialogData(
  projectId: string,
  methodId: string
): Promise<PlanDialogData> {
  try {
    const apiClient = createApiClient();
    const url = `/projects/${encodeURIComponent(projectId)}/methods/${encodeURIComponent(methodId)}/plan-dialog-data`;
    const response = await apiClient.get<{ success: boolean; data: PlanDialogData }>(url);
    return response.data.data;
  } catch (error) {
    // API 未実装 / バックエンド未接続の場合はモックデータを返す
    console.warn('[getPlanDialogData] API 接続失敗。モックデータを使用します:', error);
    return new Promise((resolve) => {
      setTimeout(() => resolve(MOCK_PLAN_DIALOG_DATA), 300);
    });
  }
}

/**
 * 実験計画をバックエンドに保存
 * POST /api/v1/projects/:projectId/experiment-plans
 */
export async function saveExperimentPlanToApi(
  projectId: string,
  data: SaveExperimentPlanRequest
): Promise<SaveExperimentPlanResponse> {
  const apiClient = createApiClient();
  const url = `/projects/${encodeURIComponent(projectId)}/experiment-plans`;
  const response = await apiClient.post<{ success: boolean; message: string }>(url, data);
  return response.data;
}
