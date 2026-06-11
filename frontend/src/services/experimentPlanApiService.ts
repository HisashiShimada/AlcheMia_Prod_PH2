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
  transitions: Array<{ id: string; name: string }>;
  templates: TemplateDef[];
  creatorRefs: string[];
  instrumentRefs: string[];
  ownerRefs: string[];
}

export async function getPlanDialogData(
  projectId: string,
  methodId: string
): Promise<PlanDialogData> {
  const apiClient = createApiClient();
  const url = `/projects/${encodeURIComponent(projectId)}/methods/${encodeURIComponent(methodId)}/plan-dialog-data`;
  const response = await apiClient.get<{ success: boolean; data: PlanDialogData }>(url);
  return response.data.data;
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
