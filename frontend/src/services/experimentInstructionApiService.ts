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
 * ── スタブ切り替え ──
 *   USE_MOCK = true  → モックデータを返す（バックエンド不要）
 *   USE_MOCK = false → 実際の API を呼ぶ
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
} from '@/types/experimentInstruction';

// ─────────────────────────────────────────────────────────────
// スタブ切り替えフラグ
// ─────────────────────────────────────────────────────────────

/** true にするとモックデータを返す。false にすると実 API を呼ぶ */
const USE_MOCK = false;

// ─────────────────────────────────────────────────────────────
// モックデータ
// ─────────────────────────────────────────────────────────────

/** モック: プロジェクトのメソッド一覧 */
const MOCK_METHODS: ProjectMethod[] = [
  { id: 'method_synthesis_001', name: '合成プロセス A' },
  { id: 'method_analysis_002',  name: '分析プロセス B' },
];

/** モック: 実験指示一覧（ネスト形式） */
const MOCK_INSTRUCTIONS: InstructionMethodResponse[] = [
  {
    methodId: 'method_synthesis_001',
    tasks: [
      {
        taskNo: 1,
        taskStatus: 5, // 完了
        reviewedAt: '2024-05-20T10:00:00',
        reviewUserId: 'user_001',
        reviewResult: 'approved',
        templates: [
          {
            templateId: 'tmpl_material_001',
            templateName: '原料仕込み条件',
            templateType: 'material',
            fields: [
              { key: 'ns1:MaterialWeight',    label: '原料重量',    xsiType: 'FloatValue',   plannedValue: '50.0',  actualValue: '49.8',  unit: 'g'   },
              { key: 'ns1:MaterialPurity',    label: '純度',        xsiType: 'FloatValue',   plannedValue: '99.5',  actualValue: '99.6',  unit: '%'   },
              { key: 'ns1:MaterialBatchNo',   label: 'バッチNo',    xsiType: 'StringValue',  plannedValue: 'B-001', actualValue: 'B-001', unit: null  },
            ],
          },
          {
            templateId: 'tmpl_condition_001',
            templateName: '反応条件',
            templateType: 'condition',
            fields: [
              { key: 'ns1:Temperature',   label: '反応温度',  xsiType: 'FloatValue',   plannedValue: '120.0', actualValue: '121.3', unit: '°C'  },
              { key: 'ns1:Pressure',      label: '反応圧力',  xsiType: 'FloatValue',   plannedValue: '1.0',   actualValue: '1.0',   unit: 'MPa' },
              { key: 'ns1:ReactionTime',  label: '反応時間',  xsiType: 'IntegerValue', plannedValue: '60',    actualValue: '62',    unit: 'min' },
            ],
          },
        ],
      },
      {
        taskNo: 2,
        taskStatus: 4, // レビュー待ち
        reviewedAt: null,
        reviewUserId: null,
        reviewResult: null,
        templates: [
          {
            templateId: 'tmpl_material_001',
            templateName: '原料仕込み条件',
            templateType: 'material',
            fields: [
              { key: 'ns1:MaterialWeight',    label: '原料重量',    xsiType: 'FloatValue',   plannedValue: '50.0',  actualValue: '50.2',  unit: 'g'  },
              { key: 'ns1:MaterialPurity',    label: '純度',        xsiType: 'FloatValue',   plannedValue: '99.5',  actualValue: '99.4',  unit: '%'  },
              { key: 'ns1:MaterialBatchNo',   label: 'バッチNo',    xsiType: 'StringValue',  plannedValue: 'B-002', actualValue: 'B-002', unit: null },
            ],
          },
          {
            templateId: 'tmpl_condition_001',
            templateName: '反応条件',
            templateType: 'condition',
            fields: [
              { key: 'ns1:Temperature',   label: '反応温度',  xsiType: 'FloatValue',   plannedValue: '120.0', actualValue: '118.5', unit: '°C'  },
              { key: 'ns1:Pressure',      label: '反応圧力',  xsiType: 'FloatValue',   plannedValue: '1.0',   actualValue: '1.1',   unit: 'MPa' },
              { key: 'ns1:ReactionTime',  label: '反応時間',  xsiType: 'IntegerValue', plannedValue: '60',    actualValue: '60',    unit: 'min' },
            ],
          },
        ],
      },
      {
        taskNo: 3,
        taskStatus: 2, // 作業中
        reviewedAt: null,
        reviewUserId: null,
        reviewResult: null,
        templates: [
          {
            templateId: 'tmpl_material_001',
            templateName: '原料仕込み条件',
            templateType: 'material',
            fields: [
              { key: 'ns1:MaterialWeight',    label: '原料重量',    xsiType: 'FloatValue',   plannedValue: '50.0',  actualValue: null,    unit: 'g'  },
              { key: 'ns1:MaterialPurity',    label: '純度',        xsiType: 'FloatValue',   plannedValue: '99.5',  actualValue: null,    unit: '%'  },
              { key: 'ns1:MaterialBatchNo',   label: 'バッチNo',    xsiType: 'StringValue',  plannedValue: 'B-003', actualValue: null,    unit: null },
            ],
          },
          {
            templateId: 'tmpl_condition_001',
            templateName: '反応条件',
            templateType: 'condition',
            fields: [
              { key: 'ns1:Temperature',   label: '反応温度',  xsiType: 'FloatValue',   plannedValue: '120.0', actualValue: null, unit: '°C'  },
              { key: 'ns1:Pressure',      label: '反応圧力',  xsiType: 'FloatValue',   plannedValue: '1.0',   actualValue: null, unit: 'MPa' },
              { key: 'ns1:ReactionTime',  label: '反応時間',  xsiType: 'IntegerValue', plannedValue: '60',    actualValue: null, unit: 'min' },
            ],
          },
        ],
      },
    ],
  },
  {
    methodId: 'method_analysis_002',
    tasks: [
      {
        taskNo: 1,
        taskStatus: 6, // NG
        reviewedAt: '2024-05-21T14:30:00',
        reviewUserId: 'user_002',
        reviewResult: 'rejected',
        templates: [
          {
            templateId: 'tmpl_result_001',
            templateName: '測定結果',
            templateType: 'result',
            fields: [
              { key: 'ns1:YoungModulus',   label: 'ヤング率',   xsiType: 'FloatValue',   plannedValue: '200.0', actualValue: '185.0', unit: 'GPa' },
              { key: 'ns1:Hardness',       label: '硬度',        xsiType: 'FloatValue',   plannedValue: '450.0', actualValue: '432.0', unit: 'HV'  },
              { key: 'ns1:TensileStr',     label: '引張強度',    xsiType: 'FloatValue',   plannedValue: '800.0', actualValue: '765.0', unit: 'MPa' },
            ],
          },
        ],
      },
      {
        taskNo: 2,
        taskStatus: 1, // 実行待ち
        reviewedAt: null,
        reviewUserId: null,
        reviewResult: null,
        templates: [
          {
            templateId: 'tmpl_result_001',
            templateName: '測定結果',
            templateType: 'result',
            fields: [
              { key: 'ns1:YoungModulus',   label: 'ヤング率',   xsiType: 'FloatValue',   plannedValue: '200.0', actualValue: null, unit: 'GPa' },
              { key: 'ns1:Hardness',       label: '硬度',        xsiType: 'FloatValue',   plannedValue: '450.0', actualValue: null, unit: 'HV'  },
              { key: 'ns1:TensileStr',     label: '引張強度',    xsiType: 'FloatValue',   plannedValue: '800.0', actualValue: null, unit: 'MPa' },
            ],
          },
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// モック用ユーティリティ
// ─────────────────────────────────────────────────────────────

/** モック用の Promise ラッパー（即時解決） */
function mockResolve<T>(data: T): Promise<T> {
  return Promise.resolve(data);
}

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
  if (USE_MOCK) {
    console.info('[MOCK] getExperimentInstructions', projectId);
    return mockResolve(MOCK_INSTRUCTIONS);
  }

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
  if (USE_MOCK) {
    console.info('[MOCK] getProjectMethods', projectId);
    return mockResolve(MOCK_METHODS);
  }

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
  if (USE_MOCK) {
    console.info('[MOCK] approveTask', { projectId, methodId, taskNumber });
    return mockResolve<ApproveTaskResponse>({
      success: true,
      data: { taskStatus: 5, reviewedAt: new Date().toISOString(), reviewUserId: 'mock_user', reviewResult: 'approved' },
    });
  }

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
  if (USE_MOCK) {
    console.info('[MOCK] recordNg', { projectId, methodId, taskNumber, body });
    return mockResolve<RecordNgResponse>({
      success: true,
      data: { taskStatus: 6, reviewedAt: new Date().toISOString(), reviewUserId: 'mock_user', reviewResult: 'rejected' },
    });
  }

  const apiClient = createApiClient();
  const url =
    `/projects/${encodeURIComponent(projectId)}` +
    `/tasks/${encodeURIComponent(methodId)}/${taskNumber}/ng`;

  const response = await apiClient.put<RecordNgResponse>(url, body);

  return response.data;
}
