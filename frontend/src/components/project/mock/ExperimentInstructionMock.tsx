'use client';

/**
 * 実験指示タブ モック
 *
 * 画面イメージ確認用の固定データモック。
 *
 * データ構造の前提:
 *   - 同一 MAIML を N 回実行する（タスク1回目・2回目…）
 *   - 基本的にメソッド・テンプレート・プロパティは各タスク共通
 *
 * デザイン方針:
 *   - フラットテーブル（rowSpan なし）でフィルタリングに対応
 *   - タスクNo〜Key まで全項目をセレクト絞り込み可能
 *   - scroll={{ y }} で縦スクロール固定 → ProjectManagement 右下パネルに収まる
 */

import React, { useState, useMemo } from 'react';
import {
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Typography,
  Tabs,
  Flex,
  Badge,
  Select,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined, CloseOutlined, FilterOutlined } from '@ant-design/icons';
import ExperimentPlanDialog from '../ExperimentPlanDialog';

const { Text } = Typography;
const { TextArea } = Input;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 型定義
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface PropertyRow {
  key: string;
  taskNo: number;
  methodId: string;
  transitionId: string;
  templateName: string;
  propKey: string;
  xsiType: string;
  expected: number | string | null;
  actual: number | string | null;
  unit: string;
  taskStatus: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

interface FilterState {
  taskNo: number | null;
  methodId: string | null;
  transitionId: string | null;
  templateName: string | null;
  propKey: string | null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// モックデータ（同一MAIMLを3回実行）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 実データを模した定数（命名規則に準拠）
// methodId: method_{projectName}_{UUID先頭8文字}
// transitionId: transition-{タイムスタンプ}
// propKey: ns1:{PropertyName}

const PROJECT_NAME = 'SampleSynthesis';
const METHOD_A_ID  = `method_${PROJECT_NAME}_a1b2c3d4`;
const METHOD_B_ID  = `method_${PROJECT_NAME}_e5f6a7b8`;

const T_MIX    = 'transition-1781057805603';
const T_HEAT   = 'transition-1781057812047';
const T_CENTRI = 'transition-1781057819834';

const BASE_PROPERTIES = [
  { methodId: METHOD_A_ID, transitionId: T_MIX,    templateName: 'Condition-Template-Mixing',       propKey: 'ns1:Temperature',  xsiType: 'FloatValue',   expected: 25.0,   unit: '℃'  },
  { methodId: METHOD_A_ID, transitionId: T_MIX,    templateName: 'Condition-Template-Mixing',       propKey: 'ns1:Pressure',     xsiType: 'FloatValue',   expected: 1.013,  unit: 'atm' },
  { methodId: METHOD_A_ID, transitionId: T_MIX,    templateName: 'Condition-Template-Mixing',       propKey: 'ns1:StirringSpeed',xsiType: 'IntegerValue', expected: 300,    unit: 'rpm' },
  { methodId: METHOD_A_ID, transitionId: T_MIX,    templateName: 'Result-Template-Yield',           propKey: 'ns1:Yield',        xsiType: 'FloatValue',   expected: 90.0,   unit: '%'   },
  { methodId: METHOD_A_ID, transitionId: T_MIX,    templateName: 'Result-Template-Yield',           propKey: 'ns1:Purity',       xsiType: 'FloatValue',   expected: 99.5,   unit: '%'   },
  { methodId: METHOD_A_ID, transitionId: T_HEAT,   templateName: 'Condition-Template-Heating',      propKey: 'ns1:Temperature',  xsiType: 'FloatValue',   expected: 80.0,   unit: '℃'  },
  { methodId: METHOD_A_ID, transitionId: T_HEAT,   templateName: 'Condition-Template-Heating',      propKey: 'ns1:HeatingTime',  xsiType: 'IntegerValue', expected: 30,     unit: 'min' },
  { methodId: METHOD_B_ID, transitionId: T_CENTRI, templateName: 'Condition-Template-Centrifuge',   propKey: 'ns1:RotationSpeed',xsiType: 'IntegerValue', expected: 3000,   unit: 'rpm' },
  { methodId: METHOD_B_ID, transitionId: T_CENTRI, templateName: 'Condition-Template-Centrifuge',   propKey: 'ns1:Duration',     xsiType: 'IntegerValue', expected: 10,     unit: 'min' },
  { methodId: METHOD_B_ID, transitionId: T_CENTRI, templateName: 'Material-Template-Solvent',       propKey: 'ns1:SolventName',  xsiType: 'StringValue',  expected: 'EtOH', unit: ''    },
];

function makeRows(
  taskNo: number,
  status: 0 | 1 | 2 | 3 | 4 | 5 | 6,
  actuals: Record<string, number | string | null>
): PropertyRow[] {
  return BASE_PROPERTIES.map(b => ({
    key: `${taskNo}-${b.methodId}-${b.transitionId}-${b.propKey}`,
    taskNo,
    ...b,
    actual: actuals[`${b.methodId}-${b.transitionId}-${b.propKey}`] ?? null,
    taskStatus: status,
  }));
}

const MOCK_DATA: PropertyRow[] = [
  ...makeRows(1, 5, {
    [`${METHOD_A_ID}-${T_MIX}-ns1:Temperature`]:   24.8,
    [`${METHOD_A_ID}-${T_MIX}-ns1:Pressure`]:      1.02,
    [`${METHOD_A_ID}-${T_MIX}-ns1:StirringSpeed`]: 295,
    [`${METHOD_A_ID}-${T_MIX}-ns1:Yield`]:         88.5,
    [`${METHOD_A_ID}-${T_MIX}-ns1:Purity`]:        99.1,
    [`${METHOD_A_ID}-${T_HEAT}-ns1:Temperature`]:  79.5,
    [`${METHOD_A_ID}-${T_HEAT}-ns1:HeatingTime`]:  31,
    [`${METHOD_B_ID}-${T_CENTRI}-ns1:RotationSpeed`]: 3000,
    [`${METHOD_B_ID}-${T_CENTRI}-ns1:Duration`]:   10,
    [`${METHOD_B_ID}-${T_CENTRI}-ns1:SolventName`]:'EtOH',
  }),
  ...makeRows(2, 4, {
    [`${METHOD_A_ID}-${T_MIX}-ns1:Temperature`]:   25.3,
    [`${METHOD_A_ID}-${T_MIX}-ns1:Pressure`]:      0.98,
    [`${METHOD_A_ID}-${T_MIX}-ns1:StirringSpeed`]: 310,
    [`${METHOD_A_ID}-${T_MIX}-ns1:Yield`]:         91.2,
    [`${METHOD_A_ID}-${T_MIX}-ns1:Purity`]:        99.6,
    [`${METHOD_A_ID}-${T_HEAT}-ns1:Temperature`]:  80.1,
    [`${METHOD_A_ID}-${T_HEAT}-ns1:HeatingTime`]:  29,
    [`${METHOD_B_ID}-${T_CENTRI}-ns1:RotationSpeed`]: 2980,
    [`${METHOD_B_ID}-${T_CENTRI}-ns1:Duration`]:   10,
    [`${METHOD_B_ID}-${T_CENTRI}-ns1:SolventName`]:'EtOH',
  }),
  ...makeRows(3, 2, {}),
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 定数
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const TASK_STATUS_CONFIG: Record<number, { label: string; color: string }> = {
  0: { label: '実行待ち',     color: 'default'    },
  1: { label: '作業中',       color: 'processing' },
  2: { label: '実行中',       color: 'processing' },
  3: { label: '異常終了',     color: 'error'      },
  4: { label: 'レビュー待ち', color: 'warning'    },
  5: { label: '完了',         color: 'success'    },
  6: { label: 'NG',           color: 'error'      },
};

const XSI_TYPE_COLOR: Record<string, string> = {
  FloatValue:   'geekblue',
  IntegerValue: 'purple',
  StringValue:  'cyan',
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// セルコンポーネント
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function DiffCell({ expected, actual }: { expected: number | string | null; actual: number | string | null }) {
  if (typeof expected !== 'number' || typeof actual !== 'number') return <Text type="secondary">—</Text>;
  const diff = actual - expected;
  const s = parseFloat(diff.toFixed(4)).toString();
  if (diff === 0) return <Text type="secondary">±0</Text>;
  if (diff > 0)   return <Text style={{ color: '#cf1322' }}>+{s}</Text>;
  return <Text style={{ color: '#096dd9' }}>{s}</Text>;
}

function ActualCell({ actual, unit }: { actual: number | string | null; unit: string }) {
  if (actual === null) return <Text type="secondary" italic>未記録</Text>;
  return <Text>{actual}{unit ? ` ${unit}` : ''}</Text>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// フィルタバー
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function uniq<T>(arr: T[]): T[] { return [...new Set(arr)]; }

interface FilterBarProps {
  filters: FilterState;
  onChange: (f: Partial<FilterState>) => void;
  total: number;
  filtered: number;
}

const FilterBar: React.FC<FilterBarProps> = ({ filters, onChange, total, filtered }) => {
  const sel = (width: number, placeholder: string, key: keyof FilterState, opts: (string | number)[]) => (
    <Select
      allowClear
      size="small"
      placeholder={placeholder}
      style={{ width }}
      value={filters[key] as string | number | null}
      onChange={v => onChange({ [key]: v ?? null })}
      options={(opts as (string | number)[]).map(v => ({ label: String(v), value: v }))}
      popupMatchSelectWidth={false}
    />
  );

  return (
    <Flex gap={6} align="center" wrap="wrap" style={{ padding: '6px 0 4px' }}>
      <FilterOutlined style={{ color: '#888', fontSize: 12 }} />
      {sel(70,  'タスクNo',       'taskNo',       uniq(MOCK_DATA.map(r => r.taskNo)))}
      {sel(120, 'メソッドID',     'methodId',     uniq(MOCK_DATA.map(r => r.methodId)))}
      {sel(130, 'トランジション', 'transitionId', uniq(MOCK_DATA.map(r => r.transitionId)))}
      {sel(170, 'テンプレート名', 'templateName', uniq(MOCK_DATA.map(r => r.templateName)))}
      {sel(140, 'Key',            'propKey',      uniq(MOCK_DATA.map(r => r.propKey)))}
      <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
        {filtered}/{total}行
      </Text>
    </Flex>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 実験指示テーブル
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ExperimentInstructionTableMock: React.FC = () => {
  const [rows, setRows]                   = useState<PropertyRow[]>(MOCK_DATA);
  const [approveTarget, setApproveTarget] = useState<PropertyRow | null>(null);
  const [ngTarget, setNgTarget]           = useState<PropertyRow | null>(null);
  const [ngForm]                          = Form.useForm();
  const [filters, setFilters]             = useState<FilterState>({
    taskNo: null, methodId: null, transitionId: null, templateName: null, propKey: null,
  });

  // ── ExperimentPlanDialog state ──
  /** ダイアログ開閉 */
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  /** 開くメソッドID（編集 or タスク登録経由 で切り替える） */
  const [planDialogMethodId, setPlanDialogMethodId] = useState<string>(METHOD_A_ID);
  /**
   * タスク登録から開く場合は固定メソッドID。
   * 実験指示タブの「編集」ボタンから開く場合はフィルタ中のメソッドIDを使う。
   */

  /** 編集ボタン押下: フィルタ中のメソッドID (なければ METHOD_A_ID) で ExperimentPlanDialog を開く */
  const handleOpenEdit = () => {
    setPlanDialogMethodId(filters.methodId ?? METHOD_A_ID);
    setPlanDialogOpen(true);
  };

  /** [モック] タスク登録から開く: METHOD_A_ID 固定で ExperimentPlanDialog を開く */
  const handleOpenFromTask = () => {
    setPlanDialogMethodId(METHOD_A_ID);
    setPlanDialogOpen(true);
  };

  const filteredRows = useMemo(() => rows.filter(r => {
    if (filters.taskNo       !== null && r.taskNo       !== filters.taskNo)       return false;
    if (filters.methodId     !== null && r.methodId     !== filters.methodId)     return false;
    if (filters.transitionId !== null && r.transitionId !== filters.transitionId) return false;
    if (filters.templateName !== null && r.templateName !== filters.templateName) return false;
    if (filters.propKey      !== null && r.propKey      !== filters.propKey)      return false;
    return true;
  }), [rows, filters]);

  const handleApprove = () => {
    if (!approveTarget) return;
    setRows(prev => prev.map(r => r.taskNo === approveTarget.taskNo ? { ...r, taskStatus: 5 } : r));
    setApproveTarget(null);
    Modal.success({ title: '承認しました', content: `タスク #${approveTarget.taskNo} を「完了」に更新しました。` });
  };

  const handleNg = () => {
    if (!ngTarget) return;
    ngForm.validateFields().then(() => {
      setRows(prev => prev.map(r => r.taskNo === ngTarget.taskNo ? { ...r, taskStatus: 6 } : r));
      ngForm.resetFields();
      setNgTarget(null);
      Modal.warning({ title: 'NG記録しました', content: `タスク #${ngTarget.taskNo} を「NG」に更新しました。` });
    });
  };

  const columns: ColumnsType<PropertyRow> = [
    {
      title: 'タスクNo', dataIndex: 'taskNo', width: 76, align: 'center',
      sorter: (a, b) => a.taskNo - b.taskNo,
      render: (v: number) => <Text strong>#{v}</Text>,
    },
    {
      title: 'メソッドID', dataIndex: 'methodId', width: 190,
      ellipsis: { showTitle: false },
      render: (v: string) => (
        <Tooltip title={v} placement="topLeft">
          <Text code style={{ fontSize: 12 }}>{v}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'トランジションID', dataIndex: 'transitionId', width: 175,
      ellipsis: { showTitle: false },
      render: (v: string) => (
        <Tooltip title={v} placement="topLeft">
          <Text code style={{ fontSize: 12 }}>{v}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'テンプレート名', dataIndex: 'templateName', width: 170,
      ellipsis: { showTitle: false },
      render: (v: string) => (
        <Tooltip title={v} placement="topLeft">
          <Text>{v}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Key', dataIndex: 'propKey', width: 150,
      ellipsis: { showTitle: false },
      render: (v: string) => (
        <Tooltip title={v} placement="topLeft">
          <Text code style={{ fontSize: 12 }}>{v}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'xsi:type', dataIndex: 'xsiType', width: 80, align: 'center',
      render: (v: string) => {
        // 短縮表示: FloatValue→Float, IntegerValue→Int, StringValue→Str
        const short: Record<string, string> = {
          FloatValue: 'Float', IntegerValue: 'Int', StringValue: 'Str',
        };
        return (
          <Tooltip title={v}>
            <Tag color={XSI_TYPE_COLOR[v] ?? 'default'} style={{ fontSize: 11, margin: 0 }}>
              {short[v] ?? v}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '想定値', dataIndex: 'expected', width: 100, align: 'right',
      render: (v: number | string | null, r: PropertyRow) => (
        <Text>{v !== null ? `${v}${r.unit ? ` ${r.unit}` : ''}` : '—'}</Text>
      ),
    },
    {
      title: '実績値', width: 100, align: 'right',
      render: (_: unknown, r: PropertyRow) => <ActualCell actual={r.actual} unit={r.unit} />,
    },
    {
      title: '差分', width: 85, align: 'right',
      render: (_: unknown, r: PropertyRow) => <DiffCell expected={r.expected} actual={r.actual} />,
    },
    {
      title: 'ステータス', dataIndex: 'taskStatus', width: 110, align: 'center',
      render: (v: number) => {
        const cfg = TASK_STATUS_CONFIG[v] ?? { label: '不明', color: 'default' };
        return <Tag color={cfg.color} style={{ margin: 0 }}>{cfg.label}</Tag>;
      },
    },
    {
      title: '操作', width: 90, align: 'center',
      render: (_: unknown, r: PropertyRow) => {
        if (r.taskStatus !== 4) return <Text type="secondary">—</Text>;
        return (
          <Space size={2} direction="vertical" style={{ width: '100%' }}>
            <Button type="primary" size="small" icon={<CheckOutlined />} block onClick={() => setApproveTarget(r)}>承認</Button>
            <Button danger        size="small" icon={<CloseOutlined  />} block onClick={() => setNgTarget(r)}>NG</Button>
          </Space>
        );
      },
    },
  ];

  return (
    <Flex vertical style={{ height: '100%' }}>
      {/* ツールバー：編集ボタン + タスク登録模擬ボタン + 登録済み指示メモのサマリ */}
      <Flex gap={8} align="center" style={{ padding: '4px 0 6px' }}>
        <Button
          size="small"
          icon={<span style={{ fontSize: 12 }}>✏️</span>}
          onClick={handleOpenEdit}
        >
          実験指示を編集
        </Button>
        <Button
          size="small"
          type="dashed"
          onClick={handleOpenFromTask}
        >
          [モック] タスク登録から開く
        </Button>
        {/* 登録済みメソッドのサマリ */}
        <Flex gap={4} align="center" style={{ marginLeft: 8 }}>
          {[METHOD_A_ID, METHOD_B_ID].map(mid => (
            <Tooltip key={mid} title={mid} placement="bottom">
              <Tag
                color="blue"
                style={{ cursor: 'pointer', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}
                onClick={() => { setPlanDialogMethodId(mid); setPlanDialogOpen(true); }}
              >
                {mid.split('_').slice(-1)[0]}: 指示あり
              </Tag>
            </Tooltip>
          ))}
        </Flex>
      </Flex>

      {/* フィルタバー（タスクNo〜Key） */}
      <FilterBar
        filters={filters}
        onChange={f => setFilters(prev => ({ ...prev, ...f }))}
        total={rows.length}
        filtered={filteredRows.length}
      />

      {/* テーブル: scroll.y で縦スクロール固定 → パネル高さに追従 */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Table<PropertyRow>
          dataSource={filteredRows}
          columns={columns}
          rowKey="key"
          size="small"
          pagination={false}
          bordered
          scroll={{ x: 1100, y: 'calc(100vh - 340px)' }}
          style={{ fontSize: 12 }}
          rowClassName={(r) => r.taskStatus === 4 ? 'row-review-waiting' : ''}
        />
      </div>

      {/* 承認モーダル */}
      <Modal
        title="タスク結果承認"
        open={!!approveTarget}
        onOk={handleApprove}
        onCancel={() => setApproveTarget(null)}
        okText="承認" cancelText="キャンセル"
        okButtonProps={{ type: 'primary', icon: <CheckOutlined /> }}
      >
        <p>以下のタスクを承認しますか？</p>
        <p><Text strong>タスクNo：</Text>#{approveTarget?.taskNo}</p>
        <p><Text strong>メソッドID：</Text>{approveTarget?.methodId}</p>
        <p><Text strong>トランジションID：</Text>{approveTarget?.transitionId}</p>
        <br />
        <Text type="secondary">※ タスクNo #{approveTarget?.taskNo} の全プロパティを一括「完了」に更新します。</Text>
      </Modal>

      {/* NG記録モーダル */}
      <Modal
        title="タスク結果NG記録"
        open={!!ngTarget}
        onOk={handleNg}
        onCancel={() => { setNgTarget(null); ngForm.resetFields(); }}
        okText="記録" cancelText="キャンセル"
        okButtonProps={{ danger: true, icon: <CloseOutlined /> }}
      >
        <p><Text strong>タスクNo：</Text>#{ngTarget?.taskNo}</p>
        <p><Text strong>メソッドID：</Text>{ngTarget?.methodId}</p>
        <br />
        <Form form={ngForm} layout="vertical">
          <Form.Item label="NG理由" name="ngReason" rules={[{ required: true, message: 'NG理由を入力してください' }]}>
            <TextArea rows={4} placeholder="例: 反応温度が想定値を超えたため" maxLength={500} showCount />
          </Form.Item>
        </Form>
        <Text type="secondary">※NG記録後、再度指示出しが必要です。</Text>
      </Modal>

      {/* 実験計画ダイアログ（ExperimentPlanDialog を流用） */}
      <ExperimentPlanDialog
        open={planDialogOpen}
        projectId="mock-project-id"
        methodId={planDialogMethodId}
        taskNumbers={[1, 2, 3]}
        onClose={() => setPlanDialogOpen(false)}
        onSave={() => setPlanDialogOpen(false)}
      />
    </Flex>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 指示管理タブ（サブタブ構成）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const InstructionManagementTabMock: React.FC = () => {
  const reviewWaitingCount = uniq(
    MOCK_DATA.filter(r => r.taskStatus === 4).map(r => r.taskNo)
  ).length;

  return (
    <Tabs
      type="card"
      size="small"
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      // Ant Design Tabs の中身をflex伸長させるための workaround
      tabBarStyle={{ marginBottom: 0 }}
      items={[
        {
          key: 'project_instruction',
          label: 'プロジェクト指示',
          children: (
            <div style={{ padding: 12, color: '#888', fontSize: 13 }}>
              ※ 既存の <code>InstructionRegistrationTab</code> がここに入ります
            </div>
          ),
        },
        {
          key: 'experiment_instruction',
          label: (
            <Flex align="center" gap={6}>
              実験指示
              {reviewWaitingCount > 0 && <Badge count={reviewWaitingCount} size="small" />}
            </Flex>
          ),
          children: (
            // height: 100% でパネル高さいっぱいに使う
            <div style={{ height: '100%' }}>
              <ExperimentInstructionTableMock />
            </div>
          ),
        },
      ]}
    />
  );
};

export { ExperimentInstructionTableMock, InstructionManagementTabMock };
export default InstructionManagementTabMock;
