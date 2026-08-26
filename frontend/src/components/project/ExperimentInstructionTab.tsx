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
import { useLanguage } from '@/contexts/LanguageContext';
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
import UncertaintyJudgeDetailDialog from './UncertaintyJudgeDetailDialog';
import ViewRendererDialog from '@/components/viewer/ViewRendererDialog';
import {
  getExperimentInstructions,
  getProjectMethods,
  approveTask,
  recordNg,
} from '@/services/experimentInstructionApiService';
import { getProjectMaiml } from '@/services/projectApiService';
import type {
  InstructionMethodResponse,
  ProjectMethod,
  UncertaintyJudgeSummary,
} from '@/types/experimentInstruction';
import type { FileData } from '@/types/editor';

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
  /** 編集権限フラグ。false の場合は変更系ボタンを非活性にする */
  isEditable?: boolean;
  /** プロジェクト完了フラグ。true の場合は変更系ボタンを非活性にする */
  isProjectCompleted?: boolean;
  /** チェックアウト中フラグ。true の場合は変更系ボタンを非活性にする */
  isCheckoutLocked?: boolean;
}

// ─────────────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────────────

/** タスクステータスコード → 表示設定（ラベルは useLanguage で上書きすること） */
const TASK_STATUS_CONFIG: Record<string, { labelKey: string; color: string }> = {
  '01': { labelKey: 'experimentInstruction.status.waiting',       color: 'default'    },
  '02': { labelKey: 'experimentInstruction.status.inProgress',    color: 'processing' },
  '03': { labelKey: 'experimentInstruction.status.running',       color: 'processing' },
  '04': { labelKey: 'experimentInstruction.status.reviewWaiting', color: 'warning'    },
  '05': { labelKey: 'experimentInstruction.status.completed',     color: 'success'    },
  '06': { labelKey: 'experimentInstruction.status.ng',            color: 'error'      },
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
  /**
   * 不確かさ判定結果一覧（experiment_uncertainty_judge から取得）。
   * 0件 = 未判定、1件以上 = 判定済み
   */
  uncertaintyJudges: UncertaintyJudgeSummary[];
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
const TOGGLEABLE_COLUMN_KEYS_AND_WIDTHS: { key: string; labelKey: string; width: number }[] = [
  { key: 'taskStatus',                  labelKey: 'experimentInstructionTab.col.taskStatus',               width: 110 },
  { key: 'methodName',                  labelKey: 'experimentInstructionTab.col.methodName',               width: 190 },
  { key: 'transitionName',              labelKey: 'experimentInstructionTab.col.transitionName',           width: 180 },
  { key: 'templateName',                labelKey: 'experimentInstructionTab.col.templateName',             width: 180 },
  { key: 'xsiType',                     labelKey: 'experimentInstructionTab.col.xsiType',                  width:  75 },
  { key: 'expected',                    labelKey: 'experimentInstructionTab.col.expected',                 width: 100 },
  { key: 'expectedAverage',             labelKey: 'experimentInstructionTab.col.expectedAverage',          width: 120 },
  { key: 'actual',                      labelKey: 'experimentInstructionTab.col.actual',                   width: 100 },
  { key: 'actualAverage',               labelKey: 'experimentInstructionTab.col.actualAverage',            width: 120 },
  { key: 'diff',                        labelKey: 'experimentInstructionTab.col.diff',                     width:  85 },
  { key: 'uncertaintyJudge',            labelKey: 'experimentInstructionTab.col.uncertaintyJudge',         width: 200 },
];

/** デフォルトで表示するすべての列キー */
const ALL_COLUMN_KEYS = TOGGLEABLE_COLUMN_KEYS_AND_WIDTHS.map((d) => d.key);

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
  methods.forEach((method) => {
    method.tasks.forEach((task) => {
      const taskStatusStr = toTaskStatusStr(task.taskStatus);
      task.templates.forEach((tmpl) => {
        tmpl.fields.forEach((field, idx) => {
          rows.push({
            rowKey: `${method.methodId}_${task.taskNo}_${tmpl.templateId}_${field.key}_${idx}`,
            methodId:      method.methodId,
            methodName:    method.methodId,
            taskNumber:    task.taskNo,
            taskStatus:    taskStatusStr,
            transitionId:  '',
            transitionName: '',
            templateName:  tmpl.templateName ?? tmpl.templateId,
            propKey:       field.key,
            propLabel:     field.label,
            xsiType:       field.xsiType ?? '',
            expected:      field.plannedValue,
            expectedAverage: calcGroupAverage(methods, method.methodId, tmpl.templateId, field.key, 'plannedValue'),
            actual:        field.actualValue,
            actualAverage: calcGroupAverage(methods, method.methodId, tmpl.templateId, field.key, 'actualValue'),
            unit:          field.unit ?? '',
            uncertaintyJudges: field.uncertaintyJudges ?? [],
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

const ActualCell: React.FC<{ actual: number | string | null; unit: string; t: (key: string) => string }> = ({ actual, unit, t }) => {
  if (actual === null) return <Text type="secondary" italic>{t('experimentInstructionTab.cell.noRecord')}</Text>;
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
  t: (key: string) => string;
}

const FilterBar: React.FC<FilterBarProps> = ({ filters, rows, total, filtered, onChange, t }) => {
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
      {sel(70,  t('experimentInstructionTab.filter.taskNumber'),    'taskNumber',   uniq(rows.map((r) => r.taskNumber)).sort((a, b) => a - b))}
      {sel(200, t('experimentInstructionTab.filter.methodId'),      'methodId',     uniq(rows.map((r) => r.methodId)))}
      {sel(160, t('experimentInstructionTab.filter.transitionId'),  'transitionId', uniq(rows.map((r) => r.transitionId)))}
      {sel(190, t('experimentInstructionTab.filter.templateName'),  'templateName', uniq(rows.map((r) => r.templateName)))}
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
  isEditable = true,
  isProjectCompleted = false,
  isCheckoutLocked = false,
}) => {
  const { message } = App.useApp();
  const { t } = useLanguage();

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
  /** 選択中のメソッドID（表示用） */
  const [bulkSelectedMethodId, setBulkSelectedMethodId] = useState<string | null>(null);
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
    file: FileData;
    fileContent: string | null;
    zIndex: number;
  }[]>([]);
  const [petriNetViewerLoading, setPetriNetViewerLoading] = useState(false);

  // ── 不確かさ判定詳細ダイアログ ──
  const [judgeDetailOpen, setJudgeDetailOpen] = useState(false);
  const [judgeDetailRow, setJudgeDetailRow] = useState<FlatRow | null>(null);

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
      message.error(t('experimentInstruction.fetchError'));
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
    setBulkSelectedMethodId(null);
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
      message.warning(t('experimentInstruction.warningSelectTask'));
      return;
    }
    if (bulkSelectedAction === 'ng' && !bulkSelectedNgReason.trim()) {
      message.warning(t('experimentInstruction.ngReasonRequired'));
      return;
    }

    const [methodId, taskNumberStr] = bulkSelectedTaskKey.split('__');
    const taskNumber = Number(taskNumberStr);

    setActionLoading(true);
    try {
      if (bulkSelectedAction === 'ng') {
        await recordNg(projectId, methodId, taskNumber, { ngReason: bulkSelectedNgReason });
        message.warning(t('experimentInstruction.ngRecorded').replace('#{no}', String(taskNumber)));
      } else {
        await approveTask(projectId, methodId, taskNumber);
        message.success(t('experimentInstruction.approveSuccess').replace('#{no}', String(taskNumber)));
      }
      setBulkApproveOpen(false);
      await fetchData();
    } catch (err) {
      console.error('[ExperimentInstructionTab] bulkExecute error:', err);
      message.error(t('experimentInstruction.approveError'));
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
      message.success(t('experimentInstruction.approveSuccess').replace('#{no}', String(approveTarget.taskNumber)));
      setApproveTarget(null);
      await fetchData();
    } catch (err) {
      console.error('[ExperimentInstructionTab] approveTask error:', err);
      message.error(t('experimentInstruction.approveError'));
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
      message.warning(t('experimentInstruction.ngRecorded').replace('#{no}', String(ngTarget.taskNumber)));
      ngForm.resetFields();
      setNgTarget(null);
      await fetchData();
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return; // バリデーションエラーは無視
      console.error('[ExperimentInstructionTab] recordNg error:', err);
      message.error(t('experimentInstruction.ngError'));
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

  const handleOpenPetriNetViewer = useCallback(async () => {
    if (!projectName) return;
    setPetriNetViewerLoading(true);
    try {
      const result = await getProjectMaiml(projectId);
      if (!result.success || !result.data?.maimlContent) {
        message.error(t('experimentInstruction.fetchError'));
        return;
      }
      const { maimlContent, projectName: resolvedName, lastModified } = result.data;
      const file: FileData = {
        id: projectId,
        name: `${resolvedName}.maiml`,
        path: `projects/${resolvedName}/${resolvedName}.maiml`,
        size: maimlContent.length,
        lastModified: lastModified || new Date().toISOString(),
        type: 'maiml',
      };
      setViewerDialogs((prev) => [
        ...prev,
        { id: `viewer_${Date.now()}`, file, fileContent: maimlContent, zIndex: 1000 + prev.length },
      ]);
    } catch (err) {
      console.error('[ExperimentInstructionTab] handleOpenPetriNetViewer error:', err);
      message.error(t('experimentInstruction.fetchError'));
    } finally {
      setPetriNetViewerLoading(false);
    }
  }, [projectId, projectName, message, t]);

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
      title: t('experimentInstructionTab.col.methodName'),
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
      title: t('experimentInstructionTab.col.taskNo'),
      dataIndex: 'taskNumber',
      width: 80,
      align: 'center' as const,
      sorter: (a, b) => a.taskNumber - b.taskNumber,
      render: (v: number) => <Text strong>#{v}</Text>,
    },
    // ──── 切替可能列（続き） ────
    {
      key: 'taskStatus',
      title: <span style={{ whiteSpace: 'normal', wordBreak: 'keep-all', textAlign: 'center', display: 'block' }}>{t('experimentInstructionTab.col.taskStatusLine1')}<br />{t('experimentInstructionTab.col.taskStatusLine2')}</span>,
      dataIndex: 'taskStatus',
      width: 110,
      align: 'center' as const,
      render: (v: string) => {
        const cfg = TASK_STATUS_CONFIG[v] ?? { labelKey: '', color: 'default' };
        return <Tag color={cfg.color} style={{ margin: 0 }}>{cfg.labelKey ? t(cfg.labelKey) : v}</Tag>;
      },
    },
    {
      key: 'transitionName',
      title: t('experimentInstructionTab.col.transitionName'),
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
      title: t('experimentInstructionTab.col.templateName'),
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
      title: t('experimentInstructionTab.col.expected'),
      dataIndex: 'expected',
      width: 100,
      align: 'right' as const,
      render: (v: number | string | null, r: FlatRow) => (
        <Text>{v !== null ? `${v}${r.unit ? ` ${r.unit}` : ''}` : '—'}</Text>
      ),
    },
    {
      key: 'expectedAverage',
      title: <span style={{ whiteSpace: 'nowrap' }}>{t('experimentInstructionTab.col.expectedAverage')}</span>,
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
      title: t('experimentInstructionTab.col.actual'),
      width: 100,
      align: 'right' as const,
      render: (_: unknown, r: FlatRow) => <ActualCell actual={r.actual} unit={r.unit} t={t} />,
    },
    {
      key: 'actualAverage',
      title: <span style={{ whiteSpace: 'nowrap' }}>{t('experimentInstructionTab.col.actualAverage')}</span>,
      dataIndex: 'actualAverage',
      width: 120,
      align: 'right' as const,
      render: (v: number | null, r: FlatRow) =>
        v !== null
          ? <Text type="secondary">{v}{r.unit ? ` ${r.unit}` : ''}</Text>
          : <Text type="secondary" italic>{t('experimentInstructionTab.cell.noRecord')}</Text>,
    },
    {
      key: 'diff',
      title: t('experimentInstructionTab.col.diff'),
      width: 85,
      align: 'right' as const,
      render: (_: unknown, r: FlatRow) => <DiffCell expected={r.expected} actual={r.actual} />,
    },
    {
      key: 'uncertaintyJudge',
      title: <span style={{ whiteSpace: 'nowrap' }}>{t('experimentInstructionTab.col.uncertaintyJudge')}</span>,
      width: 200,
      render: (_: unknown, r: FlatRow) => {
        const judges = r.uncertaintyJudges;
        if (!judges || judges.length === 0) return <Text type="secondary">—</Text>;
        if (judges.length === 1) {
          const j = judges[0];
          return (
            <Flex gap={4} align="center">
              <Tag color={j.judgeResult === '良好' ? 'success' : 'error'} style={{ margin: 0, fontSize: 11 }}>
                {j.judgeResult}
              </Tag>
              <Text type="secondary" style={{ fontSize: 11 }}>{j.instructionKey}</Text>
            </Flex>
          );
        }
        // 複数件: ボタンのみ表示
        return (
          <Button
            size="small"
            type="link"
            style={{ padding: 0, fontSize: 12 }}
            onClick={() => { setJudgeDetailRow(r); setJudgeDetailOpen(true); }}
          >
            {t('experimentInstructionTab.judgeDetailButton', { count: String(judges.length) })}
          </Button>
        );
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [judgeDetailOpen]);

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
    const toggleableWidth = TOGGLEABLE_COLUMN_KEYS_AND_WIDTHS
      .filter(({ key }) => visibleColumnKeys.includes(key))
      .reduce((sum, { width }) => sum + width, 0);
    return FIXED_WIDTH + toggleableWidth;
  }, [visibleColumnKeys]);

  /** 列カスタマイズ Dropdown のメニューアイテム */
  const columnMenuItems: MenuProps['items'] = useMemo(() => [
    ...TOGGLEABLE_COLUMN_KEYS_AND_WIDTHS.map(({ key, labelKey }) => ({
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
          {t(labelKey)}
        </span>
      ),
    })),
    { type: 'divider' as const },
    {
      key: '__reset__',
      label: (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t('experimentInstructionTab.toolbar.resetColumns')}
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
          disabled={!isEditable || isProjectCompleted || isCheckoutLocked}
          onClick={() => handleOpenPlanDialog(filters.methodId ?? undefined)}
        >
          {t('experimentInstructionTab.toolbar.edit')}
        </Button>
        <Button
          size="small"
          icon={<FileSearchOutlined />}
          onClick={handleOpenPetriNetViewer}
          disabled={!projectName}
          loading={petriNetViewerLoading}
        >
          {t('experimentInstructionTab.toolbar.petriNet')}
        </Button>
        <Dropdown
          menu={{ items: columnMenuItems }}
          trigger={['click']}
          open={columnDropdownOpen}
          onOpenChange={setColumnDropdownOpen}
          placement="bottomRight"
        >
          <Button size="small" icon={<SettingOutlined />}>
            {t('experimentInstructionTab.toolbar.selectColumns')}
          </Button>
        </Dropdown>
        <Button
          size="small"
          type="primary"
          icon={<CheckCircleOutlined />}
          disabled={reviewWaitingTasks.length === 0 || !isEditable || isProjectCompleted || isCheckoutLocked}
          onClick={handleOpenBulkApproveDialog}
        >
          {t('experimentInstructionTab.toolbar.approval')}
        </Button>
      </Flex>

      {/* ── フィルタバー ── */}
      <FilterBar
        filters={filters}
        rows={allRows}
        total={allRows.length}
        filtered={filteredRows.length}
        onChange={(partial) => setFilters((prev) => ({ ...prev, ...partial }))}
        t={t}
      />

      {/* ── テーブル ── */}
      <style>{`
        .experiment-instruction-table .ant-table-thead > tr > th {
          text-align: center !important;
        }
      `}</style>
      <div className="experiment-instruction-table" style={{ flex: 1, overflow: 'hidden' }}>
        {loading ? (
          <Flex vertical justify="center" align="center" style={{ height: 200, gap: 8 }}>
            <Spin />
            <span>{t('experimentInstructionTab.loading')}</span>
          </Flex>
        ) : allRows.length === 0 ? (
          <Empty
            description={t('experimentInstructionTab.empty')}
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
        title={t('experimentInstructionTab.approveModal.title')}
        open={approveTarget !== null}
        onOk={handleApprove}
        onCancel={() => setApproveTarget(null)}
        okText={t('experimentInstructionTab.approveModal.ok')}
        cancelText={t('experimentInstructionTab.approveModal.cancel')}
        okButtonProps={{ loading: actionLoading }}
        destroyOnHidden
      >
        {approveTarget && (
          <Space orientation="vertical" size={4}>
            <Text>{t('experimentInstructionTab.approveModal.body')}</Text>
            <Text strong>{t('experimentInstructionTab.approveModal.taskLabel').replace('#{no}', String(approveTarget.taskNumber))}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('experimentInstructionTab.approveModal.methodLabel')}: {approveTarget.methodName} ({approveTarget.methodId})
            </Text>
          </Space>
        )}
      </Modal>

      {/* ── NG記録モーダル ── */}
      <Modal
        title={t('experimentInstructionTab.ngModal.title')}
        open={ngTarget !== null}
        onOk={handleNg}
        onCancel={() => { setNgTarget(null); ngForm.resetFields(); }}
        okText={t('experimentInstructionTab.ngModal.ok')}
        cancelText={t('experimentInstructionTab.ngModal.cancel')}
        okButtonProps={{ danger: true, loading: actionLoading }}
        destroyOnHidden
      >
        {ngTarget && (
          <Space orientation="vertical" size={8} style={{ width: '100%' }}>
            <Text>{t('experimentInstructionTab.ngModal.body')}</Text>
            <Text strong>{t('experimentInstructionTab.ngModal.taskLabel').replace('#{no}', String(ngTarget.taskNumber))}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('experimentInstructionTab.ngModal.methodLabel')}: {ngTarget.methodName} ({ngTarget.methodId})
            </Text>
            <Form form={ngForm} layout="vertical">
              <Form.Item
                name="ngReason"
                label={t('experimentInstructionTab.ngModal.reasonLabel')}
                rules={[{ required: true, message: t('experimentInstructionTab.ngModal.reasonRequired') }]}
              >
                <TextArea rows={3} placeholder={t('experimentInstructionTab.ngModal.reasonPlaceholder')} maxLength={500} showCount />
              </Form.Item>
            </Form>
          </Space>
        )}
      </Modal>

      {/* ── 承認処理ダイアログ ── */}
      <Modal
        title={t('experimentInstructionTab.bulkModal.title')}
        open={bulkApproveOpen}
        onOk={handleBulkExecute}
        onCancel={() => setBulkApproveOpen(false)}
        okText={t('experimentInstructionTab.bulkModal.ok')}
        cancelText={t('experimentInstructionTab.bulkModal.cancel')}
        okButtonProps={{ loading: actionLoading, disabled: !bulkSelectedTaskKey }}
        width={480}
        destroyOnHidden
      >
        <Space orientation="vertical" size={12} style={{ width: '100%', paddingTop: 8 }}>
          {/* ── 1行目: メソッド名 + タスク番号 ── */}
          <Flex gap={8} align="center">
            <Text style={{ whiteSpace: 'nowrap' }}>{t('experimentInstructionTab.bulkMethodLabel')}</Text>
            <Select
              placeholder={t('experimentInstructionTab.bulkMethodPlaceholder')}
              style={{ width: 180 }}
              value={bulkSelectedMethodId}
              onChange={(v) => {
                setBulkSelectedMethodId(v ?? null);
                setBulkSelectedTaskKey(null);
              }}
              options={
                [...new Map(
                  reviewWaitingTasks.map((t) => [t.methodId, t])
                ).values()].map((t) => ({
                  label: t.methodId,
                  value: t.methodId,
                }))
              }
              popupMatchSelectWidth={false}
            />
            <Text style={{ whiteSpace: 'nowrap' }}>{t('experimentInstructionTab.bulkTaskNoLabel')}</Text>
            <Select
              placeholder={t('experimentInstructionTab.bulkTaskNoPlaceholder')}
              style={{ width: 90 }}
              value={bulkSelectedTaskKey}
              onChange={(v) => setBulkSelectedTaskKey(v ?? null)}
              disabled={!bulkSelectedMethodId}
              options={
                reviewWaitingTasks
                  .filter((t) => t.methodId === bulkSelectedMethodId)
                  .map((t) => ({
                    label: `#${t.taskNumber}`,
                    value: `${t.methodId}__${t.taskNumber}`,
                  }))
              }
              popupMatchSelectWidth={false}
            />
          </Flex>
          {/* ── 2行目: 操作を選択 ── */}
          <Flex gap={8} align="center">
            <Text style={{ whiteSpace: 'nowrap' }}>{t('experimentInstructionTab.bulkActionLabel')}</Text>
            <Radio.Group
              value={bulkSelectedAction}
              onChange={(e) => {
                setBulkSelectedAction(e.target.value as 'approve' | 'ng');
                if (e.target.value === 'approve') setBulkSelectedNgReason('');
              }}
            >
              <Radio value="approve"><span style={{ color: '#52c41a' }}>{t('experimentInstructionTab.bulkActionApprove')}</span></Radio>
              <Radio value="ng"><span style={{ color: '#ff4d4f' }}>{t('experimentInstructionTab.bulkActionNg')}</span></Radio>
            </Radio.Group>
          </Flex>
          {/* ── NG理由（NG選択時のみ表示） ── */}
          {bulkSelectedAction === 'ng' && (
            <Form layout="vertical" style={{ marginBottom: 0 }}>
              <Form.Item
                label={t('experimentInstructionTab.ngModal.reasonLabel')}
                required
                style={{ marginBottom: 0 }}
              >
                <Input.TextArea
                  rows={3}
                  placeholder={t('experimentInstructionTab.ngModal.reasonRequiredPlaceholder')}
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

      {/* ── 不確かさ判定詳細ダイアログ ── */}
      {judgeDetailOpen && judgeDetailRow && (
        <UncertaintyJudgeDetailDialog
          open={judgeDetailOpen}
          onClose={() => setJudgeDetailOpen(false)}
          propKey={judgeDetailRow.propKey}
          propLabel={judgeDetailRow.propLabel}
          xsiType={judgeDetailRow.xsiType}
          expected={judgeDetailRow.expected}
          actual={judgeDetailRow.actual}
          uncertaintyJudges={judgeDetailRow.uncertaintyJudges}
        />
      )}

      {/* ── ペトリネットビューア（ViewRendererDialog / フローティング） ── */}
      {viewerDialogs.map((dialog) => (
        <ViewRendererDialog
          key={dialog.id}
          id={dialog.id}
          contentType="file"
          file={dialog.file}
          fileContent={dialog.fileContent}
          zIndex={dialog.zIndex}
          onClose={handleCloseViewer}
          onFocus={handleFocusViewer}
        />
      ))}
    </Flex>
  );
};

export default ExperimentInstructionTab;
