'use client';

/**
 * ExperimentInstructionTab.tsx
 * 指示一覧タブ > 実験指示サブタブ
 *
 * 機能:
 *   - バックエンド API から実験指示（想定値・実績値）を取得して一覧表示
 *   - フィルタ（タスクNo / メソッドID / トランジション / テンプレート / Key）
 *   - レビュー待ちタスクの「承認」「NG」操作
 *   - 「実験指示を編集」ボタンから ExperimentPlanDialog を開く
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Table,
  Tag,
  Button,
  Radio,
  Dropdown,
  Space,
  Modal,
  Form,
  Input,
  Typography,
  Flex,
  Select,
  Tooltip,
  App,
  Spin,
  Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import {
  CheckCircleOutlined,
  FilterOutlined,
  EditOutlined,
  SettingOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import ExperimentPlanDialog from './ExperimentPlanDialog';
import ViewRendererDialog from '@/components/viewer/ViewRendererDialog';
import {
  getExperimentInstructions,
  getProjectMethods,
  approveTask,
  recordNg,
} from '@/services/experimentInstructionApiService';
import type {
  InstructionMethodResponse,
  ProjectMethod,
} from '@/types/experimentInstruction';
import type { ProjectFile } from '@/types/file';

const { Text } = Typography;
const { TextArea } = Input;

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

export interface ExperimentInstructionTabProps {
  /** 対象プロジェクトID */
  projectId: string;
  /** 対象プロジェクト名 */
  projectName?: string;
}

// ─────────────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────────────

/** タスクステータスコード → 表示設定 */
const TASK_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  '01': { label: '実行待ち',     color: 'default'    },
  '02': { label: '作業中',       color: 'processing' },
  '03': { label: '実行中',       color: 'processing' },
  '04': { label: 'レビュー待ち', color: 'warning'    },
  '05': { label: '完了',         color: 'success'    },
  '06': { label: 'NG',           color: 'error'      },
};

/** xsi:type → Tag カラー */
const XSI_TYPE_COLOR: Record<string, string> = {
  FloatValue:   'geekblue',
  IntegerValue: 'purple',
  StringValue:  'cyan',
};

/** xsi:type 短縮表示 */
const XSI_TYPE_SHORT: Record<string, string> = {
  FloatValue:   'Float',
  IntegerValue: 'Int',
  StringValue:  'Str',
};

// ─────────────────────────────────────────────────────────────
// テーブル行の型（フラット化後）
// ─────────────────────────────────────────────────────────────

interface FlatRow {
  /** テーブルのrowKey */
  rowKey: string;
  methodId: string;
  methodName: string;
  taskNumber: number;
  taskStatus: string;
  transitionId: string;
  transitionName: string;
  templateName: string;
  propKey: string;
  propLabel: string;
  xsiType: string;
  expected: number | string | null;
  /** 想定値（平均）: 同一 method/transition/template/key グループの想定値平均 */
  expectedAverage: number | null;
  actual: number | string | null;
  /** 実績値（平均）: 同一 method/transition/template/key グループの実績値平均 */
  actualAverage: number | null;
  unit: string;
  /** 不確かさ基準名 */
  uncertaintyCriteriaName: string | null;
  /** 不確かさ基準の種別（定性 / 定量） */
  uncertaintyCriteriaType: 'qualitative' | 'quantitative' | null;
  /** 不確かさ付与値 */
  uncertaintyAssignedValue: string | null;
  /** 不確かさ付与者 */
  uncertaintyAssignedBy: string | null;
  /** 不確かさ付与日時 */
  uncertaintyAssignedAt: string | null;
  /** 不確かさコメント */
  uncertaintyComment: string | null;
}

// ─────────────────────────────────────────────────────────────
// フィルタ状態の型
// ─────────────────────────────────────────────────────────────

interface FilterState {
  taskNumber: number | null;
  methodId:   string | null;
  transitionId: string | null;
  templateName: string | null;
  propKey: string | null;
}

const INITIAL_FILTER: FilterState = {
  taskNumber: null,
  methodId: null,
  transitionId: null,
  templateName: null,
  propKey: null,
};

// ─────────────────────────────────────────────────────────────
// 列カスタマイズ定数
// ─────────────────────────────────────────────────────────────

/** 固定列キー（非表示にできない列） */
const FIXED_COLUMN_KEYS = ['taskNumber', 'propKey'] as const;

/** 切替可能な列の定義（width は各列の固定幅と一致させること） */
const TOGGLEABLE_COLUMN_DEFS: { key: string; label: string; width: number }[] = [
  { key: 'taskStatus',                  label: 'タスクステータス',                width: 110 },
  { key: 'methodName',                  label: 'メソッド名',                    width: 190 },
  { key: 'transitionName',              label: 'トランジション名',               width: 180 },
  { key: 'templateName',                label: 'テンプレート名',                 width: 180 },
  { key: 'xsiType',                     label: 'xsi:type',                      width:  75 },
  { key: 'expected',                    label: '想定値',                         width: 100 },
  { key: 'expectedAverage',             label: '想定値（平均）',                  width: 120 },
  { key: 'actual',                      label: '実績値',                         width: 100 },
  { key: 'actualAverage',               label: '実績値（平均）',                  width: 120 },
  { key: 'diff',                        label: '差分',                           width:  85 },
  { key: 'uncertaintyCriteriaName',     label: '不確かさ基準名',                  width: 200 },
  { key: 'uncertaintyAssignedValue',    label: '不確かさ値',                      width: 140 },
  { key: 'uncertaintyAssignedBy',       label: '実験記録者',                      width: 140 },
  { key: 'uncertaintyAssignedAt',       label: '不確かさ付与日時',                width: 160 },
  { key: 'uncertaintyComment',          label: '不確かさについてのコメント',       width: 220 },
];

/** デフォルトで表示するすべての列キー */
const ALL_COLUMN_KEYS = TOGGLEABLE_COLUMN_DEFS.map((d) => d.key);

// ─────────────────────────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────────────────────────

function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/**
 * task_status 数値 → 2桁ゼロ埋め文字列（表示・比較用）
 * null / undefined の場合は '00' を返す
 */
function toTaskStatusStr(status: number | null | undefined): string {
  if (status == null) return '00';
  return String(status).padStart(2, '0');
}

/** モック用の不確かさデータ（画像と同様） */
const MOCK_UNCERTAINTY_DATA: {

  criteriaName: string;
  criteriaType: 'qualitative' | 'quantitative';
  assignedValue: string;
  assignedBy: string;
  assignedAt: string;
  comment: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
}[] = [
  { criteriaName: 'ヤング率',     criteriaType: 'qualitative', assignedValue: '確か',           assignedBy: '佐藤 花子', assignedAt: '2024-05-20T10:15:00', comment: '文献Aの実験結果に基づく推定値',   approvalStatus: 'approved'  },
  { criteriaName: '材料特性値',   criteriaType: 'qualitative', assignedValue: '確か',    assignedBy: '鈴木 一郎', assignedAt: '2024-05-20T09:45:00', comment: '測定装置の校正結果を反映',       approvalStatus: 'approved'  },
  { criteriaName: '温度',         criteriaType: 'qualitative',  assignedValue: '不確か',            assignedBy: '田中 美咲', assignedAt: '2024-05-19T16:30:00', comment: '環境温度の測定値',               approvalStatus: 'approved' },
  { criteriaName: '圧力',         criteriaType: 'qualitative', assignedValue: '確か',         assignedBy: '高橋 健太', assignedAt: '2024-05-19T14:20:00', comment: '気圧計の精度を考慮',             approvalStatus: 'approved'  },
  { criteriaName: '降伏強度',     criteriaType: 'qualitative', assignedValue: 'OK',         assignedBy: '伊藤 翔太', assignedAt: '2024-05-18T11:05:00', comment: '引張試験の結果に基づく',         approvalStatus: 'approved' },
  { criteriaName: '熱伝導率',     criteriaType: 'qualitative', assignedValue: 'NG',       assignedBy: '佐藤 花子', assignedAt: '2024-05-17T15:50:00', comment: 'レーザーフラッシュ法による...',  approvalStatus: 'approved'  },
  { criteriaName: '硬度',         criteriaType: 'qualitative',  assignedValue: '確か',             assignedBy: '鈴木 一郎', assignedAt: '2024-05-17T10:30:00', comment: 'ビッカース硬さ試験の結果',       approvalStatus: 'approved' },
  { criteriaName: '引張強度',     criteriaType: 'qualitative', assignedValue: '曖昧',         assignedBy: '田中 美咲', assignedAt: '2024-05-16T13:45:00', comment: 'JIS Z 2241に基づく試験結果',    approvalStatus: 'pending'  },
  { criteriaName: '伸び',         criteriaType: 'qualitative', assignedValue: 'OK',            assignedBy: '高橋 健太', assignedAt: '2024-05-16T09:20:00', comment: '標点距離50mmでの測定値',        approvalStatus: 'approved' },
  { criteriaName: 'ポアソン比',   criteriaType: 'qualitative', assignedValue: '確か',           assignedBy: '伊藤 翔太', assignedAt: '2024-05-15T16:00:00', comment: 'ひずみゲージ法による測定',       approvalStatus: 'pending'  },
  { criteriaName: '比熱容量',     criteriaType: 'qualitative', assignedValue: '不確か',       assignedBy: '佐藤 花子', assignedAt: '2024-05-15T11:30:00', comment: 'DSC法による測定結果',            approvalStatus: 'rejected'  },
  { criteriaName: '電気抵抗率',   criteriaType: 'qualitative',  assignedValue: '確か',    assignedBy: '鈴木 一郎', assignedAt: '2024-05-14T14:15:00', comment: '四端子法による測定',             approvalStatus: 'rejected' },
  { criteriaName: '破壊靭性',     criteriaType: 'qualitative', assignedValue: 'NG',        assignedBy: '田中 美咲', assignedAt: '2024-05-14T10:00:00', comment: 'ASTM E399に基づく試験',         approvalStatus: 'pending' },
  { criteriaName: '疲労限度',     criteriaType: 'qualitative',  assignedValue: '曖昧',           assignedBy: '高橋 健太', assignedAt: '2024-05-13T15:40:00', comment: 'S-N曲線から外挿した推定値',      approvalStatus: 'pending'  },
  { criteriaName: '熱膨張係数',   criteriaType: 'qualitative', assignedValue: '曖昧',           assignedBy: '伊藤 翔太', assignedAt: '2024-05-13T09:10:00', comment: 'TMA法による25〜400°Cの平均',   approvalStatus: 'pending' },
];

/**
 * 同一 methodId/templateId/propKey グループの数値平均を計算する
 * 文字列型や全 null の場合は null を返す
 */
function calcGroupAverage(
  methods: InstructionMethodResponse[],
  targetMethodId: string,
  targetTemplateId: string,
  targetPropKey: string,
  field: 'plannedValue' | 'actualValue'
): number | null {
  const nums: number[] = [];
  methods.forEach((method) => {
    if (method.methodId !== targetMethodId) return;
    method.tasks.forEach((task) => {
      task.templates.forEach((tmpl) => {
        if (tmpl.templateId !== targetTemplateId) return;
        tmpl.fields.forEach((fld) => {
          if (fld.key !== targetPropKey) return;
          const val = fld[field];
          if (val === null || val === undefined) return;
          const numVal = typeof val === 'number' ? val : parseFloat(val);
          if (!isNaN(numVal)) nums.push(numVal);
        });
      });
    });
  });
  if (nums.length === 0) return null;
  const sum = nums.reduce((acc, n) => acc + n, 0);
  return parseFloat((sum / nums.length).toFixed(4));
}

/** InstructionMethodResponse[] をフラットな FlatRow[] に変換 */
function flattenInstructions(methods: InstructionMethodResponse[]): FlatRow[] {
  const rows: FlatRow[] = [];
  // [MOCK] バックエンド実装時に削除するインデックス変数
  let mockIdx = 0;
  methods.forEach((method) => {
    method.tasks.forEach((task) => {
      const taskStatusStr = toTaskStatusStr(task.taskStatus);
      task.templates.forEach((tmpl) => {
        tmpl.fields.forEach((field, idx) => {
          const mock = MOCK_UNCERTAINTY_DATA[mockIdx % MOCK_UNCERTAINTY_DATA.length];
          mockIdx++;
          rows.push({
            rowKey: `${method.methodId}_${task.taskNo}_${tmpl.templateId}_${field.key}_${idx}`,
            methodId:      method.methodId,
            methodName:    method.methodId, // MAIML パース統合後にメソッド名を追加予定
            taskNumber:    task.taskNo,
            taskStatus:    taskStatusStr,
            transitionId:  '',             // MAIML パース統合後に追加予定
            transitionName: '',            // MAIML パース統合後に追加予定
            templateName:  tmpl.templateName ?? tmpl.templateId,
            propKey:       field.key,
            propLabel:     field.label,
            xsiType:       field.xsiType ?? '',
            expected:      field.plannedValue,
            expectedAverage: calcGroupAverage(methods, method.methodId, tmpl.templateId, field.key, 'plannedValue'),
            actual:        field.actualValue,
            actualAverage: calcGroupAverage(methods, method.methodId, tmpl.templateId, field.key, 'actualValue'),
            unit:          field.unit ?? '',
            uncertaintyCriteriaName:  mock.criteriaName,
            uncertaintyCriteriaType:  mock.criteriaType,
            uncertaintyAssignedValue: mock.assignedValue,
            uncertaintyAssignedBy:    mock.assignedBy,
            uncertaintyAssignedAt:    mock.assignedAt,
            uncertaintyComment:       mock.comment,
          });
        });
      });
    });
  });
  return rows;
}

// ─────────────────────────────────────────────────────────────
// セルコンポーネント
// ─────────────────────────────────────────────────────────────

const DiffCell: React.FC<{ expected: number | string | null; actual: number | string | null }> = ({
  expected,
  actual,
}) => {
  if (typeof expected !== 'number' || typeof actual !== 'number') {
    return <Text type="secondary">—</Text>;
  }
  const diff = actual - expected;
  const s = parseFloat(diff.toFixed(4)).toString();
  if (diff === 0) return <Text type="secondary">±0</Text>;
  if (diff > 0)   return <Text style={{ color: '#cf1322' }}>+{s}</Text>;
  return <Text style={{ color: '#096dd9' }}>{s}</Text>;
};

const ActualCell: React.FC<{ actual: number | string | null; unit: string }> = ({ actual, unit }) => {
  if (actual === null) return <Text type="secondary" italic>未記録</Text>;
  return <Text>{actual}{unit ? ` ${unit}` : ''}</Text>;
};

// ─────────────────────────────────────────────────────────────
// フィルタバー
// ─────────────────────────────────────────────────────────────

interface FilterBarProps {
  filters: FilterState;
  rows: FlatRow[];
  total: number;
  filtered: number;
  onChange: (partial: Partial<FilterState>) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ filters, rows, total, filtered, onChange }) => {
  const sel = (
    width: number,
    placeholder: string,
    key: keyof FilterState,
    opts: (string | number)[]
  ) => (
    <Select
      allowClear
      size="small"
      placeholder={placeholder}
      style={{ width }}
      value={filters[key] as string | number | null}
      onChange={(v) => onChange({ [key]: v ?? null })}
      options={opts.map((v) => ({ label: String(v), value: v }))}
      popupMatchSelectWidth={false}
    />
  );

  return (
    <Flex gap={6} align="center" wrap="wrap" style={{ padding: '4px 0' }}>
      <FilterOutlined style={{ color: '#888', fontSize: 12 }} />
      {sel(70,  'タスクNo',       'taskNumber',   uniq(rows.map((r) => r.taskNumber)).sort((a, b) => a - b))}
      {sel(200, 'メソッドID',     'methodId',     uniq(rows.map((r) => r.methodId)))}
      {sel(160, 'トランジション', 'transitionId', uniq(rows.map((r) => r.transitionId)))}
      {sel(190, 'テンプレート名', 'templateName', uniq(rows.map((r) => r.templateName)))}
      {sel(160, 'Key',            'propKey',      uniq(rows.map((r) => r.propKey)))}
      <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
        {filtered}/{total}行
      </Text>
    </Flex>
  );
};

// ─────────────────────────────────────────────────────────────
// メインコンポーネント
// ─────────────────────────────────────────────────────────────

const ExperimentInstructionTab: React.FC<ExperimentInstructionTabProps> = ({
  projectId,
  projectName,
}) => {
  const { message } = App.useApp();

  // ── データ ──
  const [instructions, setInstructions] = useState<InstructionMethodResponse[]>([]);
  const [methods, setMethods]           = useState<ProjectMethod[]>([]);
  const [loading, setLoading]           = useState(false);

  // ── フィルタ ──
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTER);

  // ── 承認 / NG モーダル ──
  const [approveTarget, setApproveTarget] = useState<FlatRow | null>(null);
  const [ngTarget, setNgTarget]           = useState<FlatRow | null>(null);
  const [ngForm]                          = Form.useForm<{ ngReason: string }>();
  const [actionLoading, setActionLoading] = useState(false);

  // ── 承認処理ダイアログ ──
  const [bulkApproveOpen, setBulkApproveOpen]         = useState(false);
  /** 選択中のタスクキー（`methodId__taskNumber` 形式） */
  const [bulkSelectedTaskKey, setBulkSelectedTaskKey] = useState<string | null>(null);
  /** 操作選択（デフォルト: 'approve'） */
  const [bulkSelectedAction, setBulkSelectedAction]   = useState<'approve' | 'ng'>('approve');
  /** NG理由 */
  const [bulkSelectedNgReason, setBulkSelectedNgReason] = useState<string>('');

  // ── ExperimentPlanDialog ──
  const [planDialogOpen, setPlanDialogOpen]       = useState(false);
  const [planDialogMethodId, setPlanDialogMethodId] = useState<string>('');

  // ── 列カスタマイズ ──
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>([...ALL_COLUMN_KEYS]);
  const [columnDropdownOpen, setColumnDropdownOpen] = useState(false);

  // ── ペトリネットビューア（ViewRendererDialog）──
  const [viewerDialogs, setViewerDialogs] = useState<{
    id: string;
    file: ProjectFile;
    zIndex: number;
  }[]>([]);

  // ─────────────────────────────────────────────────────────
  // データ取得
  // ─────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [instData, methodData] = await Promise.all([
        getExperimentInstructions(projectId),
        getProjectMethods(projectId),
      ]);
      setInstructions(instData);
      setMethods(methodData);
    } catch (err) {
      console.error('[ExperimentInstructionTab] fetchData error:', err);
      message.error('実験指示データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [projectId, message]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─────────────────────────────────────────────────────────
  // フラット化 & フィルタ適用
  // ─────────────────────────────────────────────────────────

  const allRows = useMemo(() => flattenInstructions(instructions), [instructions]);

  const filteredRows = useMemo(() => {
    return allRows.filter((r) => {
      if (filters.taskNumber   !== null && r.taskNumber   !== filters.taskNumber)   return false;
      if (filters.methodId     !== null && r.methodId     !== filters.methodId)     return false;
      if (filters.transitionId !== null && r.transitionId !== filters.transitionId) return false;
      if (filters.templateName !== null && r.templateName !== filters.templateName) return false;
      if (filters.propKey      !== null && r.propKey      !== filters.propKey)      return false;
      return true;
    });
  }, [allRows, filters]);

  // ─────────────────────────────────────────────────────────
  // レビュー待ちタスク（一括承認対象）
  // ─────────────────────────────────────────────────────────

  /**
   * allRows からレビュー待ち（'04'）の methodId + taskNumber の組み合わせを
   * 重複排除して抽出する
   */
  const reviewWaitingTasks = useMemo(() => {
    const seen = new Set<string>();
    const result: { methodId: string; methodName: string; taskNumber: number; taskStatus: string }[] = [];
    allRows.forEach((r) => {
      if (r.taskStatus !== '04') return;
      const key = `${r.methodId}__${r.taskNumber}`;
      if (seen.has(key)) return;
      seen.add(key);
      result.push({ methodId: r.methodId, methodName: r.methodName, taskNumber: r.taskNumber, taskStatus: r.taskStatus });
    });
    return result.sort((a, b) => a.taskNumber - b.taskNumber);
  }, [allRows]);

  // ─────────────────────────────────────────────────────────
  // 承認処理ダイアログを開く
  // ─────────────────────────────────────────────────────────

  const handleOpenBulkApproveDialog = useCallback(() => {
    // ダイアログを開くときに選択状態をリセット
    setBulkSelectedTaskKey(null);
    setBulkSelectedAction('approve');
    setBulkSelectedNgReason('');
    setBulkApproveOpen(true);
  }, []);

  // ─────────────────────────────────────────────────────────
  // 承認処理ダイアログ: 選択実行
  // ─────────────────────────────────────────────────────────

  const handleBulkExecute = useCallback(async () => {
    if (!bulkSelectedTaskKey) {
      message.warning('タスク番号を選択してください');
      return;
    }
    if (bulkSelectedAction === 'ng' && !bulkSelectedNgReason.trim()) {
      message.warning('NG理由を入力してください');
      return;
    }

    const [methodId, taskNumberStr] = bulkSelectedTaskKey.split('__');
    const taskNumber = Number(taskNumberStr);

    setActionLoading(true);
    try {
      if (bulkSelectedAction === 'ng') {
        await recordNg(projectId, methodId, taskNumber, { ngReason: bulkSelectedNgReason });
        message.warning(`タスク #${taskNumber} に NG を記録しました`);
      } else {
        await approveTask(projectId, methodId, taskNumber);
        message.success(`タスク #${taskNumber} を承認しました`);
      }
      setBulkApproveOpen(false);
      await fetchData();
    } catch (err) {
      console.error('[ExperimentInstructionTab] bulkExecute error:', err);
      message.error('承認処理に失敗しました');
    } finally {
      setActionLoading(false);
    }
  }, [bulkSelectedTaskKey, bulkSelectedAction, bulkSelectedNgReason, projectId, fetchData, message]);

  // ─────────────────────────────────────────────────────────
  // 承認処理
  // ─────────────────────────────────────────────────────────

  const handleApprove = useCallback(async () => {
    if (!approveTarget) return;
    setActionLoading(true);
    try {
      await approveTask(projectId, approveTarget.methodId, approveTarget.taskNumber);
      message.success(`タスク #${approveTarget.taskNumber} を承認しました`);
      setApproveTarget(null);
      await fetchData();
    } catch (err) {
      console.error('[ExperimentInstructionTab] approveTask error:', err);
      message.error('承認処理に失敗しました');
    } finally {
      setActionLoading(false);
    }
  }, [approveTarget, projectId, fetchData, message]);

  // ─────────────────────────────────────────────────────────
  // NG記録処理
  // ─────────────────────────────────────────────────────────

  const handleNg = useCallback(async () => {
    if (!ngTarget) return;
    try {
      const values = await ngForm.validateFields();
      setActionLoading(true);
      await recordNg(projectId, ngTarget.methodId, ngTarget.taskNumber, {
        ngReason: values.ngReason,
      });
      message.warning(`タスク #${ngTarget.taskNumber} に NG を記録しました`);
      ngForm.resetFields();
      setNgTarget(null);
      await fetchData();
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return; // バリデーションエラーは無視
      console.error('[ExperimentInstructionTab] recordNg error:', err);
      message.error('NG記録処理に失敗しました');
    } finally {
      setActionLoading(false);
    }
  }, [ngTarget, projectId, ngForm, fetchData, message]);

  // ─────────────────────────────────────────────────────────
  // ExperimentPlanDialog を開く
  // ─────────────────────────────────────────────────────────

  const handleOpenPlanDialog = useCallback((methodId?: string) => {
    const targetMethodId = methodId ?? methods[0]?.id ?? '';
    setPlanDialogMethodId(targetMethodId);
    setPlanDialogOpen(true);
  }, [methods]);

  // ─────────────────────────────────────────────────────────
  // ペトリネットビューアを開く / 閉じる / フォーカス
  // ─────────────────────────────────────────────────────────

  const handleOpenPetriNetViewer = useCallback(() => {
    if (!projectName) return;
    const file: ProjectFile = {
      id: `${projectName}.maiml`,
      name: `${projectName}.maiml`,
      path: `${projectName}/${projectName}.maiml`,
      size: 0,
      lastModified: '',
      type: 'maiml',
    };
    setViewerDialogs((prev) => [
      ...prev,
      { id: `viewer_${Date.now()}`, file, zIndex: 1000 + prev.length },
    ]);
  }, [projectName]);

  const handleCloseViewer = useCallback((id: string) => {
    setViewerDialogs((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const handleFocusViewer = useCallback((id: string) => {
    setViewerDialogs((prev) => {
      const maxZ = Math.max(...prev.map((d) => d.zIndex), 999);
      return prev.map((d) => (d.id === id ? { ...d, zIndex: maxZ + 1 } : d));
    });
  }, []);

  // ─────────────────────────────────────────────────────────
  // テーブルカラム全定義
  // ─────────────────────────────────────────────────────────

  /** 全列の定義（固定列 + 切替可能列をすべて含む） */
  const allColumnDefs: ColumnsType<FlatRow> = useMemo(() => [
    // ──── 切替可能列 ────
    {
      key: 'methodName',
      title: 'メソッド名',
      dataIndex: 'methodName',
      width: 190,
      ellipsis: { showTitle: false },
      render: (v: string, r: FlatRow) => {
        const display = v || r.methodId;
        return (
          <Tooltip title={display} placement="topLeft">
            <Text style={{ fontSize: 12 }}>{display}</Text>
          </Tooltip>
        );
      },
    },
    // ──── 固定列（常に表示） ────
    {
      key: 'taskNumber',
      title: 'タスクNo',
      dataIndex: 'taskNumber',
      width: 80,
      align: 'center' as const,
      sorter: (a, b) => a.taskNumber - b.taskNumber,
      render: (v: number) => <Text strong>#{v}</Text>,
    },
    // ──── 切替可能列（続き） ────
    {
      key: 'taskStatus',
      title: <span style={{ whiteSpace: 'normal', wordBreak: 'keep-all', textAlign: 'center', display: 'block' }}>タスク<br />ステータス</span>,
      dataIndex: 'taskStatus',
      width: 110,
      align: 'center' as const,
      render: (v: string) => {
        const cfg = TASK_STATUS_CONFIG[v] ?? { label: v, color: 'default' };
        return <Tag color={cfg.color} style={{ margin: 0 }}>{cfg.label}</Tag>;
      },
    },
    {
      key: 'transitionName',
      title: 'トランジション名',
      dataIndex: 'transitionName',
      width: 180,
      ellipsis: { showTitle: false },
      render: (v: string, r: FlatRow) => {
        const display = v || r.transitionId;
        return (
          <Tooltip title={display} placement="topLeft">
            <Text style={{ fontSize: 12 }}>{display}</Text>
          </Tooltip>
        );
      },
    },
    {
      key: 'templateName',
      title: 'テンプレート名',
      dataIndex: 'templateName',
      width: 180,
      ellipsis: { showTitle: false },
      render: (v: string) => (
        <Tooltip title={v} placement="topLeft">
          <Text style={{ fontSize: 12 }}>{v}</Text>
        </Tooltip>
      ),
    },
    // ──── 固定列（常に表示） ────
    {
      key: 'propKey',
      title: 'Key',
      dataIndex: 'propKey',
      width: 160,
      ellipsis: { showTitle: false },
      render: (v: string) => (
        <Tooltip title={v} placement="topLeft">
          <Text code style={{ fontSize: 11 }}>{v}</Text>
        </Tooltip>
      ),
    },
    {
      key: 'xsiType',
      title: 'xsi:type',
      dataIndex: 'xsiType',
      width: 75,
      align: 'center' as const,
      render: (v: string) => (
        <Tooltip title={v}>
          <Tag color={XSI_TYPE_COLOR[v] ?? 'default'} style={{ fontSize: 11, margin: 0 }}>
            {XSI_TYPE_SHORT[v] ?? v}
          </Tag>
        </Tooltip>
      ),
    },
    {
      key: 'expected',
      title: '想定値',
      dataIndex: 'expected',
      width: 100,
      align: 'right' as const,
      render: (v: number | string | null, r: FlatRow) => (
        <Text>{v !== null ? `${v}${r.unit ? ` ${r.unit}` : ''}` : '—'}</Text>
      ),
    },
    {
      key: 'expectedAverage',
      title: <span style={{ whiteSpace: 'nowrap' }}>想定値（平均）</span>,
      dataIndex: 'expectedAverage',
      width: 120,
      align: 'right' as const,
      render: (v: number | null, r: FlatRow) =>
        v !== null
          ? <Text type="secondary">{v}{r.unit ? ` ${r.unit}` : ''}</Text>
          : <Text type="secondary">—</Text>,
    },
    {
      key: 'actual',
      title: '実績値',
      width: 100,
      align: 'right' as const,
      render: (_: unknown, r: FlatRow) => <ActualCell actual={r.actual} unit={r.unit} />,
    },
    {
      key: 'actualAverage',
      title: <span style={{ whiteSpace: 'nowrap' }}>実績値（平均）</span>,
      dataIndex: 'actualAverage',
      width: 120,
      align: 'right' as const,
      render: (v: number | null, r: FlatRow) =>
        v !== null
          ? <Text type="secondary">{v}{r.unit ? ` ${r.unit}` : ''}</Text>
          : <Text type="secondary" italic>未記録</Text>,
    },
    {
      key: 'diff',
      title: '差分',
      width: 85,
      align: 'right' as const,
      render: (_: unknown, r: FlatRow) => <DiffCell expected={r.expected} actual={r.actual} />,
    },
    {
      key: 'uncertaintyCriteriaName',
      title: '不確かさ基準名',
      dataIndex: 'uncertaintyCriteriaName',
      width: 200,
      ellipsis: { showTitle: false },
      render: (v: string | null, r: FlatRow) => {
        if (!v) return <Text type="secondary">—</Text>;
        const typeTag = r.uncertaintyCriteriaType === 'qualitative'
          ? <Tag color="green"  style={{ margin: '0 4px 0 0', fontSize: 10 }}>定性</Tag>
          : r.uncertaintyCriteriaType === 'quantitative'
          ? <Tag color="blue"   style={{ margin: '0 4px 0 0', fontSize: 10 }}>定量</Tag>
          : null;
        return (
          <Tooltip title={v} placement="topLeft">
            <span style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'nowrap' }}>
              {typeTag}
              <Text style={{ fontSize: 12 }}>{v}</Text>
            </span>
          </Tooltip>
        );
      },
    },
    {
      key: 'uncertaintyAssignedValue',
      title: <span style={{ whiteSpace: 'nowrap' }}>不確かさ値</span>,
      dataIndex: 'uncertaintyAssignedValue',
      width: 140,
      render: (v: string | null) =>
        v ? <Text style={{ fontSize: 12 }}>{v}</Text> : <Text type="secondary">—</Text>,
    },
    {
      key: 'uncertaintyAssignedBy',
      title: <span style={{ whiteSpace: 'nowrap' }}>実験記録者</span>,
      dataIndex: 'uncertaintyAssignedBy',
      width: 140,
      render: (v: string | null) =>
        v ? <Text style={{ fontSize: 12 }}>{v}</Text> : <Text type="secondary">—</Text>,
    },
    {
      key: 'uncertaintyAssignedAt',
      title: <span style={{ whiteSpace: 'nowrap' }}>不確かさ付与日時</span>,
      dataIndex: 'uncertaintyAssignedAt',
      width: 160,
      render: (v: string | null) => {
        if (!v) return <Text type="secondary">—</Text>;
        const d = new Date(v);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return <Text style={{ fontSize: 11 }}>{`${yyyy}/${mm}/${dd} ${hh}:${min}`}</Text>;
      },
    },
    {
      key: 'uncertaintyComment',
      title: <span style={{ whiteSpace: 'nowrap' }}>不確かさについてのコメント</span>,
      dataIndex: 'uncertaintyComment',
      width: 220,
      ellipsis: { showTitle: false },
      render: (v: string | null) =>
        v ? (
          <Tooltip title={v} placement="topLeft">
            <Text style={{ fontSize: 12 }}>{v}</Text>
          </Tooltip>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  /**
   * visibleColumnKeys に応じてフィルタリングされたカラム配列
   * 固定列は常に含め、切替可能列のみ表示/非表示を切り替える
   */
  const columns = useMemo(() => {
    return allColumnDefs.filter((col) => {
      const key = col.key as string;
      if ((FIXED_COLUMN_KEYS as readonly string[]).includes(key)) return true;
      return visibleColumnKeys.includes(key);
    });
  }, [allColumnDefs, visibleColumnKeys]);

  /**
   * 表示中の列幅合計（固定列 + 可視切替列）
   * 列の表示/非表示に応じて横スクロール幅を動的に調整する
   */
  const scrollX = useMemo(() => {
    // 固定列の幅: taskNumber(80) + propKey(160)
    const FIXED_WIDTH = 80 + 160;
    const toggleableWidth = TOGGLEABLE_COLUMN_DEFS
      .filter(({ key }) => visibleColumnKeys.includes(key))
      .reduce((sum, { width }) => sum + width, 0);
    return FIXED_WIDTH + toggleableWidth;
  }, [visibleColumnKeys]);

  /** 列カスタマイズ Dropdown のメニューアイテム */
  const columnMenuItems: MenuProps['items'] = useMemo(() => [
    ...TOGGLEABLE_COLUMN_DEFS.map(({ key, label }) => ({
      key,
      label: (
        <span
          style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            setVisibleColumnKeys((prev) =>
              prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
            );
          }}
        >
          <input type="checkbox" readOnly checked={visibleColumnKeys.includes(key)} style={{ cursor: 'pointer' }} />
          {label}
        </span>
      ),
    })),
    { type: 'divider' as const },
    {
      key: '__reset__',
      label: (
        <Text type="secondary" style={{ fontSize: 12 }}>
          デフォルトに戻す
        </Text>
      ),
      onClick: () => setVisibleColumnKeys([...ALL_COLUMN_KEYS]),
    },
  ], [visibleColumnKeys]);

  // ─────────────────────────────────────────────────────────
  // レンダリング
  // ─────────────────────────────────────────────────────────

  return (
    <Flex vertical style={{ height: '100%' }}>
      {/* ── ツールバー ── */}
      <Flex gap={8} align="center" style={{ padding: '4px 0 6px' }}>
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleOpenPlanDialog(filters.methodId ?? undefined)}
        >
          実験指示を編集
        </Button>
        <Button
          size="small"
          icon={<FileSearchOutlined />}
          onClick={handleOpenPetriNetViewer}
          disabled={!projectName}
        >
          ペトリネットを表示
        </Button>
        <Dropdown
          menu={{ items: columnMenuItems }}
          trigger={['click']}
          open={columnDropdownOpen}
          onOpenChange={setColumnDropdownOpen}
          placement="bottomRight"
        >
          <Button size="small" icon={<SettingOutlined />}>
            列を選択 ▾
          </Button>
        </Dropdown>
        <Button
          size="small"
          type="primary"
          icon={<CheckCircleOutlined />}
          disabled={reviewWaitingTasks.length === 0}
          onClick={handleOpenBulkApproveDialog}
        >
          承認処理
        </Button>
      </Flex>

      {/* ── フィルタバー ── */}
      <FilterBar
        filters={filters}
        rows={allRows}
        total={allRows.length}
        filtered={filteredRows.length}
        onChange={(partial) => setFilters((prev) => ({ ...prev, ...partial }))}
      />

      {/* ── テーブル ── */}
      <style>{`
        .experiment-instruction-table .ant-table-thead > tr > th {
          text-align: center !important;
        }
      `}</style>
      <div className="experiment-instruction-table" style={{ flex: 1, overflow: 'hidden' }}>
        {loading ? (
          <Flex justify="center" align="center" style={{ height: 200 }}>
            <Spin tip="読み込み中..." />
          </Flex>
        ) : allRows.length === 0 ? (
          <Empty
            description="実験指示データがありません"
            style={{ marginTop: 60 }}
          />
        ) : (
          <Table<FlatRow>
            dataSource={filteredRows}
            columns={columns}
            rowKey="rowKey"
            size="small"
            pagination={false}
            bordered
            scroll={{ x: scrollX, y: 'calc(100vh - 360px)' }}
            style={{ fontSize: 12 }}
            rowClassName={(r) => r.taskStatus === '04' ? 'row-review-waiting' : ''}
          />
        )}
      </div>

      {/* ── 承認確認モーダル ── */}
      <Modal
        title="タスクを承認しますか？"
        open={approveTarget !== null}
        onOk={handleApprove}
        onCancel={() => setApproveTarget(null)}
        okText="承認"
        cancelText="キャンセル"
        okButtonProps={{ loading: actionLoading }}
        destroyOnClose
      >
        {approveTarget && (
          <Space direction="vertical" size={4}>
            <Text>以下のタスクを「完了」に更新します。</Text>
            <Text strong>タスク #{approveTarget.taskNumber}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              メソッド: {approveTarget.methodName} ({approveTarget.methodId})
            </Text>
          </Space>
        )}
      </Modal>

      {/* ── NG記録モーダル ── */}
      <Modal
        title="NG を記録しますか？"
        open={ngTarget !== null}
        onOk={handleNg}
        onCancel={() => { setNgTarget(null); ngForm.resetFields(); }}
        okText="NG記録"
        cancelText="キャンセル"
        okButtonProps={{ danger: true, loading: actionLoading }}
        destroyOnClose
      >
        {ngTarget && (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Text>以下のタスクを「NG」に更新します。</Text>
            <Text strong>タスク #{ngTarget.taskNumber}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              メソッド: {ngTarget.methodName} ({ngTarget.methodId})
            </Text>
            <Form form={ngForm} layout="vertical">
              <Form.Item
                name="ngReason"
                label="NG理由"
                rules={[{ required: true, message: 'NG理由を入力してください' }]}
              >
                <TextArea rows={3} placeholder="NG理由を入力してください" maxLength={500} showCount />
              </Form.Item>
            </Form>
          </Space>
        )}
      </Modal>

      {/* ── 承認処理ダイアログ ── */}
      <Modal
        title="承認処理"
        open={bulkApproveOpen}
        onOk={handleBulkExecute}
        onCancel={() => setBulkApproveOpen(false)}
        okText="実行"
        cancelText="キャンセル"
        okButtonProps={{ loading: actionLoading, disabled: !bulkSelectedTaskKey }}
        width={480}
        destroyOnClose
      >
        <Space direction="vertical" size={16} style={{ width: '100%', paddingTop: 8 }}>
          {/* ── タスク番号 + 操作 ── */}
          <Flex gap={12} align="center" wrap="wrap">
            <Text style={{ whiteSpace: 'nowrap' }}>タスク番号:</Text>
            <Select
              placeholder="タスク番号を選択"
              style={{ width: 160 }}
              value={bulkSelectedTaskKey}
              onChange={(v) => setBulkSelectedTaskKey(v ?? null)}
              options={reviewWaitingTasks.map((t) => ({
                label: `#${t.taskNumber}`,
                value: `${t.methodId}__${t.taskNumber}`,
              }))}
              popupMatchSelectWidth={false}
            />
            <Radio.Group
              value={bulkSelectedAction}
              onChange={(e) => {
                setBulkSelectedAction(e.target.value as 'approve' | 'ng');
                if (e.target.value === 'approve') setBulkSelectedNgReason('');
              }}
            >
              <Radio value="approve">承認</Radio>
              <Radio value="ng">NG</Radio>
            </Radio.Group>
          </Flex>
          {/* ── NG理由（NG選択時のみ表示） ── */}
          {bulkSelectedAction === 'ng' && (
            <Form layout="vertical" style={{ marginBottom: 0 }}>
              <Form.Item
                label="NG理由"
                required
                style={{ marginBottom: 0 }}
              >
                <Input.TextArea
                  rows={3}
                  placeholder="NG理由を入力してください（必須）"
                  maxLength={500}
                  showCount
                  value={bulkSelectedNgReason}
                  onChange={(e) => setBulkSelectedNgReason(e.target.value)}
                  style={{ fontSize: 12 }}
                />
              </Form.Item>
            </Form>
          )}
        </Space>
      </Modal>

      {/* ── ExperimentPlanDialog（実験指示編集） ── */}
      {planDialogOpen && (
        <ExperimentPlanDialog
          open={planDialogOpen}
          projectId={projectId}
          methodId={planDialogMethodId}
          taskNumbers={
            uniq(
              (instructions.find((m) => m.methodId === planDialogMethodId)?.tasks ?? [])
                .map((t) => t.taskNo)
            ).sort((a, b) => a - b)
          }
          allowMethodSelection
          methodOptions={methods.map((m) => ({ id: m.id, name: m.name ?? m.id }))}
          onMethodChange={(newMethodId) => {
            setPlanDialogMethodId(newMethodId);
          }}
          onClose={() => setPlanDialogOpen(false)}
          onSave={() => {
            setPlanDialogOpen(false);
            fetchData();
          }}
        />
      )}

      {/* ── ペトリネットビューア（ViewRendererDialog / フローティング） ── */}
      {viewerDialogs.map((dialog) => (
        <ViewRendererDialog
          key={dialog.id}
          id={dialog.id}
          contentType="file"
          file={dialog.file}
          zIndex={dialog.zIndex}
          onClose={handleCloseViewer}
          onFocus={handleFocusViewer}
        />
      ))}
    </Flex>
  );
};

export default ExperimentInstructionTab;
