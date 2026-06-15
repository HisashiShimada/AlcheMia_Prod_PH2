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
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  FilterOutlined,
  EditOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import ExperimentPlanDialog from './ExperimentPlanDialog';
import {
  getExperimentInstructions,
  getProjectMethods,
  approveTask,
  recordNg,
} from '@/services/experimentInstructionApiService';
import type {
  ExperimentInstruction,
  ProjectMethod,
} from '@/types/experimentInstruction';

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
// ユーティリティ
// ─────────────────────────────────────────────────────────────

function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/** ExperimentInstruction[] をフラットな FlatRow[] に変換 */
function flattenInstructions(instructions: ExperimentInstruction[]): FlatRow[] {
  const rows: FlatRow[] = [];
  instructions.forEach((inst) => {
    inst.properties.forEach((prop, idx) => {
      rows.push({
        rowKey: `${inst.methodId}_${inst.taskNumber}_${inst.transitionId}_${inst.templateName}_${prop.key}_${idx}`,
        methodId:      inst.methodId,
        methodName:    inst.methodName,
        taskNumber:    inst.taskNumber,
        taskStatus:    inst.taskStatus,
        transitionId:  inst.transitionId,
        transitionName: inst.transitionName,
        templateName:  inst.templateName,
        propKey:       prop.key,
        propLabel:     prop.label,
        xsiType:       prop.xsiType,
        expected:      prop.expected,
        actual:        prop.actual,
        unit:          prop.unit,
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
  const [instructions, setInstructions] = useState<ExperimentInstruction[]>([]);
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
  // テーブルカラム定義
  // ─────────────────────────────────────────────────────────

  const columns: ColumnsType<FlatRow> = useMemo(() => [
    {
      title: 'タスクNo',
      dataIndex: 'taskNumber',
      width: 80,
      align: 'center' as const,
      sorter: (a, b) => a.taskNumber - b.taskNumber,
      render: (v: number) => <Text strong>#{v}</Text>,
    },
    {
      title: 'メソッドID',
      dataIndex: 'methodId',
      width: 190,
      ellipsis: { showTitle: false },
      render: (v: string) => (
        <Tooltip title={v} placement="topLeft">
          <Text code style={{ fontSize: 11 }}>{v}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'トランジションID',
      dataIndex: 'transitionId',
      width: 180,
      ellipsis: { showTitle: false },
      render: (v: string) => (
        <Tooltip title={v} placement="topLeft">
          <Text code style={{ fontSize: 11 }}>{v}</Text>
        </Tooltip>
      ),
    },
    {
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
      title: '想定値',
      dataIndex: 'expected',
      width: 100,
      align: 'right' as const,
      render: (v: number | string | null, r: FlatRow) => (
        <Text>{v !== null ? `${v}${r.unit ? ` ${r.unit}` : ''}` : '—'}</Text>
      ),
    },
    {
      title: '実績値',
      width: 100,
      align: 'right' as const,
      render: (_: unknown, r: FlatRow) => <ActualCell actual={r.actual} unit={r.unit} />,
    },
    {
      title: '差分',
      width: 85,
      align: 'right' as const,
      render: (_: unknown, r: FlatRow) => <DiffCell expected={r.expected} actual={r.actual} />,
    },
    {
      title: 'ステータス',
      dataIndex: 'taskStatus',
      width: 110,
      align: 'center' as const,
      render: (v: string) => {
        const cfg = TASK_STATUS_CONFIG[v] ?? { label: v, color: 'default' };
        return <Tag color={cfg.color} style={{ margin: 0 }}>{cfg.label}</Tag>;
      },
    },
    {
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
              instructions
                .filter((i) => i.methodId === planDialogMethodId)
                .map((i) => i.taskNumber)
            ).sort((a, b) => a - b)
          }
          allowMethodSelection
          methodOptions={methods}
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
    </Flex>
  );
};

export default ExperimentInstructionTab;
