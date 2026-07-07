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
// バックエンドAPI接続
// ──────────────────────────────────────────────────────────────

import { createApiClient } from '@/utils/authUtils';
import type { TemplateDef, NoteTypeValue, TemplateValues, NoteItem } from '@/types/experimentPlan';
import type { ExperimentPlanTabData } from '@/types/experimentPlan';

/** TransitionPlanValues（バックエンドの planned_values の各transitionId配下） */
interface TransitionPlanValues {
  'mgr-instruction:requiredCreatorUUID'?: string[];
  'mgr-instruction:requiredInstrumentUUID'?: string[];
  'mgr-instruction:requiredOwnerUUID'?: string[];
  'mgr-instruction:caution'?: string;
  'mgr-instruction:operationNote'?: string;
  'mgr-instruction:checkItem'?: string;
  'mgr-instruction:prohibitedAction'?: string;
  'mgr-instruction:OtherNotes'?: string;
  [templateId: string]: string[] | string | Record<string, string> | undefined;
}

type ExperimentPlanValues = Record<string, TransitionPlanValues>;

/** バックエンドから返る1タスク分の実験計画 */
interface ExperimentPlanDto {
  taskNo: number;
  plannedValues: ExperimentPlanValues;
  createdAt?: string;
}

/** getExperimentPlans の戻り値 */
interface GetExperimentPlansResult {
  methodId: string;
  plans: ExperimentPlanDto[];
}

// ── ノートタイプ定数（types/experimentPlan.ts と同値） ─────────
const NOTE_TYPE_KEYS: NoteTypeValue[] = [
  'mgr-instruction:caution',
  'mgr-instruction:operationNote',
  'mgr-instruction:checkItem',
  'mgr-instruction:prohibitedAction',
  'mgr-instruction:OtherNotes',
];

/**
 * 1トランジション分の TransitionPlanValues → ExperimentPlanTabData に変換する
 * （バックエンドのデータをダイアログ表示用に復元する）
 *
 * @param transitionId - トランジションID
 * @param transValues  - planned_values[transitionId] の値
 */
function transitionValuesToTabData(
  transitionId: string,
  transValues: TransitionPlanValues
): ExperimentPlanTabData {
  const creatorRefs = (transValues['mgr-instruction:requiredCreatorUUID'] as string[] | undefined) ?? [];
  const instrumentRefs = (transValues['mgr-instruction:requiredInstrumentUUID'] as string[] | undefined) ?? [];
  const ownerRefs = (transValues['mgr-instruction:requiredOwnerUUID'] as string[] | undefined) ?? [];

  // 注意事項
  const notes: NoteItem[] = [];
  for (const noteType of NOTE_TYPE_KEYS) {
    const content = transValues[noteType] as string | undefined;
    if (content) {
      notes.push({
        id: `${transitionId}-${noteType}-restored`,
        type: noteType,
        content,
        properties: [],
      });
    }
  }

  // テンプレート値（mgr-instruction: キー以外をテンプレート値とみなす）
  const templateValues: TemplateValues = {};
  const reservedKeys = new Set<string>([
    'mgr-instruction:requiredCreatorUUID',
    'mgr-instruction:requiredInstrumentUUID',
    'mgr-instruction:requiredOwnerUUID',
    ...NOTE_TYPE_KEYS,
  ]);
  for (const [key, value] of Object.entries(transValues)) {
    if (!reservedKeys.has(key) && typeof value === 'string') {
      templateValues[key] = value;
    }
  }

  return {
    selectedTransitions: [transitionId],
    creatorRefs,
    instrumentRefs,
    ownerRefs,
    notes,
    templateValues,
  };
}

/**
 * ExperimentPlanTabData（1トランジション分）→ TransitionPlanValues に変換する
 */
function tabDataToTransitionValues(tabData: ExperimentPlanTabData): TransitionPlanValues {
  const values: TransitionPlanValues = {};

  if (tabData.creatorRefs.length > 0) {
    values['mgr-instruction:requiredCreatorUUID'] = tabData.creatorRefs;
  }
  if (tabData.instrumentRefs.length > 0) {
    values['mgr-instruction:requiredInstrumentUUID'] = tabData.instrumentRefs;
  }
  if (tabData.ownerRefs.length > 0) {
    values['mgr-instruction:requiredOwnerUUID'] = tabData.ownerRefs;
  }
  for (const note of tabData.notes) {
    if (note.content.trim()) {
      values[note.type] = note.content;
    }
  }
  for (const [key, value] of Object.entries(tabData.templateValues)) {
    if (value !== undefined && value !== '') {
      values[key] = String(value);
    }
  }

  return values;
}

/** 実行順序アイテム（ExperimentPlanDialog から渡される） */
export interface TransitionOrderEntry {
  id: string;
  order: number;
  /** 前提となるトランジションIDの配列（依存関係） */
  prerequisiteTransitionIds?: string[];
}

/**
 * ExperimentPlanTabData + 実行順序リスト → ExperimentPlanValues に変換する
 * （ダイアログの入力値をバックエンドに送る形式に変換する）
 *
 * transitionOrder が指定された場合は、その order 昇順でトランジションを並べて
 * plannedValues のキー順序に反映する。
 */
function tabDataToPlannedValues(
  tabData: ExperimentPlanTabData,
  transitionOrder?: TransitionOrderEntry[]
): ExperimentPlanValues {
  const plannedValues: ExperimentPlanValues = {};

  // 共通の値（全トランジションに適用）
  const transitionValues: TransitionPlanValues = {};

  if (tabData.creatorRefs.length > 0) {
    transitionValues['mgr-instruction:requiredCreatorUUID'] = tabData.creatorRefs;
  }
  if (tabData.instrumentRefs.length > 0) {
    transitionValues['mgr-instruction:requiredInstrumentUUID'] = tabData.instrumentRefs;
  }
  if (tabData.ownerRefs.length > 0) {
    transitionValues['mgr-instruction:requiredOwnerUUID'] = tabData.ownerRefs;
  }
  for (const note of tabData.notes) {
    if (note.content.trim()) {
      transitionValues[note.type] = note.content;
    }
  }
  for (const [key, value] of Object.entries(tabData.templateValues)) {
    if (value !== undefined && value !== '') {
      transitionValues[key] = String(value);
    }
  }

  // transitionOrder が渡された場合は order 昇順で並べる
  // 渡されない場合は selectedTransitions をそのまま使用
  const orderedIds: string[] = transitionOrder && transitionOrder.length > 0
    ? [...transitionOrder].sort((a, b) => a.order - b.order).map((item) => item.id)
    : tabData.selectedTransitions;

  for (const transitionId of orderedIds) {
    plannedValues[transitionId] = { ...transitionValues };
  }

  return plannedValues;
}

/**
 * 指定メソッドの全タスク分の実験計画を取得
 * GET /api/v1/projects/:projectId/experiment-plans?methodId=xxx
 */
export async function getExperimentPlans(
  projectId: string,
  methodId: string
): Promise<GetExperimentPlansResult | null> {
  try {
    const apiClient = createApiClient();
    const url = `/projects/${encodeURIComponent(projectId)}/experiment-plans?methodId=${encodeURIComponent(methodId)}`;
    const response = await apiClient.get<{ success: boolean; data: GetExperimentPlansResult }>(url);
    return response.data.data;
  } catch (error) {
    console.warn('[getExperimentPlans] API 取得失敗:', error);
    return null;
  }
}

/**
 * バックエンドから取得した実験計画を tabDataMap 形式（二次元: タスク×トランジション）に変換する
 *
 * @param result - getExperimentPlans の戻り値
 * @returns タブキー → (トランジションID → ExperimentPlanTabData) のマップ
 */
export function experimentPlansToTabDataMap(
  result: GetExperimentPlansResult | null
): Record<string, Record<string, ExperimentPlanTabData>> {
  if (!result || result.plans.length === 0) return {};

  const tabDataMap: Record<string, Record<string, ExperimentPlanTabData>> = {};
  for (const plan of result.plans) {
    if (!plan.plannedValues || Object.keys(plan.plannedValues).length === 0) continue;

    const key = `task-${plan.taskNo}`;
    tabDataMap[key] = {};

    // planned_values のキーはトランジションID
    for (const [transitionId, transValues] of Object.entries(plan.plannedValues)) {
      if (transValues && typeof transValues === 'object') {
        tabDataMap[key][transitionId] = transitionValuesToTabData(
          transitionId,
          transValues as TransitionPlanValues
        );
      }
    }
  }
  return tabDataMap;
}

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
    /** このトランジションに流入するPlace IDの配列（入力Place: 入力可能テンプレート絞り込み用） */
    inputPlaceIds: string[];
    /** このトランジションから流出するPlace IDの配列（出力Place: 表示するがdisabled） */
    outputPlaceIds: string[];
  }>;
  templates: TemplateDef[];
  creatorRefs: string[];
  instrumentRefs: string[];
  ownerRefs: string[];
  /**
   * Conditionテンプレートから抽出した基本情報の初期値
   * 以下のキーを持つプロパティが存在する場合に設定される:
   *   - mgr-instruction:requiredCreatorUUID
   *   - mgr-instruction:requiredInstrumentUUID
   *   - mgr-instruction:requiredOwnerUUID
   *   - mgr-instruction:caution / operationNote / checkItem / prohibitedAction / OtherNotes
   */
  defaultBasicInfo?: {
    creatorRefs?: string[];
    instrumentRefs?: string[];
    ownerRefs?: string[];
    notes?: Array<{
      type: string;
      content: string;
    }>;
  };
}

// ─── フォールバック用モックデータ ───────────────────────────────
// バックエンドが未接続 / APIが prerequisiteTransitionIds を返さない場合に使用する
// 依存グラフ:
//   TR_A（材料準備A）─┐
//                      ├─→ TR_C（混合）─→ TR_D（加熱）─→ TR_E（測定）
//   TR_B（材料準備B）─┘
export const MOCK_PLAN_DIALOG_DATA: PlanDialogData = {
  transitions: [
    { id: 'trans-001', name: '材料準備A', prerequisiteTransitionIds: [], inputPlaceIds: [], outputPlaceIds: [] },
    { id: 'trans-002', name: '材料準備B', prerequisiteTransitionIds: [], inputPlaceIds: [], outputPlaceIds: [] },
    { id: 'trans-003', name: '混合',      prerequisiteTransitionIds: ['trans-001', 'trans-002'], inputPlaceIds: [], outputPlaceIds: [] },
    { id: 'trans-004', name: '加熱',      prerequisiteTransitionIds: ['trans-003'], inputPlaceIds: [], outputPlaceIds: [] },
    { id: 'trans-005', name: '測定',      prerequisiteTransitionIds: ['trans-004'], inputPlaceIds: [], outputPlaceIds: [] },
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
 * 実験計画をバックエンドに保存（UPSERT）: 1タスク × 全トランジション版
 * PUT /api/v1/projects/:projectId/experiment-plans/:methodId/:taskNo
 *
 * @param projectId           - プロジェクトID
 * @param methodId            - メソッドID
 * @param taskNo              - タスク番号（1〜N）
 * @param transitionDataMap   - トランジションID → ExperimentPlanTabData のマップ
 * @param transitionOrder     - トランジション実行順序（order 昇順で plannedValues のキー順に反映）
 */
export async function upsertExperimentPlanToApi(
  projectId: string,
  methodId: string,
  taskNo: number,
  transitionDataMap: Record<string, ExperimentPlanTabData>,
  transitionOrder?: TransitionOrderEntry[]
): Promise<void> {
  const apiClient = createApiClient();
  const url = `/projects/${encodeURIComponent(projectId)}/experiment-plans/${encodeURIComponent(methodId)}/${taskNo}`;

  // トランジションIDごとに TransitionPlanValues を構築
  const plannedValues: ExperimentPlanValues = {};

  // order 昇順で並べる（指定ない場合はキー順）
  const orderedIds: string[] =
    transitionOrder && transitionOrder.length > 0
      ? [...transitionOrder]
          .sort((a, b) => a.order - b.order)
          .map((item) => item.id)
          .filter((id) => id in transitionDataMap)
      : Object.keys(transitionDataMap);

  // transitionDataMap に含まれているが orderedIds にない ID も末尾に追加
  for (const id of Object.keys(transitionDataMap)) {
    if (!orderedIds.includes(id)) {
      orderedIds.push(id);
    }
  }

  for (const transitionId of orderedIds) {
    const tabData = transitionDataMap[transitionId];
    if (tabData) {
      plannedValues[transitionId] = tabDataToTransitionValues(tabData);
    }
  }

  // transitionOrder が指定されている場合は __meta__ にトランジション順序情報を埋め込む
  // タスク登録保存時にこの情報を読み取り、transition_data の work_order / prerequisite_transition_ids を設定する
  if (transitionOrder && transitionOrder.length > 0) {
    (plannedValues as Record<string, unknown>)['__meta__'] = {
      transitionOrder: transitionOrder.map((item) => ({
        id: item.id,
        order: item.order,
        prerequisiteTransitionIds: item.prerequisiteTransitionIds ?? [],
      })),
    };
  }

  await apiClient.put(url, { plannedValues });
}

/**
 * 実験計画をバックエンドに保存（旧モック互換: POST方式）
 * POST /api/v1/projects/:projectId/experiment-plans
 * @deprecated upsertExperimentPlanToApi を使用してください
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
