'use client';

/**
 * 実験作業者画面 UIリデザイン モック (v4)
 *
 * 設計ドキュメント: docs/20260611_0953_実験作業者画面UIリデザイン/PLAN.md
 *
 * v4 変更:
 *   - 案1（テンプレートボタン形式）/ 案2（左ペインにテンプレート選択）を Segmented で切り替え可能
 *   - 問題報告を IssueManagementModal に差し替え
 *     (モックのため projectId 等はダミー値、API エラーは許容)
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Button,
  Card,
  Collapse,
  Flex,
  InputNumber,
  Input,
  Tag,
  Tabs,
  Typography,
  Divider,
  Badge,
  Select,
  Modal,
  Alert,
  Row,
  Col,
  Table,
  Tooltip,
  Segmented,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  WarningOutlined,
  RightOutlined,
  CheckOutlined,
  WarningFilled,
} from '@ant-design/icons';
import IssueManagementModal from '../IssueManagementModal';

const { Text } = Typography;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 型定義
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type TransitionStatus = 'not_started' | 'in_progress' | 'completed' | 'error';
type LayoutVariant = 'plan_a' | 'plan_b';

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

/** トランジション（nameなし、IDのみ） */
interface MockTransition {
  id: string;
  order: number;
  methodId: string;
  templates: MockTemplate[];
}

/** メソッド */
interface MockMethod {
  id: string;
  order: number;
}

interface TaskTransitionState {
  transitionId: string;
  status: TransitionStatus;
  actuals: Record<string, number | string | null>;
}

interface MockTask {
  taskNo: number;
  transitions: TaskTransitionState[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// モックデータ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MOCK_PROJECT_INSTRUCTIONS = [
  '安全装備（手袋・ゴーグル）を着用して作業すること',
  '温度変化は慎重に観察し、異常があれば即座に報告すること',
  '記録は正確かつタイムリーに入力すること',
  '廃液は適切に分別して廃棄すること',
];

const PROJECT_NAME = 'SampleSynthesis';
const MOCK_PROJECT_ID = 'mock-project-id-0001';
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

/** 作業順序: メソッド order → 同メソッド内 トランジション order */
const ORDERED_TRANSITION_IDS: string[] = MOCK_METHODS
  .slice()
  .sort((a, b) => a.order - b.order)
  .flatMap((m) =>
    MOCK_TRANSITIONS.filter((t) => t.methodId === m.id)
      .sort((a, b) => a.order - b.order)
      .map((t) => t.id)
  );

const INITIAL_TASKS: MockTask[] = [
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
      marginBottom: 8,
      borderRadius: 6,
      border: '1px solid #d9d9d9',
      background: readOnly ? '#fafafa' : '#ffffff',
    }}
  >
    <Flex align="center" gap={6} style={{ marginBottom: 8 }}>
      <Text strong style={{ fontSize: 13 }}>{prop.label}</Text>
      <Tag color={XSI_COLOR[prop.xsiType] ?? 'default'} style={{ fontSize: 11, margin: 0, lineHeight: '18px' }}>
        {XSI_SHORT[prop.xsiType] ?? prop.xsiType}
      </Tag>
      <Text type="secondary" style={{ fontSize: 11 }}>({prop.key})</Text>
    </Flex>
    <Row gutter={8}>
      <Col span={12}>
        <div style={{ padding: '6px 10px', background: '#e6f7ff', border: '1px solid #bae7ff', borderRadius: 4 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>想定値</Text>
          <div style={{ marginTop: 2 }}>
            {prop.expected !== null ? (
              <Text style={{ fontSize: 14 }}>
                {prop.expected}
                {prop.unit && <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>{prop.unit}</Text>}
              </Text>
            ) : (
              <Text type="secondary" italic style={{ fontSize: 13 }}>未設定</Text>
            )}
          </div>
        </div>
      </Col>
      <Col span={12}>
        <div style={{ padding: readOnly ? '6px 10px' : '4px 8px', background: readOnly ? '#fafafa' : '#ffffff', border: '1px solid #d9d9d9', borderRadius: 4 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>実績値</Text>
          <div style={{ marginTop: 2 }}>
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

      {template.properties.map((prop) => (
        <PropertyCard
          key={prop.key}
          prop={prop}
          actual={taskTransition?.actuals[prop.key] ?? null}
          readOnly={isReadOnly}
          onChange={(key, value) => {
            if (displayKey) onActualChange(displayKey.taskNo, displayKey.transitionId, key, value);
          }}
        />
      ))}

      {/* テンプレートページネーション（案Aでのみ使用） */}
      {templateCount > 1 && (
        <Flex gap={8} justify="center" style={{ marginTop: 8 }}>
          <Button size="small" disabled={templateIdx === 0} onClick={() => onTemplateIdxChange(templateIdx - 1)}>
            ← 前
          </Button>
          <Button size="small" disabled={templateIdx >= templateCount - 1} onClick={() => onTemplateIdxChange(templateIdx + 1)}>
            次 →
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
// 案A: テンプレート選択がボタン形式（左ペインなし）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface PlanAProps {
  tasks: MockTask[];
  activeTaskNo: number;
  viewingKey: { taskNo: number; transitionId: string } | null;
  onActualChange: (taskNo: number, transitionId: string, propKey: string, value: number | string | null) => void;
  onSave: (taskNo: number, transitionId: string) => void;
  onSaveAndNext: (taskNo: number, transitionId: string) => void;
  onClearViewing: () => void;
}

const PlanA: React.FC<PlanAProps> = ({
  tasks, activeTaskNo, viewingKey, onActualChange, onSave, onSaveAndNext, onClearViewing,
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
      <InstructionCollapse />
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
// 案B: 左ペインにテンプレート選択
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface PlanBProps {
  tasks: MockTask[];
  activeTaskNo: number;
  viewingKey: { taskNo: number; transitionId: string } | null;
  onActualChange: (taskNo: number, transitionId: string, propKey: string, value: number | string | null) => void;
  onSave: (taskNo: number, transitionId: string) => void;
  onSaveAndNext: (taskNo: number, transitionId: string) => void;
  onClearViewing: () => void;
}

const PlanB: React.FC<PlanBProps> = ({
  tasks, activeTaskNo, viewingKey, onActualChange, onSave, onSaveAndNext, onClearViewing,
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
      <InstructionCollapse />
      <WorkHeader
        displayKey={displayKey} taskTransition={displayTT} transition={displayTransition ?? null}
        method={displayMethod ?? undefined} isReadOnly={isReadOnly} activeEntry={activeEntry} onClearViewing={onClearViewing}
      />

      {/* 左右分割 */}
      <Flex gap={12} style={{ flex: 1, overflow: 'hidden' }}>
        {/* 左: テンプレート選択 */}
        {visibleTemplates.length > 0 && (
          <div style={{ width: 200, flexShrink: 0, overflowY: 'auto' }}>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, paddingBottom: 4, display: 'block' }}>
              テンプレート
            </Text>
            {visibleTemplates.map((tpl, idx) => {
              const isActive = idx === safeIdx;
              return (
                <div
                  key={tpl.id}
                  onClick={() => setTemplateIdx(idx)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 4,
                    border: `1px solid ${isActive ? '#722ed1' : '#d9d9d9'}`,
                    background: isActive ? '#f9f0ff' : '#fafafa',
                    cursor: 'pointer',
                    marginBottom: 4,
                  }}
                >
                  <Flex justify="space-between" align="center">
                    <Text style={{ fontSize: 11, fontWeight: isActive ? 600 : 400 }}>{tpl.name}</Text>
                    <Tag color={CATEGORY_COLOR[tpl.category]} style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>
                      {tpl.category.slice(0, 4)}
                    </Tag>
                  </Flex>
                </div>
              );
            })}
          </div>
        )}

        {/* 右: プロパティカード */}
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
    </Flex>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// プロジェクト指示（折りたたみ）共通部品
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const InstructionCollapse: React.FC = () => (
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
            <Badge count={MOCK_PROJECT_INSTRUCTIONS.length} size="small" color="#faad14" />
          </Flex>
        ),
        children: (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {MOCK_PROJECT_INSTRUCTIONS.map((inst, i) => (
              <li key={i} style={{ fontSize: 13, color: '#595959', marginBottom: 4 }}>{inst}</li>
            ))}
          </ul>
        ),
      },
    ]}
  />
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// タブ2: 全体進捗
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ProgressOverviewTabProps {
  tasks: MockTask[];
  onGoToWork: (taskNo: number, transitionId: string) => void;
  onViewDetail: (taskNo: number, transitionId: string) => void;
}

interface ProgressRow {
  rowKey: string;
  taskNo: number;
  methodId: string;
  transitionId: string;
  status: TransitionStatus;
  hasRecord: boolean;
}

const ProgressOverviewTab: React.FC<ProgressOverviewTabProps> = ({ tasks, onGoToWork, onViewDetail }) => {
  const [filterTaskNo, setFilterTaskNo] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<TransitionStatus | null>(null);

  const allRows: ProgressRow[] = useMemo(() => {
    const rows: ProgressRow[] = [];
    tasks.forEach((task) => {
      ORDERED_TRANSITION_IDS.forEach((tid) => {
        const tt = task.transitions.find((x) => x.transitionId === tid);
        const trans = MOCK_TRANSITIONS.find((t) => t.id === tid);
        if (!tt || !trans) return;
        rows.push({
          rowKey: `${task.taskNo}-${tid}`,
          taskNo: task.taskNo,
          methodId: trans.methodId,
          transitionId: tid,
          status: tt.status,
          hasRecord: Object.values(tt.actuals).some((v) => v !== null),
        });
      });
    });
    return rows;
  }, [tasks]);

  const filteredRows = useMemo(
    () => allRows.filter((r) => {
      if (filterTaskNo !== null && r.taskNo !== filterTaskNo) return false;
      if (filterStatus !== null && r.status !== filterStatus) return false;
      return true;
    }),
    [allRows, filterTaskNo, filterStatus]
  );

  const taskNos = useMemo(() => [...new Set(allRows.map((r) => r.taskNo))], [allRows]);

  const columns: ColumnsType<ProgressRow> = [
    {
      title: 'タスクNo', dataIndex: 'taskNo', width: 90, align: 'center',
      render: (v: number) => <Text strong>#{v}</Text>,
    },
    {
      title: 'メソッドID', dataIndex: 'methodId', ellipsis: { showTitle: false },
      render: (v: string) => <Tooltip title={v}><Text code style={{ fontSize: 11 }}>{v}</Text></Tooltip>,
    },
    {
      title: 'トランジションID', dataIndex: 'transitionId', ellipsis: { showTitle: false },
      render: (v: string) => <Tooltip title={v}><Text code style={{ fontSize: 11 }}>{v}</Text></Tooltip>,
    },
    {
      title: 'ステータス', dataIndex: 'status', width: 110, align: 'center',
      render: (v: TransitionStatus) => <Tag color={STATUS_CONFIG[v].color}>{STATUS_CONFIG[v].label}</Tag>,
    },
    {
      title: '記録', dataIndex: 'hasRecord', width: 70, align: 'center',
      render: (v: boolean) =>
        v ? <Tag color="green" icon={<CheckOutlined />}>あり</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: '操作', width: 110, align: 'center',
      render: (_: unknown, r: ProgressRow) => {
        if (r.status === 'completed' || r.status === 'error') {
          return <Button size="small" onClick={() => onViewDetail(r.taskNo, r.transitionId)}>詳細確認</Button>;
        }
        if (r.status === 'in_progress') {
          return <Button type="primary" size="small" onClick={() => onGoToWork(r.taskNo, r.transitionId)}>作業へ</Button>;
        }
        return <Text type="secondary">—</Text>;
      },
    },
  ];

  return (
    <Flex vertical style={{ height: '100%' }}>
      <Flex gap={8} align="center" style={{ padding: '4px 0 10px' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>フィルタ:</Text>
        <Select allowClear size="small" placeholder="タスクNo" style={{ width: 90 }}
          value={filterTaskNo} onChange={(v) => setFilterTaskNo(v ?? null)}
          options={taskNos.map((n) => ({ label: `#${n}`, value: n }))} />
        <Select allowClear size="small" placeholder="ステータス" style={{ width: 120 }}
          value={filterStatus} onChange={(v) => setFilterStatus(v ?? null)}
          options={[
            { label: '未着手', value: 'not_started' },
            { label: '作業中', value: 'in_progress' },
            { label: '完了',   value: 'completed'   },
            { label: '異常終了', value: 'error'     },
          ]} />
        <Text type="secondary" style={{ fontSize: 11 }}>{filteredRows.length}/{allRows.length} 件</Text>
      </Flex>
      <Table<ProgressRow>
        dataSource={filteredRows} columns={columns} rowKey="rowKey"
        size="small" pagination={false} bordered scroll={{ y: 'calc(100vh - 420px)' }}
      />
    </Flex>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// メインコンポーネント
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ASSIGNED_TASK_NO = 2;

const ExperimentWorkerScreenMock: React.FC = () => {
  const [tasks, setTasks] = useState<MockTask[]>(INITIAL_TASKS);
  const [activeTab, setActiveTab] = useState<'work_record' | 'progress_overview'>('work_record');
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [viewingKey, setViewingKey] = useState<{ taskNo: number; transitionId: string } | null>(null);
  const [layoutVariant, setLayoutVariant] = useState<LayoutVariant>('plan_a');

  // 現在作業中エントリ
  const activeEntry = useMemo((): { taskNo: number; transitionId: string } | null => {
    const task = tasks.find((t) => t.taskNo === ASSIGNED_TASK_NO);
    if (!task) return null;
    for (const tid of ORDERED_TRANSITION_IDS) {
      const tt = task.transitions.find((x) => x.transitionId === tid);
      if (tt && tt.status !== 'completed' && tt.status !== 'error') {
        return { taskNo: ASSIGNED_TASK_NO, transitionId: tid };
      }
    }
    return null;
  }, [tasks]);

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

  const handleGoToWork = useCallback(() => {
    setViewingKey(null);
    setActiveTab('work_record');
  }, []);

  const handleViewDetail = useCallback((taskNo: number, transitionId: string) => {
    setViewingKey({ taskNo, transitionId });
    setActiveTab('work_record');
  }, []);

  const workRecordProps = {
    tasks,
    activeTaskNo: ASSIGNED_TASK_NO,
    viewingKey,
    onActualChange: handleActualChange,
    onSave: handleSave,
    onSaveAndNext: handleSaveAndNext,
    onClearViewing: () => setViewingKey(null),
  };

  return (
    <Flex vertical style={{ height: '100%', minHeight: 0 }}>
      {/* ── ヘッダー ── */}
      <Card size="small" style={{ marginBottom: 8, background: '#fafafa' }} bodyStyle={{ padding: '8px 12px' }}>
        <Flex justify="space-between" align="center">
          <Flex align="center" gap={12} wrap="wrap">
            <Flex align="center" gap={6}>
              <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>プロジェクト:</Text>
              <Select size="small" value="SampleSynthesis" style={{ width: 200 }}
                options={[
                  { label: 'SampleSynthesis', value: 'SampleSynthesis' },
                  { label: 'CatalystStudy',   value: 'CatalystStudy'   },
                ]} />
            </Flex>

            {/* 案切り替え */}
            <Flex align="center" gap={6}>
              <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>レイアウト:</Text>
              <Segmented
                size="small"
                value={layoutVariant}
                onChange={(v) => setLayoutVariant(v as LayoutVariant)}
                options={[
                  { label: '案A（テンプレートボタン）', value: 'plan_a' },
                  { label: '案B（左ペイン選択）',       value: 'plan_b' },
                ]}
              />
            </Flex>
          </Flex>

          {/* 問題報告: IssueManagementModal を開く */}
          <Tooltip title={activeEntry ? `作業中: ${activeEntry.transitionId}` : '現在作業中のトランジションなし'}>
            <Button
              type="primary"
              danger
              icon={<WarningFilled />}
              onClick={() => setIssueModalOpen(true)}
            >
              問題報告
            </Button>
          </Tooltip>
        </Flex>
      </Card>

      {/* ── タブ ── */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as typeof activeTab)}
        type="card"
        size="small"
        style={{ flex: 1, minHeight: 0 }}
        tabBarStyle={{ marginBottom: 0 }}
        items={[
          {
            key: 'work_record',
            label: '作業記録',
            children: (
              <div style={{ padding: 12, height: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                {layoutVariant === 'plan_a' ? (
                  <PlanA {...workRecordProps} />
                ) : (
                  <PlanB {...workRecordProps} />
                )}
              </div>
            ),
          },
          {
            key: 'progress_overview',
            label: (
              <Flex align="center" gap={6}>
                全体進捗
                <Badge
                  count={tasks.flatMap((t) => t.transitions).filter((tt) => tt.status === 'in_progress').length}
                  size="small"
                  color="#1890ff"
                />
              </Flex>
            ),
            children: (
              <div style={{ padding: 12, height: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                <ProgressOverviewTab
                  tasks={tasks}
                  onGoToWork={handleGoToWork}
                  onViewDetail={handleViewDetail}
                />
              </div>
            ),
          },
        ]}
      />

      {/* 問題管理モーダル（IssueManagementModal） */}
      <IssueManagementModal
        open={issueModalOpen}
        targetName={PROJECT_NAME}
        projectId={MOCK_PROJECT_ID}
        projectName={PROJECT_NAME}
        methodId={activeEntry ? MOCK_TRANSITIONS.find((t) => t.id === activeEntry.transitionId)?.methodId : undefined}
        taskNo={activeEntry?.taskNo}
        transitionId={activeEntry?.transitionId}
        onClose={() => setIssueModalOpen(false)}
      />
    </Flex>
  );
};

export default ExperimentWorkerScreenMock;
