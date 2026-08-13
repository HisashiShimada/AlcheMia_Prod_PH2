/**
 * experimentPlanApiService.ts
 * 実験計画APIサービス
 *
 * @remarks
 * バックエンド API:
 *   GET  /api/v1/projects/:projectId/methods/:methodId/plan-dialog-data
 *   GET  /api/v1/projects/:projectId/experiment-plans?methodId=xxx
 *   PUT  /api/v1/projects/:projectId/experiment-plans/:methodId/:taskNo
 */

import type {
  SaveExperimentPlanRequest,
  SaveExperimentPlanResponse,
} from '@/types/experimentPlan';

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

  // 不確かさ付与情報を復元（__uncertainty__ キー）
  // TransitionPlanValues のインデックスシグネチャとの型不整合を unknown 経由で回避
  const rawUncertainty = transValues['__uncertainty__'];
  const assignedUncertainty: ExperimentPlanTabData['assignedUncertainty'] =
    rawUncertainty && typeof rawUncertainty === 'object' && !Array.isArray(rawUncertainty)
      ? (rawUncertainty as unknown as ExperimentPlanTabData['assignedUncertainty'])
      : {};

  return {
    selectedTransitions: [transitionId],
    creatorRefs,
    instrumentRefs,
    ownerRefs,
    notes,
    templateValues,
    assignedUncertainty,
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

  // 不確かさ付与情報を __uncertainty__ キーに保存
  if (tabData.assignedUncertainty && Object.keys(tabData.assignedUncertainty).length > 0) {
    // TransitionPlanValues のインデックスシグネチャとの型不整合を unknown 経由で回避
    (values as unknown as Record<string, unknown>)['__uncertainty__'] = tabData.assignedUncertainty;
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
