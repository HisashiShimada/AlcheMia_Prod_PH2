'use client';

/**
 * 作業記録パネル（案A / 案B レイアウト）
 *
 * モック ExperimentWorkerScreenMock.tsx の PlanA / PlanB / PropertyCard /
 * WorkHeader / InstructionCollapse を実画面用コンポーネントとして移植。
 *
 * フェーズA: モックデータのまま動作確認。
 * フェーズB: props 経由で実 API データに差し替え。
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Collapse,
  Divider,
  Flex,
  Input,
  InputNumber,
  Layout,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import { PlusOutlined, RightOutlined, SearchOutlined, WarningOutlined } from '@ant-design/icons';

const { Sider, Content } = Layout;

const { Text } = Typography;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 型定義
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type TransitionStatus = 'not_started' | 'in_progress' | 'completed' | 'error';
interface MockProperty {
  key: string;
  label: string;
  xsiType: 'FloatValue' | 'IntegerValue' | 'StringValue';
  unit: string;
  expected: number | string | null;
}

interface MockTemplate {
  id: string;
  name: string;
  category: 'Conditions' | 'Materials' | 'Results';
  properties: MockProperty[];
}

interface MockTransition {
  id: string;
  order: number;
  methodId: string;
  templates: MockTemplate[];
}

interface MockMethod {
  id: string;
  order: number;
}

interface TaskTransitionState {
  transitionId: string;
  status: TransitionStatus;
  actuals: Record<string, number | string | null>;
}

export interface MockTask {
  taskNo: number;
  transitions: TaskTransitionState[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// モックデータ（フェーズA）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MOCK_PROJECT_INSTRUCTIONS = [
  '安全装備（手袋・ゴーグル）を着用して作業すること',
  '温度変化は慎重に観察し、異常があれば即座に報告すること',
  '記録は正確かつタイムリーに入力すること',
  '廃液は適切に分別して廃棄すること',
];

const PROJECT_NAME = 'SampleSynthesis';
const METHOD_A_ID = `method_${PROJECT_NAME}_a1b2c3d4`;
const METHOD_B_ID = `method_${PROJECT_NAME}_e5f6a7b8`;

const MOCK_METHODS: MockMethod[] = [
  { id: METHOD_A_ID, order: 1 },
  { id: METHOD_B_ID, order: 2 },
];

const MOCK_TRANSITIONS: MockTransition[] = [
  {
    id: 'transition-1781057805603',
    order: 1,
    methodId: METHOD_A_ID,
    templates: [
      {
        id: 'tpl-cond-mixing',
        name: 'Condition-Mixing',
        category: 'Conditions',
        properties: [
          { key: 'ns1:Temperature',   label: '温度',     xsiType: 'FloatValue',   unit: '℃',  expected: 25.0  },
          { key: 'ns1:Pressure',      label: '圧力',     xsiType: 'FloatValue',   unit: 'atm', expected: 1.013 },
          { key: 'ns1:StirringSpeed', label: '撹拌速度', xsiType: 'IntegerValue', unit: 'rpm', expected: 300   },
        ],
      },
      {
        id: 'tpl-result-yield',
        name: 'Result-Yield',
        category: 'Results',
        properties: [
          { key: 'ns1:Yield',  label: '収率', xsiType: 'FloatValue', unit: '%', expected: 90.0 },
          { key: 'ns1:Purity', label: '純度', xsiType: 'FloatValue', unit: '%', expected: 99.5 },
        ],
      },
    ],
  },
  {
    id: 'transition-1781057812047',
    order: 2,
    methodId: METHOD_A_ID,
    templates: [
      {
        id: 'tpl-cond-heating',
        name: 'Condition-Heating',
        category: 'Conditions',
        properties: [
          { key: 'ns1:Temperature', label: '温度',     xsiType: 'FloatValue',   unit: '℃',  expected: 80.0 },
          { key: 'ns1:HeatingTime', label: '加熱時間', xsiType: 'IntegerValue', unit: 'min', expected: 30   },
        ],
      },
    ],
  },
  {
    id: 'transition-1781057819834',
    order: 1,
    methodId: METHOD_B_ID,
    templates: [
      {
        id: 'tpl-cond-centri',
        name: 'Condition-Centrifuge',
        category: 'Conditions',
        properties: [
          { key: 'ns1:RotationSpeed', label: '回転速度', xsiType: 'IntegerValue', unit: 'rpm', expected: 3000 },
          { key: 'ns1:Duration',      label: '処理時間', xsiType: 'IntegerValue', unit: 'min', expected: 10   },
        ],
      },
      {
        id: 'tpl-mat-solvent',
        name: 'Material-Solvent',
        category: 'Materials',
        properties: [
          { key: 'ns1:SolventName', label: '溶媒名', xsiType: 'StringValue', unit: '', expected: 'EtOH' },
        ],
      },
    ],
  },
];

const ORDERED_TRANSITION_IDS: string[] = MOCK_METHODS
  .slice()
  .sort((a, b) => a.order - b.order)
  .flatMap((m) =>
    MOCK_TRANSITIONS.filter((t) => t.methodId === m.id)
      .sort((a, b) => a.order - b.order)
      .map((t) => t.id)
  );

export const INITIAL_TASKS: MockTask[] = [
  {
    taskNo: 1,
    transitions: [
      {
        transitionId: 'transition-1781057805603',
        status: 'completed',
        actuals: {
          'ns1:Temperature': 24.8, 'ns1:Pressure': 1.02, 'ns1:StirringSpeed': 295,
          'ns1:Yield': 88.5, 'ns1:Purity': 99.1,
        },
      },
      {
        transitionId: 'transition-1781057812047',
        status: 'completed',
        actuals: { 'ns1:Temperature': 79.5, 'ns1:HeatingTime': 31 },
      },
      {
        transitionId: 'transition-1781057819834',
        status: 'completed',
        actuals: { 'ns1:RotationSpeed': 3000, 'ns1:Duration': 10, 'ns1:SolventName': 'EtOH' },
      },
    ],
  },
  {
    taskNo: 2,
    transitions: [
      {
        transitionId: 'transition-1781057805603',
        status: 'in_progress',
        actuals: { 'ns1:Temperature': 25.3, 'ns1:Pressure': null, 'ns1:StirringSpeed': null, 'ns1:Yield': null, 'ns1:Purity': null },
      },
      { transitionId: 'transition-1781057812047', status: 'not_started', actuals: {} },
      { transitionId: 'transition-1781057819834', status: 'not_started', actuals: {} },
    ],
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ユーティリティ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const STATUS_CONFIG: Record<TransitionStatus, { label: string; color: string }> = {
  not_started: { label: '未着手',   color: 'default'    },
  in_progress: { label: '作業中',   color: 'processing' },
  completed:   { label: '完了',     color: 'success'    },
  error:       { label: '異常終了', color: 'error'      },
};

const CATEGORY_COLOR: Record<string, string> = {
  Conditions: 'blue',
  Materials:  'green',
  Results:    'purple',
};

const XSI_SHORT: Record<string, string> = {
  FloatValue: 'Float', IntegerValue: 'Int', StringValue: 'Str',
};

const XSI_COLOR: Record<string, string> = {
  FloatValue: 'geekblue', IntegerValue: 'purple', StringValue: 'cyan',
};

function calcDiff(expected: number | string | null, actual: number | string | null): React.ReactNode {
  if (typeof expected !== 'number' || typeof actual !== 'number') return null;
  const diff = actual - expected;
  const s = parseFloat(diff.toFixed(4)).toString();
  if (diff === 0) return <Text type="secondary" style={{ fontSize: 11 }}>±0</Text>;
  if (diff > 0) return <Text style={{ color: '#cf1322', fontSize: 11 }}>+{s}</Text>;
  return <Text style={{ color: '#096dd9', fontSize: 11 }}>{s}</Text>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// プロパティカード
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface PropertyCardProps {
  prop: MockProperty;
  actual: number | string | null;
  readOnly: boolean;
  onChange: (key: string, value: number | string | null) => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ prop, actual, readOnly, onChange }) => (
  <Card
    size="small"
    style={{
      borderRadius: 6,
      border: '1px solid #d9d9d9',
      background: readOnly ? '#fafafa' : '#ffffff',
    }}
  >
    {/* プロパティ情報（最上部） */}
    <Flex align="center" gap={6} style={{ marginBottom: 6 }}>
      <Text strong style={{ fontSize: 13 }}>{prop.label}</Text>
      <Tag color={XSI_COLOR[prop.xsiType] ?? 'default'} style={{ fontSize: 11, margin: 0, lineHeight: '18px' }}>
        {XSI_SHORT[prop.xsiType] ?? prop.xsiType}
      </Tag>
      <Text type="secondary" style={{ fontSize: 11 }}>({prop.key})</Text>
    </Flex>

    {/* カラムヘッダー */}
    <Row gutter={8} style={{ marginBottom: 4 }}>
      <Col span={10}>
        <Text type="secondary" style={{ fontSize: 11 }}>想定値</Text>
      </Col>
      <Col span={14}>
        <Text type="secondary" style={{ fontSize: 11 }}>実績値</Text>
      </Col>
    </Row>

    {/* データ表示 / 入力エリア */}
    <Row gutter={8}>
      <Col span={10}>
        <div style={{ padding: '6px 10px', background: '#e6f7ff', border: '1px solid #bae7ff', borderRadius: 4 }}>
          {prop.expected !== null ? (
            <Text style={{ fontSize: 14 }}>
              {prop.expected}
              {prop.unit && <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>{prop.unit}</Text>}
            </Text>
          ) : (
            <Text type="secondary" italic style={{ fontSize: 13 }}>未設定</Text>
          )}
        </div>
      </Col>
      <Col span={14}>
        <div style={{ padding: readOnly ? '6px 10px' : '4px 8px', background: readOnly ? '#fafafa' : '#ffffff', border: '1px solid #d9d9d9', borderRadius: 4 }}>
          {readOnly ? (
            actual !== null ? (
              <Flex align="center" gap={8}>
                <Text style={{ fontSize: 14 }}>
                  {actual}
                  {prop.unit && <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>{prop.unit}</Text>}
                </Text>
                {calcDiff(prop.expected, actual)}
              </Flex>
            ) : (
              <Text type="secondary" italic style={{ fontSize: 13 }}>未記録</Text>
            )
          ) : (
            prop.xsiType === 'StringValue' ? (
              <Input
                size="small"
                style={{ width: '100%' }}
                value={(actual as string) ?? ''}
                placeholder="入力"
                onChange={(e) => onChange(prop.key, e.target.value || null)}
                suffix={prop.unit ? <Text type="secondary" style={{ fontSize: 11 }}>{prop.unit}</Text> : undefined}
              />
            ) : (
              <InputNumber
                size="small"
                style={{ width: '100%' }}
                value={(actual as number) ?? undefined}
                placeholder="入力"
                onChange={(v) => onChange(prop.key, v ?? null)}
                addonAfter={prop.unit || undefined}
              />
            )
          )}
        </div>
      </Col>
    </Row>
  </Card>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// プロパティカード一覧（共通部品）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface PropertyListProps {
  template: MockTemplate | null;
  templateCount: number;
  templateIdx: number;
  taskTransition: TaskTransitionState | undefined;
  isReadOnly: boolean;
  displayKey: { taskNo: number; transitionId: string } | null;
  onActualChange: (taskNo: number, transitionId: string, propKey: string, value: number | string | null) => void;
  onSave: (taskNo: number, transitionId: string) => void;
  onSaveAndNext: (taskNo: number, transitionId: string) => void;
  onTemplateIdxChange: (idx: number) => void;
}

const PropertyList: React.FC<PropertyListProps> = ({
  template,
  templateCount,
  templateIdx,
  taskTransition,
  isReadOnly,
  displayKey,
  onActualChange,
  onSave,
  onSaveAndNext,
  onTemplateIdxChange,
}) => {
  if (!template) {
    return (
      <Flex justify="center" align="center" style={{ height: 200 }}>
        <Text type="secondary">作業中のトランジションがありません</Text>
      </Flex>
    );
  }
  return (
    <>
      <Flex align="center" gap={8} style={{ marginBottom: 8 }}>
        <Tag color={CATEGORY_COLOR[template.category]}>{template.category}</Tag>
        <Text strong style={{ fontSize: 13 }}>{template.name}</Text>
        {templateCount > 1 && (
          <Text type="secondary" style={{ fontSize: 11 }}>{templateIdx + 1}/{templateCount}</Text>
        )}
      </Flex>

      <Row gutter={[8, 8]}>
        {template.properties.map((prop) => (
          <Col span={12} key={prop.key}>
            <PropertyCard
              prop={prop}
              actual={taskTransition?.actuals[prop.key] ?? null}
              readOnly={isReadOnly}
              onChange={(key, value) => {
                if (displayKey) onActualChange(displayKey.taskNo, displayKey.transitionId, key, value);
              }}
            />
          </Col>
        ))}
      </Row>

      {/* 追加ボタン群（DataRecordDialog 準拠） */}
      {!isReadOnly && (
        <Flex gap={8} style={{ marginTop: 8, flexWrap: 'wrap' }}>
          <Button size="small" icon={<PlusOutlined />} onClick={() => {}}>
            Property 追加
          </Button>
          <Button size="small" icon={<PlusOutlined />} onClick={() => {}}>
            Content 追加
          </Button>
          <Button size="small" icon={<PlusOutlined />} onClick={() => {}}>
            Insertion 追加
          </Button>
        </Flex>
      )}

      {/* 保存ボタン */}
      {!isReadOnly && displayKey && (
        <Flex justify="flex-end" gap={8} style={{ marginTop: 12, paddingBottom: 8 }}>
          <Button onClick={() => onSave(displayKey.taskNo, displayKey.transitionId)}>
            保存
          </Button>
          <Button
            type="primary"
            icon={<RightOutlined />}
            onClick={() => {
              onTemplateIdxChange(0);
              onSaveAndNext(displayKey.taskNo, displayKey.transitionId);
            }}
          >
            保存して次へ
          </Button>
        </Flex>
      )}
    </>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 作業ヘッダー（共通）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface WorkHeaderProps {
  displayKey: { taskNo: number; transitionId: string } | null;
  taskTransition: TaskTransitionState | undefined;
  transition: MockTransition | null;
  method: MockMethod | undefined;
  isReadOnly: boolean;
  activeEntry: { taskNo: number; transitionId: string } | null;
  onClearViewing: () => void;
}

const WorkHeader: React.FC<WorkHeaderProps> = ({
  displayKey,
  taskTransition,
  transition,
  method,
  isReadOnly,
  activeEntry,
  onClearViewing,
}) => {
  if (!displayKey || !taskTransition || !transition) {
    if (activeEntry === null) {
      return (
        <Alert type="success" showIcon message="担当タスクの全トランジションが完了しています。" style={{ marginBottom: 8 }} />
      );
    }
    return null;
  }
  return (
    <Card
      size="small"
      style={{
        marginBottom: 8,
        background: isReadOnly ? '#f5f5f5' : '#f6ffed',
        borderColor: isReadOnly ? '#d9d9d9' : '#b7eb8f',
      }}
    >
      <Flex align="center" gap={10} wrap="wrap">
        <Flex align="center" gap={6}>
          <Tag color={STATUS_CONFIG[taskTransition.status].color} style={{ margin: 0 }}>
            {STATUS_CONFIG[taskTransition.status].label}
          </Tag>
        </Flex>
        <Divider type="vertical" style={{ margin: 0 }} />
        <Flex align="center" gap={4}>
          <Text type="secondary" style={{ fontSize: 12 }}>タスクNo</Text>
          <Text strong style={{ fontSize: 13 }}>#{displayKey.taskNo}</Text>
        </Flex>
        <Divider type="vertical" style={{ margin: 0 }} />
        <Flex align="center" gap={4}>
          <Text type="secondary" style={{ fontSize: 12 }}>メソッド</Text>
          <Tooltip title={method?.id ?? ''}>
            <Text code style={{ fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
              {method?.id ?? '—'}
            </Text>
          </Tooltip>
        </Flex>
        <Divider type="vertical" style={{ margin: 0 }} />
        <Flex align="center" gap={4}>
          <Text type="secondary" style={{ fontSize: 12 }}>トランジション</Text>
          <Tooltip title={transition.id}>
            <Text code style={{ fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
              {transition.id}
            </Text>
          </Tooltip>
        </Flex>
      </Flex>
      {isReadOnly && (
        <Alert
          type="info" showIcon
          message="完了済みトランジションの記録を確認しています（編集不可）。"
          style={{ marginTop: 8, fontSize: 12 }}
          action={<Button size="small" onClick={onClearViewing}>作業中に戻る</Button>}
        />
      )}
    </Card>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// プロジェクト指示（折りたたみ）共通部品
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface InstructionCollapseProps {
  instructions: string[];
}

const InstructionCollapse: React.FC<InstructionCollapseProps> = ({ instructions }) => {
  if (instructions.length === 0) return null;
  return (
    <Collapse
      size="small"
      style={{ marginBottom: 8, background: '#fffbe6', borderColor: '#ffe58f' }}
      items={[
        {
          key: 'instructions',
          label: (
            <Flex align="center" gap={8}>
              <WarningOutlined style={{ color: '#faad14' }} />
              <Text strong style={{ fontSize: 13 }}>プロジェクト指示</Text>
              <Badge count={instructions.length} size="small" color="#faad14" />
            </Flex>
          ),
          children: (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {instructions.map((inst, i) => (
                <li key={i} style={{ fontSize: 13, color: '#595959', marginBottom: 4 }}>{inst}</li>
              ))}
            </ul>
          ),
        },
      ]}
    />
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 内部用Props（PlanA / PlanB 共通）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface PlanProps {
  tasks: MockTask[];
  activeTaskNo: number;
  viewingKey: { taskNo: number; transitionId: string } | null;
  instructions: string[];
  onActualChange: (taskNo: number, transitionId: string, propKey: string, value: number | string | null) => void;
  onSave: (taskNo: number, transitionId: string) => void;
  onSaveAndNext: (taskNo: number, transitionId: string) => void;
  onClearViewing: () => void;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案A: テンプレート選択がボタン形式（左ペインなし）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PlanA: React.FC<PlanProps> = ({
  tasks, activeTaskNo, viewingKey, instructions, onActualChange, onSave, onSaveAndNext, onClearViewing,
}) => {
  const [templateIdx, setTemplateIdx] = useState(0);

  const activeEntry = useMemo((): { taskNo: number; transitionId: string } | null => {
    const task = tasks.find((t) => t.taskNo === activeTaskNo);
    if (!task) return null;
    for (const tid of ORDERED_TRANSITION_IDS) {
      const tt = task.transitions.find((x) => x.transitionId === tid);
      if (tt && tt.status !== 'completed' && tt.status !== 'error') return { taskNo: activeTaskNo, transitionId: tid };
    }
    return null;
  }, [tasks, activeTaskNo]);

  const displayKey = viewingKey ?? activeEntry;
  const isReadOnly = viewingKey !== null;
  const displayTask = displayKey ? tasks.find((t) => t.taskNo === displayKey.taskNo) : null;
  const displayTT = displayTask?.transitions.find((tt) => tt.transitionId === displayKey?.transitionId);
  const displayTransition = displayKey ? MOCK_TRANSITIONS.find((t) => t.id === displayKey.transitionId) : null;
  const displayMethod = displayTransition ? MOCK_METHODS.find((m) => m.id === displayTransition.methodId) : null;
  const visibleTemplates = displayTransition?.templates ?? [];
  const safeIdx = Math.min(templateIdx, Math.max(0, visibleTemplates.length - 1));
  const activeTemplate = visibleTemplates[safeIdx] ?? null;

  return (
    <Flex vertical style={{ height: '100%' }}>
      <InstructionCollapse instructions={instructions} />
      <WorkHeader
        displayKey={displayKey} taskTransition={displayTT} transition={displayTransition ?? null}
        method={displayMethod ?? undefined} isReadOnly={isReadOnly} activeEntry={activeEntry} onClearViewing={onClearViewing}
      />

      {/* テンプレート選択ボタン（複数の場合のみ） */}
      {visibleTemplates.length > 1 && (
        <Flex gap={4} style={{ marginBottom: 8, flexWrap: 'wrap' }}>
          {visibleTemplates.map((tpl, idx) => (
            <Button
              key={tpl.id}
              size="small"
              type={idx === safeIdx ? 'primary' : 'default'}
              onClick={() => setTemplateIdx(idx)}
            >
              <Tag color={CATEGORY_COLOR[tpl.category]} style={{ margin: 0, fontSize: 10 }}>
                {tpl.category.slice(0, 4)}
              </Tag>
              {tpl.name}
            </Button>
          ))}
        </Flex>
      )}

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
        <PropertyList
          template={activeTemplate}
          templateCount={visibleTemplates.length}
          templateIdx={safeIdx}
          taskTransition={displayTT}
          isReadOnly={isReadOnly}
          displayKey={displayKey}
          onActualChange={onActualChange}
          onSave={onSave}
          onSaveAndNext={onSaveAndNext}
          onTemplateIdxChange={setTemplateIdx}
        />
      </div>
    </Flex>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 案B: DataRecordDialog準拠の左Sider + 右Contentレイアウト
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PlanB: React.FC<PlanProps> = ({
  tasks, activeTaskNo, viewingKey, instructions, onActualChange, onSave, onSaveAndNext, onClearViewing,
}) => {
  const { token } = theme.useToken();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateSearchText, setTemplateSearchText] = useState('');
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<string | undefined>(undefined);

  const activeEntry = useMemo((): { taskNo: number; transitionId: string } | null => {
    const task = tasks.find((t) => t.taskNo === activeTaskNo);
    if (!task) return null;
    for (const tid of ORDERED_TRANSITION_IDS) {
      const tt = task.transitions.find((x) => x.transitionId === tid);
      if (tt && tt.status !== 'completed' && tt.status !== 'error') return { taskNo: activeTaskNo, transitionId: tid };
    }
    return null;
  }, [tasks, activeTaskNo]);

  const displayKey = viewingKey ?? activeEntry;
  const isReadOnly = viewingKey !== null;
  const displayTask = displayKey ? tasks.find((t) => t.taskNo === displayKey.taskNo) : null;
  const displayTT = displayTask?.transitions.find((tt) => tt.transitionId === displayKey?.transitionId);
  const displayTransition = displayKey ? MOCK_TRANSITIONS.find((t) => t.id === displayKey.transitionId) : null;
  const displayMethod = displayTransition ? MOCK_METHODS.find((m) => m.id === displayTransition.methodId) : null;
  const visibleTemplates = displayTransition?.templates ?? [];

  // 自動選択: トランジションが切り替わったら先頭テンプレートを選択
  const firstTemplateId = visibleTemplates[0]?.id ?? null;
  const resolvedSelectedId = selectedTemplateId && visibleTemplates.some((t) => t.id === selectedTemplateId)
    ? selectedTemplateId
    : firstTemplateId;
  const activeTemplate = visibleTemplates.find((t) => t.id === resolvedSelectedId) ?? null;
  const safeIdx = visibleTemplates.findIndex((t) => t.id === resolvedSelectedId);

  // フィルタ後テンプレート
  const filteredTemplates = useMemo(() => {
    return visibleTemplates.filter((tpl) => {
      const matchName = !templateSearchText || tpl.name.toLowerCase().includes(templateSearchText.toLowerCase());
      const matchCat = !selectedTemplateCategory || tpl.category === selectedTemplateCategory;
      return matchName && matchCat;
    });
  }, [visibleTemplates, templateSearchText, selectedTemplateCategory]);

  return (
    <Flex vertical style={{ height: '100%' }}>
      <InstructionCollapse instructions={instructions} />
      <WorkHeader
        displayKey={displayKey} taskTransition={displayTT} transition={displayTransition ?? null}
        method={displayMethod ?? undefined} isReadOnly={isReadOnly} activeEntry={activeEntry} onClearViewing={onClearViewing}
      />

      {/* DataRecordDialog準拠: Layout + Sider + Content */}
      <Layout style={{ flex: 1, overflow: 'hidden', background: token.colorBgLayout }}>
        {/* 左Sider: テンプレート一覧（DataRecordDialog準拠） */}
        <Sider
          width={280}
          style={{
            background: token.colorBgContainer,
            borderRight: `1px solid ${token.colorBorder}`,
            padding: token.paddingSM,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* タイトル + 件数 */}
          <div style={{ marginBottom: token.marginSM }}>
            <Space>
              <Text strong>テンプレート</Text>
              <Tag color="blue">{filteredTemplates.length}件</Tag>
            </Space>
          </div>

          {/* 検索・カテゴリフィルタ */}
          <Space direction="vertical" style={{ width: '100%', marginBottom: token.marginMD }} size="small">
            <Input
              placeholder="テンプレート名で検索"
              prefix={<SearchOutlined />}
              value={templateSearchText}
              onChange={(e) => setTemplateSearchText(e.target.value)}
              allowClear
            />
            <Select
              placeholder="テンプレート種別"
              value={selectedTemplateCategory}
              onChange={setSelectedTemplateCategory}
              allowClear
              style={{ width: '100%' }}
              options={[
                { label: 'Materials',   value: 'Materials'   },
                { label: 'Conditions',  value: 'Conditions'  },
                { label: 'Results',     value: 'Results'     },
              ]}
            />
          </Space>

          {/* テンプレートテーブル（DataRecordDialog準拠） */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <Spin spinning={false}>
              <Table
                size="small"
                dataSource={filteredTemplates}
                rowKey="id"
                onRow={(record) => ({
                  onClick: () => setSelectedTemplateId(record.id),
                  style: { cursor: 'pointer' },
                })}
                rowClassName={(record) =>
                  record.id === resolvedSelectedId ? 'ant-table-row-selected' : ''
                }
                scroll={{ y: 400 }}
                pagination={false}
                showHeader={false}
                columns={[
                  {
                    title: 'Template',
                    dataIndex: 'name',
                    key: 'name',
                    render: (name: string, record: MockTemplate) => {
                      const isOutput = record.category === 'Results';
                      const ioLabel = isOutput ? 'OUT' : 'IN';
                      const ioColor = isOutput ? 'green' : 'blue';
                      const propertyCount = record.properties.length;
                      return (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Text strong style={{ fontSize: 13 }}>{name}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>({propertyCount}項目)</Text>
                          </div>
                          <div style={{ marginTop: 4 }}>
                            <Space size="small">
                              <Tag color={CATEGORY_COLOR[record.category]} style={{ fontSize: 11, margin: 0 }}>
                                {record.category}
                              </Tag>
                              <Tag color={ioColor} style={{ fontSize: 11, margin: 0 }}>
                                {ioLabel}
                              </Tag>
                            </Space>
                          </div>
                        </div>
                      );
                    },
                  },
                ]}
              />
            </Spin>
          </div>
        </Sider>

        {/* 右Content: データ記録 */}
        <Content
          style={{
            background: token.colorBgLayout,
            padding: token.paddingMD,
            overflow: 'auto',
          }}
        >
          <PropertyList
            template={activeTemplate}
            templateCount={visibleTemplates.length}
            templateIdx={safeIdx}
            taskTransition={displayTT}
            isReadOnly={isReadOnly}
            displayKey={displayKey}
            onActualChange={onActualChange}
            onSave={onSave}
            onSaveAndNext={onSaveAndNext}
            onTemplateIdxChange={(idx) => setSelectedTemplateId(visibleTemplates[idx]?.id ?? null)}
          />
        </Content>
      </Layout>
    </Flex>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WorkRecordPanel（エクスポート）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ASSIGNED_TASK_NO = 2; // フェーズA: 固定、フェーズBで props 化

export default function WorkRecordPanel() {
  const [tasks, setTasks] = useState<MockTask[]>(INITIAL_TASKS);
  const [viewingKey, setViewingKey] = useState<{ taskNo: number; transitionId: string } | null>(null);

  const handleActualChange = useCallback(
    (taskNo: number, transitionId: string, propKey: string, value: number | string | null) => {
      setTasks((prev) =>
        prev.map((task) => {
          if (task.taskNo !== taskNo) return task;
          return {
            ...task,
            transitions: task.transitions.map((tt) => {
              if (tt.transitionId !== transitionId) return tt;
              return { ...tt, actuals: { ...tt.actuals, [propKey]: value } };
            }),
          };
        })
      );
    },
    []
  );

  const handleSave = useCallback((_taskNo: number, _transitionId: string) => {
    Modal.success({ title: '保存しました', content: 'データを一時保存しました。' });
  }, []);

  const handleSaveAndNext = useCallback(
    (taskNo: number, transitionId: string) => {
      setTasks((prev) =>
        prev.map((task) => {
          if (task.taskNo !== taskNo) return task;
          return {
            ...task,
            transitions: task.transitions.map((tt) => {
              if (tt.transitionId !== transitionId) return tt;
              return { ...tt, status: 'completed' };
            }),
          };
        })
      );
      setViewingKey(null);

      const task = tasks.find((t) => t.taskNo === taskNo);
      if (!task) return;
      const idx = ORDERED_TRANSITION_IDS.indexOf(transitionId);
      const nextId = ORDERED_TRANSITION_IDS[idx + 1];
      const nextTt = nextId ? task.transitions.find((x) => x.transitionId === nextId) : null;

      if (nextTt) {
        Modal.success({
          title: 'トランジション完了',
          content: <span>次の作業: <Text code style={{ fontSize: 11 }}>{nextId}</Text></span>,
        });
      } else {
        Modal.success({ title: 'タスク完了', content: 'すべてのトランジションが完了しました！' });
      }
    },
    [tasks]
  );

  const planProps: PlanProps = {
    tasks,
    activeTaskNo: ASSIGNED_TASK_NO,
    viewingKey,
    instructions: MOCK_PROJECT_INSTRUCTIONS,
    onActualChange: handleActualChange,
    onSave: handleSave,
    onSaveAndNext: handleSaveAndNext,
    onClearViewing: () => setViewingKey(null),
  };

  return (
    <div style={{ flex: 1, minHeight: 0 }}>
      <PlanB {...planProps} />
    </div>
  );
}
