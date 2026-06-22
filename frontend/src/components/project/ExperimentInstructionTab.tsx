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
  Checkbox,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  FilterOutlined,
  EditOutlined,
  MoreOutlined,
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
  actual: number | string | null;
  unit: string;
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
const FIXED_COLUMN_KEYS = ['taskNumber', 'propKey', 'actions'] as const;

/** 切替可能な列の定義 */
const TOGGLEABLE_COLUMN_DEFS: { key: string; label: string }[] = [
  { key: 'methodName',    label: 'メソッド名' },
  { key: 'transitionName', label: 'トランジション名' },
  { key: 'templateName', label: 'テンプレート名' },
  { key: 'xsiType',      label: 'xsi:type' },
  { key: 'expected',     label: '想定値' },
  { key: 'actual',       label: '実績値' },
  { key: 'diff',         label: '差分' },
  { key: 'taskStatus',   label: 'ステータス' },
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
            actual:        field.actualValue,
            unit:          field.unit ?? '',
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
      key: 'actual',
      title: '実績値',
      width: 100,
      align: 'right' as const,
      render: (_: unknown, r: FlatRow) => <ActualCell actual={r.actual} unit={r.unit} />,
    },
    {
      key: 'diff',
      title: '差分',
      width: 85,
      align: 'right' as const,
      render: (_: unknown, r: FlatRow) => <DiffCell expected={r.expected} actual={r.actual} />,
    },
    {
      key: 'taskStatus',
      title: 'ステータス',
      dataIndex: 'taskStatus',
      width: 110,
      align: 'center' as const,
      render: (v: string) => {
        const cfg = TASK_STATUS_CONFIG[v] ?? { label: v, color: 'default' };
        return <Tag color={cfg.color} style={{ margin: 0 }}>{cfg.label}</Tag>;
      },
    },
    // ──── 固定列（常に末尾に表示） ────
    {
      key: 'actions',
      title: '操作',
      width: 60,
      align: 'center' as const,
      render: (_: unknown, r: FlatRow) => {
        if (r.taskStatus !== '04') return <Text type="secondary">—</Text>;
        const menuItems: MenuProps['items'] = [
          {
            key: 'approve',
            label: '承認',
            icon: <CheckOutlined />,
            onClick: () => setApproveTarget(r),
          },
          {
            key: 'ng',
            label: 'NG',
            icon: <CloseOutlined />,
            danger: true,
            onClick: () => setNgTarget(r),
          },
        ];
        return (
          <Dropdown
            menu={{ items: menuItems }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        );
      },
    },
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

  /** 列カスタマイズ Dropdown のメニューアイテム */
  const columnMenuItems: MenuProps['items'] = useMemo(() => [
    ...TOGGLEABLE_COLUMN_DEFS.map(({ key, label }) => ({
      key,
      label: (
        <Checkbox
          checked={visibleColumnKeys.includes(key)}
          onChange={(e) => {
            setVisibleColumnKeys((prev) =>
              e.target.checked ? [...prev, key] : prev.filter((k) => k !== key)
            );
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {label}
        </Checkbox>
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
      <div style={{ flex: 1, overflow: 'hidden' }}>
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
            scroll={{ x: 1200, y: 'calc(100vh - 360px)' }}
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
