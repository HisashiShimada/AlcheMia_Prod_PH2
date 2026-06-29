/**
 * ExperimentPlanDialog.tsx
 * 実験計画詳細指示ダイアログ
 *
 * レイアウト（案3: タブ切替固定）:
 * ┌───────────────────────────────────────────────────────────┐
 * │  実験計画詳細指示 — {methodId}                       [✕] │
 * ├───────────────────────┬───────────────────────────────────┤
 * │ トランジション一覧    │ [全体][タスク1][タスク2]...       │
 * │ ┌──────────────────┐  │ [基本情報][テンプレート入力]      │
 * │ │ Transition1      │  │ ─────────────────────────────     │
 * │ │ Transition2   ◉  │  │ 【CreatorRef】                    │
 * │ │ Transition3      │  │ [プルダウン ▼] [追加]            │
 * │ └──────────────────┘  │ ・creator_001  [×]               │
 * │ （単体行選択）         │                                   │
 * │                       │ 【InstrumentRef】                 │
 * │                       │ [プルダウン ▼] [追加]            │
 * │                       │                                   │
 * │                       │ 【注意事項】                      │
 * │                       │ [タイプ選択 ▼] [追加]            │
 * └───────────────────────┴───────────────────────────────────┤
 * │                               [キャンセル] [保存]          │
 * └───────────────────────────────────────────────────────────┘
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Modal,
  Tabs,
  Select,
  Input,
  InputNumber,
  Button,
  Card,
  Space,
  Typography,
  Row,
  Col,
  App,
  theme,
  Divider,
  Empty,
  Spin,
  Table,
  Tag,
  Form,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  CloseOutlined,
  FileTextOutlined,
  ImportOutlined,
  ExportOutlined,
  DeleteOutlined,
  HolderOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  NoteType,
  NOTE_TYPE_LABELS,
} from '@/types/experimentPlan';
import type {
  NoteItem,
  NoteTypeValue,
  ExperimentPlanTabData,
  ExperimentPlanDialogProps,
  SaveExperimentPlanRequest,
  TemplateDef,
} from '@/types/experimentPlan';
import {
  saveExperimentPlan,
  getPlanDialogData,
  MOCK_PLAN_DIALOG_DATA,
} from '@/services/experimentPlanApiService';
import type { PlanDialogData } from '@/services/experimentPlanApiService';
import UncertaintyCriteriaSelectorModal from '@/components/uncertainty/UncertaintyCriteriaSelectorModal';
import type { TargetProperty, AssignPayload } from '@/components/uncertainty/UncertaintyCriteriaSelectorModal';

const { Text } = Typography;
const { TextArea } = Input;
const { useToken } = theme;

/** 全体タブのキー定数 */
const TAB_KEY_ALL = 'all';

/**
 * 継承の上書きフラグが追跡するフィールド名
 * 全体タブ変更時に、このフィールド単位でタスクNへ伝播するかどうかを判断する
 */
type InheritableField = 'creatorRefs' | 'instrumentRefs' | 'ownerRefs' | 'notes' | 'templateValues';

/**
 * タブデータの初期値を生成する
 */
function createInitialTabData(): ExperimentPlanTabData {
  return {
    selectedTransitions: [],
    creatorRefs: [],
    instrumentRefs: [],
    ownerRefs: [],
    notes: [],
    templateValues: {},
  };
}

/** トランジション行の型 */
interface TransitionRow {
  id: string;
  name: string;
  /** 前提となるトランジションIDの配列（空配列 = 依存なし） */
  prerequisiteTransitionIds?: string[];
}

/**
 * 実行順序リストの要素型
 * isFixed を廃止し、prerequisiteTransitionIds による依存関係制約に移行
 */
interface TransitionOrderItem {
  id: string;
  name: string;
  order: number;
  /**
   * ステップ番号（依存の深さ）
   * - 依存なし → ステップ1
   * - 全依存先の最大ステップ+1 → 自身のステップ
   */
  step: number;
  /** 前提となるトランジションIDの配列（空配列 = 依存なし） */
  prerequisiteTransitionIds: string[];
}

/**
 * トランジションの依存関係からステップ番号を計算する。
 *
 * ステップの定義:
 *   - 依存なし（前提トランジションがない）→ ステップ1
 *   - 全依存先の最大ステップ番号 + 1 → 自身のステップ番号
 *
 * 例）画像の推移図:
 *   A（依存なし）→ ステップ1
 *   C（依存なし）→ ステップ1
 *   B（A に依存）→ ステップ2
 *   D（C に依存）→ ステップ2
 *   E（B, D に依存）→ ステップ3
 *   F（E に依存）→ ステップ4
 *   G（E に依存）→ ステップ4
 *   H（F, G に依存）→ ステップ5
 */
function calculateSteps(transitions: TransitionOrderItem[]): TransitionOrderItem[] {
  const stepMap = new Map<string, number>();

  const getStep = (id: string, visited = new Set<string>()): number => {
    if (stepMap.has(id)) return stepMap.get(id)!;
    if (visited.has(id)) return 1; // 循環参照の場合はステップ1として扱う

    visited.add(id);
    const trans = transitions.find((t) => t.id === id);

    // 依存なし → ステップ1
    if (!trans || trans.prerequisiteTransitionIds.length === 0) {
      stepMap.set(id, 1);
      return 1;
    }

    // 全依存先の最大ステップ番号 + 1
    const maxPrereqStep = Math.max(
      ...trans.prerequisiteTransitionIds.map((prereqId) =>
        getStep(prereqId, new Set(visited))
      )
    );
    const step = maxPrereqStep + 1;
    stepMap.set(id, step);
    return step;
  };

  transitions.forEach((t) => getStep(t.id));

  return transitions.map((t) => ({
    ...t,
    step: stepMap.get(t.id) ?? 1,
  }));
}

/**
 * 指定トランジションを targetOrder へ移動できるか判定する。
 *
 * チェック項目:
 *   A) 自分の依存先（prerequisiteTransitionIds）が全て targetOrder より小さい order にあるか
 *   B) 自分に直接依存しているトランジションが全て targetOrder より大きい order にあるか
 *      ※ 準備A が混合より後ろに移動するのを防ぐ
 */
function canMoveToOrder(
  transitionId: string,
  targetOrder: number,
  currentOrderList: TransitionOrderItem[]
): { canMove: boolean; reason?: string } {
  const target = currentOrderList.find((t) => t.id === transitionId);
  if (!target) return { canMove: false, reason: 'トランジションが見つかりません' };

  // A) 依存先チェック（自分の prereqs が全て targetOrder より前にあるか）
  for (const prereqId of target.prerequisiteTransitionIds) {
    const prereq = currentOrderList.find((t) => t.id === prereqId);
    if (prereq && prereq.order >= targetOrder) {
      return {
        canMove: false,
        reason: `依存先「${prereq.name}」（順序: ${prereq.order}）より前には移動できません`,
      };
    }
  }

  // B) 子孫チェック（自分に直接依存しているトランジションが全て targetOrder より後ろにあるか）
  const dependents = currentOrderList.filter((t) =>
    t.prerequisiteTransitionIds.includes(transitionId)
  );
  for (const dep of dependents) {
    if (dep.order <= targetOrder) {
      return {
        canMove: false,
        reason: `依存されている「${dep.name}」（順序: ${dep.order}）より後ろには移動できません`,
      };
    }
  }

  return { canMove: true };
}

/**
 * 指定トランジションとその「強制連動が必要な」子孫を収集する。
 *
 * 連動ルール:
 *   子 C が連動対象になるのは「C の全 prereqs がすでに subtree に含まれている場合のみ」。
 *   例: 混合（prereqs=[A, B]）は、A と B の両方が subtree に含まれている場合だけ連動。
 *       B だけ移動するとき、A は subtree 外なので混合は連動しない。
 *
 * 返却値は currentOrder 順にソートされた TransitionOrderItem[]。
 */
function collectTransitionSubtree(
  transitionId: string,
  allTransitions: TransitionOrderItem[]
): TransitionOrderItem[] {
  const subtreeIds = new Set<string>();

  // BFS で「全 prereqs が subtree 内に収まっている子」だけを追加していく
  const queue: string[] = [transitionId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (subtreeIds.has(id)) continue;
    subtreeIds.add(id);

    // このノードを subtree に追加したことで連動対象になる子を探す
    for (const child of allTransitions) {
      if (subtreeIds.has(child.id)) continue;
      // 子の全 prereqs が subtree に含まれている場合のみ連動
      const allPrereqsInSubtree = child.prerequisiteTransitionIds.every((prereqId) =>
        subtreeIds.has(prereqId)
      );
      if (allPrereqsInSubtree && child.prerequisiteTransitionIds.length > 0) {
        queue.push(child.id);
      }
    }
  }

  return allTransitions
    .filter((t) => subtreeIds.has(t.id))
    .sort((a, b) => a.order - b.order);
}

/**
 * 指定トランジションとその全子孫を targetOrder に移動する。
 * targetOrder は「移動対象グループの先頭が置かれるべき order 値」。
 *
 * アルゴリズム:
 *   1. 移動対象グループ（transitionId + 全子孫）を収集
 *   2. 残り（グループ以外）を元の order 順で並べる
 *   3. 残りの列の targetOrder-1 の位置にグループを挿入
 *   4. order を 1 から振り直す
 */
function moveTransitionWithSubtree(
  transitionId: string,
  targetOrder: number,
  currentOrderList: TransitionOrderItem[]
): TransitionOrderItem[] {
  const subtree = collectTransitionSubtree(transitionId, currentOrderList);
  const subtreeIds = new Set(subtree.map((t) => t.id));

  // グループ以外を元の order 順で取得
  const others = currentOrderList
    .filter((t) => !subtreeIds.has(t.id))
    .sort((a, b) => a.order - b.order);

  // targetOrder-1 の位置にグループを挿入
  const insertAt = Math.max(0, Math.min(targetOrder - 1, others.length));
  const result = [
    ...others.slice(0, insertAt),
    ...subtree,
    ...others.slice(insertAt),
  ];

  // order を 1 から振り直す
  return result.map((item, i) => ({ ...item, order: i + 1 }));
}

/** カスタムプロパティ型（テンプレート入力で追加できるプロパティ） */
type CustomPropType =
  | 'stringType' | 'intType' | 'floatType' | 'doubleType' | 'booleanType'
  | 'dateType' | 'dateTimeType';

/** カスタムプロパティ値 */
interface CustomPropValue {
  id: string;
  key: string;
  type: CustomPropType;
  value: string;
  units: string;
}

/**
 * Ref追加エリアコンポーネント（Creator / Instrument / Owner 共通）
 */
interface RefSectionProps {
  title: string;
  options: string[];
  selectedValues: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  disabled?: boolean;
  testIdPrefix: string;
}

const RefSection: React.FC<RefSectionProps> = ({
  title,
  options,
  selectedValues,
  onAdd,
  onRemove,
  disabled = false,
  testIdPrefix,
}) => {
  const { token } = useToken();
  const [selectValue, setSelectValue] = useState<string | undefined>(undefined);

  // 未選択のオプションのみ表示（既に追加済みのものは除く）
  const availableOptions = useMemo(
    () => options.filter((o) => !selectedValues.includes(o)),
    [options, selectedValues]
  );

  const handleAdd = () => {
    if (!selectValue) return;
    onAdd(selectValue);
    setSelectValue(undefined);
  };

  return (
    <div>
      <Text strong style={{ fontSize: 13 }}>
        {title}
      </Text>
      <Space style={{ marginTop: 6, width: '100%' }} direction="vertical" size={6}>
        {/* 追加行 */}
        <Space>
          <Select
            value={selectValue}
            onChange={setSelectValue}
            options={availableOptions.map((o) => ({ label: o, value: o }))}
            style={{ minWidth: 220 }}
            placeholder={`${title}を選択`}
            disabled={disabled}
            data-testid={`${testIdPrefix}-select`}
          />
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            disabled={disabled || !selectValue}
            data-testid={`${testIdPrefix}-add-button`}
          >
            追加
          </Button>
        </Space>
        {/* 追加済みリスト */}
        {selectedValues.length > 0 && (
          <div
            style={{
              padding: '8px 12px',
              border: `1px solid ${token.colorBorder}`,
              borderRadius: token.borderRadius,
              backgroundColor: token.colorFillAlter,
              minHeight: 36,
            }}
          >
            <Space size={4} wrap>
              {selectedValues.map((v) => (
                <Tag
                  key={v}
                  closable={!disabled}
                  onClose={() => onRemove(v)}
                  color="blue"
                  style={{ margin: 2 }}
                >
                  {v}
                </Tag>
              ))}
            </Space>
          </div>
        )}
      </Space>
    </div>
  );
};

// ============================================================
// テンプレート入力コンポーネント（MAIMLテンプレートデータベース）
// ============================================================

/**
 * テンプレート入力コンポーネント
 *
 * DataRecordDialog のレイアウトに準拠：
 * - 左側: メソッドに紐づくテンプレート一覧（行選択）
 * - 右側: 選択したテンプレートの入力フィールド一覧
 *
 * methodTemplates が空の場合は「テンプレートが未定義」メッセージを表示する
 */
const CUSTOM_PROP_TYPE_OPTIONS: { value: CustomPropType; label: string }[] = [
  { value: 'stringType',   label: '文字列 (string)' },
  { value: 'intType',      label: '整数 (int)' },
  { value: 'floatType',    label: '実数 (float)' },
  { value: 'doubleType',   label: '実数 (double)' },
  { value: 'booleanType',  label: '真偽値 (boolean)' },
  { value: 'dateType',     label: '日付 (date)' },
  { value: 'dateTimeType', label: '日時 (dateTime)' },
];

interface TemplateInputPanelProps {
  /** MAIMLから生成したテンプレート定義一覧 */
  methodTemplates: TemplateDef[];
  /** テンプレートの入力値 `{templateId_fieldKey: value}` 形式 */
  templateValues: Record<string, string | number | boolean>;
  onValueChange: (key: string, value: string | number | boolean) => void;
  /** カスタムプロパティ（templateId → CustomPropValue[]） */
  customProps: Record<string, CustomPropValue[]>;
  onCustomPropsChange: (templateId: string, props: CustomPropValue[]) => void;
  disabled?: boolean;
}

const TemplateInputPanel: React.FC<TemplateInputPanelProps> = ({
  methodTemplates,
  templateValues,
  onValueChange,
  customProps,
  onCustomPropsChange,
  disabled = false,
}) => {
  const { token } = useToken();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState('');
  const [pendingType, setPendingType] = useState<CustomPropType>('stringType');
  const [pendingUnits, setPendingUnits] = useState('');

  // 不確かさ基準選択モーダル用 state
  const [criteriaSelectorOpen, setCriteriaSelectorOpen] = useState(false);
  const [criteriaSelectorTarget, setCriteriaSelectorTarget] = useState<TargetProperty | null>(null);

  // methodTemplates が変わった（メソッド切り替え等）場合は選択リセット
  useEffect(() => {
    setSelectedTemplateId(null);
  }, [methodTemplates]);

  const selectedTemplate = methodTemplates.find((t) => t.id === selectedTemplateId) ?? null;

  /** 選択中テンプレートのカスタムプロパティを追加 */
  const handleAddCustomProp = () => {
    if (!selectedTemplate || !pendingKey.trim()) return;
    const existing = customProps[selectedTemplate.id] ?? [];
    const newProp: CustomPropValue = {
      id: `cp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      key: pendingKey.trim(),
      type: pendingType,
      value: '',
      units: pendingUnits,
    };
    onCustomPropsChange(selectedTemplate.id, [...existing, newProp]);
    setPendingKey('');
    setPendingUnits('');
  };

  /** カスタムプロパティを削除 */
  const handleRemoveCustomProp = (templateId: string, propId: string) => {
    const existing = customProps[templateId] ?? [];
    onCustomPropsChange(templateId, existing.filter((p) => p.id !== propId));
  };

  /** カスタムプロパティの値を更新 */
  const handleCustomPropValueChange = (templateId: string, propId: string, value: string) => {
    const existing = customProps[templateId] ?? [];
    onCustomPropsChange(
      templateId,
      existing.map((p) => (p.id === propId ? { ...p, value } : p))
    );
  };

  if (methodTemplates.length === 0) {
    return (
      <div
        style={{
          minHeight: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1px dashed ${token.colorBorder}`,
          borderRadius: token.borderRadius,
          backgroundColor: token.colorFillAlter,
        }}
      >
        <Empty
          description="このメソッドにはテンプレートが定義されていません"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  const currentCustomProps = selectedTemplate ? (customProps[selectedTemplate.id] ?? []) : [];

  return (
    <div>
      <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
        テンプレート入力
      </Text>

      <Row gutter={12}>
        {/* 左側: テンプレート一覧 */}
        <Col span={10}>
          <Card
            size="small"
            title={<Text style={{ fontSize: 12 }}>テンプレート一覧</Text>}
            styles={{ body: { padding: 0 } }}
          >
            <Table<TemplateDef>
              dataSource={methodTemplates}
              rowKey="id"
              size="small"
              pagination={false}
              showHeader={false}
              columns={[
                {
                  dataIndex: 'label',
                  key: 'label',
                  render: (label: string, record: TemplateDef) => (
                    <Space direction="vertical" size={0}>
                      <Text style={{ fontSize: 12 }}>{label}</Text>
                      <Tag
                        color={
                          record.category === 'material'
                            ? 'green'
                            : record.category === 'condition'
                            ? 'blue'
                            : 'orange'
                        }
                        style={{ fontSize: 10, margin: 0 }}
                      >
                        {record.category}
                      </Tag>
                    </Space>
                  ),
                },
              ]}
              onRow={(record) => ({
                onClick: () => {
                  if (disabled) return;
                  setSelectedTemplateId(
                    selectedTemplateId === record.id ? null : record.id
                  );
                },
                style: {
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  backgroundColor:
                    selectedTemplateId === record.id
                      ? token.colorPrimaryBg
                      : undefined,
                  transition: 'background-color 0.15s',
                },
              })}
            />
          </Card>
        </Col>

        {/* 右側: 選択テンプレートの入力フィールド */}
        <Col span={14}>
          {selectedTemplate === null ? (
            <div
              style={{
                height: '100%',
                minHeight: 120,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px dashed ${token.colorBorder}`,
                borderRadius: token.borderRadius,
                backgroundColor: token.colorFillAlter,
              }}
            >
              <Empty
                description="テンプレートを選択してください"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          ) : (
            <Card
              size="small"
              title={<Text style={{ fontSize: 12 }}>{selectedTemplate.label}</Text>}
              styles={{ body: { maxHeight: 420, overflowY: 'auto' } }}
            >
              {/* ── 定義済みフィールド ── */}
              {selectedTemplate.fields.length === 0 ? (
                <Empty
                  description="フィールドが定義されていません"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ marginBottom: 8 }}
                />
              ) : (
                <div>
                  {selectedTemplate.fields.map((field) => {
                    const valueKey = `${selectedTemplate.id}_${field.key}`;
                    return (
                      <div key={valueKey} style={{ marginBottom: 10 }}>
                        {/* ラベル行: フィールド名・単位を左、不確かさ選択ボタンを右端 */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 4,
                          }}
                        >
                          <Space size={4}>
                            <Text style={{ fontSize: 12 }}>
                              {field.label || field.key}
                              {field.required && (
                                <span style={{ color: token.colorError, marginLeft: 2 }}>*</span>
                              )}
                            </Text>
                            {field.units && (
                              <Tag color="blue" style={{ fontSize: 10 }}>
                                {field.units}
                              </Tag>
                            )}
                          </Space>
                          <Button
                            type="primary"
                            size="small"
                            disabled={disabled}
                            onClick={() => {
                              setCriteriaSelectorTarget({
                                name: field.label || field.key,
                                xpath: field.key,
                                tag: 'property',
                                type: field.type,
                                value: String(templateValues[valueKey] ?? ''),
                                unit: field.units ?? '',
                                section: selectedTemplate.category as 'material' | 'condition' | 'result',
                              });
                              setCriteriaSelectorOpen(true);
                            }}
                          >
                            不確かさ選択
                          </Button>
                        </div>
                        {/* 入力欄 */}
                        {field.type === 'number' ? (
                          <InputNumber
                            value={templateValues[valueKey] as number | undefined}
                            onChange={(value) => {
                              if (value !== null) onValueChange(valueKey, value);
                            }}
                            style={{ width: '100%' }}
                            placeholder={`${field.label || field.key}を入力`}
                            disabled={disabled}
                            data-testid={`template-input-${field.key}`}
                          />
                        ) : field.type === 'select' ? (
                          <Select
                            value={templateValues[valueKey] as string | undefined}
                            onChange={(value) => onValueChange(valueKey, value)}
                            options={(field.options ?? []).map((o) => ({ label: o, value: o }))}
                            style={{ width: '100%' }}
                            placeholder={`${field.label || field.key}を選択`}
                            disabled={disabled}
                            data-testid={`template-input-${field.key}`}
                          />
                        ) : (
                          <Input
                            value={templateValues[valueKey] as string | undefined}
                            onChange={(e) => onValueChange(valueKey, e.target.value)}
                            placeholder={`${field.label || field.key}を入力`}
                            disabled={disabled}
                            data-testid={`template-input-${field.key}`}
                          />
                        )}
                        {field.description && (
                          <Text type="secondary" style={{ fontSize: 10 }}>
                            {field.description}
                          </Text>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <Divider style={{ margin: '8px 0' }} />

              {/* ── カスタムプロパティ追加エリア ── */}
              <div>
                <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                  プロパティを追加
                </Text>
                <Space wrap style={{ marginBottom: 6 }}>
                  <Input
                    placeholder="Key（プロパティ名）"
                    value={pendingKey}
                    onChange={(e) => setPendingKey(e.target.value)}
                    style={{ width: 160 }}
                    size="small"
                    disabled={disabled}
                  />
                  <Select
                    value={pendingType}
                    onChange={setPendingType}
                    options={CUSTOM_PROP_TYPE_OPTIONS}
                    style={{ width: 160 }}
                    size="small"
                    disabled={disabled}
                  />
                  <Input
                    placeholder="単位（任意）"
                    value={pendingUnits}
                    onChange={(e) => setPendingUnits(e.target.value)}
                    style={{ width: 100 }}
                    size="small"
                    disabled={disabled}
                  />
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={handleAddCustomProp}
                    disabled={disabled || !pendingKey.trim()}
                  >
                    追加
                  </Button>
                </Space>

                {/* 追加済みカスタムプロパティ一覧 */}
                {currentCustomProps.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    {currentCustomProps.map((cp) => (
                      <div
                        key={cp.id}
                        style={{
                          display: 'flex',
                          gap: 6,
                          alignItems: 'center',
                          marginBottom: 6,
                          padding: '4px 8px',
                          border: `1px solid ${token.colorBorder}`,
                          borderRadius: token.borderRadius,
                          backgroundColor: token.colorFillAlter,
                        }}
                      >
                        <Text style={{ fontSize: 11, minWidth: 90, flexShrink: 0 }}>
                          {cp.key}
                          {cp.units && (
                            <Tag color="blue" style={{ fontSize: 9, margin: '0 0 0 4px' }}>
                              {cp.units}
                            </Tag>
                          )}
                        </Text>
                        <Tag style={{ fontSize: 10, flexShrink: 0 }}>{cp.type}</Tag>
                        <Input
                          value={cp.value}
                          onChange={(e) =>
                            handleCustomPropValueChange(selectedTemplate.id, cp.id, e.target.value)
                          }
                          placeholder="値を入力"
                          size="small"
                          style={{ flex: 1, minWidth: 80 }}
                          disabled={disabled}
                        />
                        <Button
                          type="primary"
                          size="small"
                          disabled={disabled}
                          onClick={() => {
                            setCriteriaSelectorTarget({
                              name: cp.key,
                              xpath: cp.key,
                              tag: 'property',
                              type: cp.type,
                              value: cp.value,
                              unit: cp.units,
                              section: selectedTemplate.category as 'material' | 'condition' | 'result',
                            });
                            setCriteriaSelectorOpen(true);
                          }}
                        >
                          不確かさ選択
                        </Button>
                        <Tooltip title="削除">
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => handleRemoveCustomProp(selectedTemplate.id, cp.id)}
                            disabled={disabled}
                          />
                        </Tooltip>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}
        </Col>
      </Row>

      {/* 不確かさ基準選択モーダル */}
      <UncertaintyCriteriaSelectorModal
        open={criteriaSelectorOpen}
        onClose={() => {
          setCriteriaSelectorOpen(false);
          setCriteriaSelectorTarget(null);
        }}
        targetProperty={criteriaSelectorTarget}
        onAssign={(_payload: AssignPayload) => {
          // 付与結果の処理（必要に応じて拡張）
          setCriteriaSelectorOpen(false);
          setCriteriaSelectorTarget(null);
        }}
      />
    </div>
  );
};

// ============================================================
// SortableTransitionRow — ドラッグ&ドロップ可能なトランジション行
// ============================================================

interface SortableTransitionRowProps {
  id: string;
  order: number;
  /** ステップ番号（依存の深さから計算） */
  step: number;
  name: string;
  /** 前提となるトランジションIDの配列（空配列 = 依存なし） */
  prerequisiteTransitionIds: string[];
  /** 依存関係のルックアップ用（ツールチップに名前・順序を表示するため全件渡す） */
  allTransitionOrderItems: TransitionOrderItem[];
  maxOrder: number;
  onOrderChange: (id: string, newOrder: number) => void;
  disabled: boolean;
  token: ReturnType<typeof useToken>['token'];
}

const SortableTransitionRow: React.FC<SortableTransitionRowProps> = ({
  id,
  order,
  step,
  name,
  prerequisiteTransitionIds,
  allTransitionOrderItems,
  maxOrder,
  onOrderChange,
  disabled,
  token,
}) => {
  const hasPrereqs = prerequisiteTransitionIds.length > 0;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 6px',
    border: `1px solid ${hasPrereqs ? token.colorInfoBorder : token.colorBorder}`,
    borderRadius: token.borderRadius,
    backgroundColor: hasPrereqs ? token.colorInfoBg : token.colorFillAlter,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* ドラッグハンドル（常に表示） */}
      <div
        {...attributes}
        {...listeners}
        style={{ cursor: disabled ? 'not-allowed' : 'grab', color: token.colorTextQuaternary, flexShrink: 0, lineHeight: 1 }}
      >
        <HolderOutlined style={{ fontSize: 12 }} />
      </div>

      {/* 順序番号 Select */}
      <Select
        size="small"
        value={order}
        onChange={(val) => onOrderChange(id, val)}
        disabled={disabled}
        style={{ width: 52, flexShrink: 0 }}
        popupMatchSelectWidth={false}
        options={Array.from({ length: maxOrder }, (_, i) => {
          const targetOrder = i + 1;
          const { canMove } = canMoveToOrder(id, targetOrder, allTransitionOrderItems);
          return {
            label: String(targetOrder),
            value: targetOrder,
            // 依存先が targetOrder 以降にある場合は選択不可
            disabled: !canMove,
          };
        })}
      />

      {/* ステップ番号 Tag */}
      <Tooltip title={`ステップ ${step}（依存の深さ ${step - 1}）`}>
        <Tag
          color="purple"
          style={{ margin: 0, cursor: 'default', fontSize: 10, flexShrink: 0 }}
        >
          S{step}
        </Tag>
      </Tooltip>

      {/* トランジション名 */}
      <Text
        style={{
          fontSize: 11,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
          color: token.colorText,
        }}
        title={name}
      >
        {name}
      </Text>

      {/* 依存関係アイコン（prerequisiteTransitionIds が空でない場合のみ） */}
      {hasPrereqs && (
        <Tooltip
          title={
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                依存関係あり（以下より後に実行）
              </div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {prerequisiteTransitionIds.map((prereqId) => {
                  const prereq = allTransitionOrderItems.find((t) => t.id === prereqId);
                  return (
                    <li key={prereqId}>
                      {prereq?.name ?? prereqId}（順序: {prereq?.order ?? '?'}）
                    </li>
                  );
                })}
              </ul>
            </div>
          }
        >
          <Tag
            color="blue"
            icon={<LinkOutlined />}
            style={{ margin: 0, cursor: 'default', fontSize: 10, flexShrink: 0 }}
          >
            依存
          </Tag>
        </Tooltip>
      )}
    </div>
  );
};

/**
 * 実験計画詳細指示ダイアログ
 */
const ExperimentPlanDialog: React.FC<ExperimentPlanDialogProps> = ({
  open,
  projectId,
  methodId,
  taskNumbers,
  creatorRefOptions: creatorRefOptionsProp = [],
  instrumentRefOptions: instrumentRefOptionsProp = [],
  ownerRefOptions: ownerRefOptionsProp = [],
  methodTemplates: methodTemplatesProp = [],
  onClose,
  onSave,
  disabled = false,
  allowMethodSelection = false,
  methodOptions = [],
  onMethodChange,
}) => {
  const { token } = useToken();
  const { message } = App.useApp();

  // --- インポート用隠しinput ref ---
  const importInputRef = useRef<HTMLInputElement>(null);

  // --- APIデータ State ---
  const [dialogData, setDialogData] = useState<PlanDialogData | null>(null);
  const [dialogDataLoading, setDialogDataLoading] = useState(false);

  // --- State ---

  /** アクティブなタブキー（'all' | 'task-N'） */
  const [activeTab, setActiveTab] = useState<string>(TAB_KEY_ALL);

  /** 選択中のトランジションID（単体選択・ラジオボタン相当） */
  const [selectedTransitionId, setSelectedTransitionId] = useState<string | null>(null);

  /**
   * 実行順序リスト（全トランジションを表示し順序を設定する）
   * prerequisiteTransitionIds による依存関係制約を使用する
   */
  const [transitionOrder, setTransitionOrder] = useState<TransitionOrderItem[]>([]);

  /**
   * タブキー → ExperimentPlanTabData のマップ
   * 全体タブ（'all'）が変更されると、上書きされていない各タスクタブへ自動伝播する
   */
  const [tabDataMap, setTabDataMap] = useState<Record<string, ExperimentPlanTabData>>({});

  const [isSaving, setIsSaving] = useState(false);

  // Ref選択肢はAPIデータ優先、なければpropsから取得
  const creatorRefOptions = dialogData?.creatorRefs ?? creatorRefOptionsProp;
  const instrumentRefOptions = dialogData?.instrumentRefs ?? instrumentRefOptionsProp;
  const ownerRefOptions = dialogData?.ownerRefs ?? ownerRefOptionsProp;

  /** 注意事項追加用の選択中タイプ */
  const [pendingNoteType, setPendingNoteType] = useState<NoteTypeValue | undefined>(undefined);

  /** 案3用: 基本情報 / テンプレート入力の内部タブ */
  const [innerTab, setInnerTab] = useState<'basic' | 'template'>('basic');

  /** 右側パネルが活性化しているか（トランジション選択済み）*/
  const isRightPanelActive = selectedTransitionId !== null;

  /** 現在のタブのデータを取得（なければ初期値を返す）*/
  const currentTabData = useMemo((): ExperimentPlanTabData => {
    return tabDataMap[activeTab] ?? createInitialTabData();
  }, [tabDataMap, activeTab]);

  /**
   * 現在のタブのデータを更新するヘルパー
   * activeTab が 'all'（一括）の場合、変更を各タスクNタブに無条件で伝播する
   */
  const updateCurrentTabData = useCallback(
    (
      field: InheritableField,
      updater: (prev: ExperimentPlanTabData) => ExperimentPlanTabData,
    ) => {
      setTabDataMap((prev) => {
        const updated = updater(prev[activeTab] ?? createInitialTabData());
        const next: Record<string, ExperimentPlanTabData> = { ...prev, [activeTab]: updated };

        // 一括タブの変更を各タスクNタブに無条件で伝播
        if (activeTab === TAB_KEY_ALL) {
          taskNumbers.forEach((n) => {
            const key = `task-${n}`;
            const taskData = next[key] ?? createInitialTabData();
            next[key] = { ...taskData, [field]: (updated as ExperimentPlanTabData)[field] };
          });
        }

        return next;
      });
    },
    [activeTab, taskNumbers]
  );

  /** APIから取得したトランジション一覧 */
  const transitions = useMemo((): TransitionRow[] => {
    return dialogData?.transitions ?? [];
  }, [dialogData]);

  /** APIから取得したテンプレート一覧（トランジション選択時に全件表示） */
  const filteredTemplates = useMemo((): TemplateDef[] => {
    if (!selectedTransitionId) return [];
    return dialogData?.templates ?? methodTemplatesProp;
  }, [selectedTransitionId, dialogData, methodTemplatesProp]);

  /** タブアイテムの定義 */
  const tabItems = useMemo(() => {
    return [
      { key: TAB_KEY_ALL, label: '一括' },
      ...taskNumbers.map((n) => ({ key: `task-${n}`, label: `タスク${n}` })),
    ];
  }, [taskNumbers]);

  /** ダイアログオープン時にAPIデータ取得 & 状態初期化 */
  useEffect(() => {
    if (!open) return;

    setActiveTab(TAB_KEY_ALL);
    setSelectedTransitionId(null);
    setTransitionOrder([]);
    setTabDataMap({});
    setPendingNoteType(undefined);
    setInnerTab('basic');

    if (!projectId || !methodId) return;

    const fetchDialogData = async () => {
      setDialogDataLoading(true);
      try {
        const data = await getPlanDialogData(projectId, methodId);
        // API が prerequisiteTransitionIds を返さない場合はモックデータを使用
        const hasPrereqs = data.transitions.length > 0 &&
          data.transitions[0].prerequisiteTransitionIds !== undefined;
        if (!hasPrereqs) {
          console.warn('[ExperimentPlanDialog] APIが prerequisiteTransitionIds を返していません。モックデータを使用します。');
          setDialogData(MOCK_PLAN_DIALOG_DATA);
        } else {
          setDialogData(data);
        }
      } catch (err) {
        console.error('[ExperimentPlanDialog] getPlanDialogData error:', err);
        message.error('実験計画データの取得に失敗しました');
        setDialogData(MOCK_PLAN_DIALOG_DATA);
      } finally {
        setDialogDataLoading(false);
      }
    };

    fetchDialogData();
  }, [open, projectId, methodId, message]);

  /** メソッドID変更時にAPIデータ再取得 */
  useEffect(() => {
    if (!open || !projectId || !methodId) return;

    const fetchDialogData = async () => {
      setDialogDataLoading(true);
      setSelectedTransitionId(null);
      try {
        const data = await getPlanDialogData(projectId, methodId);
        // API が prerequisiteTransitionIds を返さない場合はモックデータを使用
        const hasPrereqs = data.transitions.length > 0 &&
          data.transitions[0].prerequisiteTransitionIds !== undefined;
        if (!hasPrereqs) {
          console.warn('[ExperimentPlanDialog] (methodId change) APIが prerequisiteTransitionIds を返していません。モックデータを使用します。');
          setDialogData(MOCK_PLAN_DIALOG_DATA);
        } else {
          setDialogData(data);
        }
      } catch (err) {
        console.error('[ExperimentPlanDialog] getPlanDialogData (methodId change) error:', err);
        setDialogData(MOCK_PLAN_DIALOG_DATA);
      } finally {
        setDialogDataLoading(false);
      }
    };

    fetchDialogData();
    // open の変化では二重実行しないため methodId のみ依存
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [methodId]);

  // --- トランジション一覧カラム定義 ---
  const transitionColumns: ColumnsType<TransitionRow> = [
    {
      title: 'トランジション名',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text style={{ fontSize: 13 }}>{name}</Text>,
    },
  ];

  // --- カスタムプロパティ State（templateId → CustomPropValue[]） ---
  const [customProps, setCustomProps] = useState<Record<string, CustomPropValue[]>>({});

  const handleCustomPropsChange = useCallback((templateId: string, props: CustomPropValue[]) => {
    setCustomProps((prev) => ({ ...prev, [templateId]: props }));
  }, []);

  // --- インポートハンドラ ---
  const handleImport = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleImportFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          // tabDataMapへの反映
          if (json.tabDataMap) {
            setTabDataMap(json.tabDataMap);
          }
          message.success('インポートしました');
        } catch {
          message.error('JSONの解析に失敗しました');
        }
      };
      reader.readAsText(file);
      // 同一ファイルを再選択できるようにリセット
      e.target.value = '';
    },
    [message]
  );

  // --- エクスポートハンドラ ---
  const handleExport = useCallback(() => {
    const exportData = {
      methodId,
      projectId,
      selectedTransitionId,
      tabDataMap,
      customProps,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `experiment-plan_${methodId}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('エクスポートしました');
  }, [methodId, projectId, selectedTransitionId, tabDataMap, customProps, message]);

  // --- Ref操作ハンドラ ---

  const handleAddRef = useCallback(
    (field: 'creatorRefs' | 'instrumentRefs' | 'ownerRefs', value: string) => {
      updateCurrentTabData(field, (prev) => ({
        ...prev,
        [field]: [...prev[field], value],
      }));
    },
    [updateCurrentTabData]
  );

  const handleRemoveRef = useCallback(
    (field: 'creatorRefs' | 'instrumentRefs' | 'ownerRefs', value: string) => {
      updateCurrentTabData(field, (prev) => ({
        ...prev,
        [field]: prev[field].filter((v) => v !== value),
      }));
    },
    [updateCurrentTabData]
  );

  // --- 注意事項ハンドラ ---

  const handleAddNote = useCallback(() => {
    if (!pendingNoteType) return;
    const newNote: NoteItem = {
      id: `note_${Date.now()}`,
      type: pendingNoteType,
      content: '',
      properties: [],
    };
    updateCurrentTabData('notes', (prev) => ({
      ...prev,
      notes: [...prev.notes, newNote],
    }));
    setPendingNoteType(undefined);
  }, [pendingNoteType, updateCurrentTabData]);

  const handleRemoveNote = useCallback(
    (noteId: string) => {
      updateCurrentTabData('notes', (prev) => ({
        ...prev,
        notes: prev.notes.filter((n) => n.id !== noteId),
      }));
    },
    [updateCurrentTabData]
  );

  const handleNoteContentChange = useCallback(
    (noteId: string, content: string) => {
      updateCurrentTabData('notes', (prev) => ({
        ...prev,
        notes: prev.notes.map((n) => (n.id === noteId ? { ...n, content } : n)),
      }));
    },
    [updateCurrentTabData]
  );

  // --- テンプレート値変更ハンドラ ---

  const handleTemplateValueChange = useCallback(
    (key: string, value: string | number | boolean) => {
      updateCurrentTabData('templateValues', (prev) => ({
        ...prev,
        templateValues: { ...prev.templateValues, [key]: value },
      }));
    },
    [updateCurrentTabData]
  );

  // --- 実行順序ハンドラ ---

  /** transitions配列が変化したとき、transitionOrderを全件初期化（ステップを自動計算） */
  useEffect(() => {
    if (transitions.length === 0) {
      setTransitionOrder([]);
      return;
    }
    const initialOrder = transitions.map((trans, index) => ({
      id: trans.id,
      name: trans.name,
      order: index + 1,
      step: 1, // calculateSteps で上書きされる暫定値
      prerequisiteTransitionIds: trans.prerequisiteTransitionIds ?? [],
    }));
    setTransitionOrder(calculateSteps(initialOrder));
  }, [transitions]);

  /** ドラッグ&ドロップ用センサー */
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  /** ドラッグ終了ハンドラ（子孫と一緒に自動連動移動） */
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setTransitionOrder((prev) => {
        const newIndex = prev.findIndex((item) => item.id === over.id);
        const targetOrder = newIndex + 1;

        // 依存先チェック（Aチェックのみ）
        const validation = canMoveToOrder(active.id as string, targetOrder, prev);
        if (!validation.canMove) {
          message.warning(validation.reason ?? '順序を変更できません');
          return prev;
        }

        // 子孫と一緒に移動後、ステップを再計算
        return calculateSteps(moveTransitionWithSubtree(active.id as string, targetOrder, prev));
      });
    },
    [message]
  );

  /** Select手入力による順序変更ハンドラ（子孫と一緒に自動連動移動） */
  const handleOrderSelectChange = useCallback(
    (transitionId: string, newOrder: number) => {
      setTransitionOrder((prev) => {
        // 依存先チェック（Aチェックのみ）
        const validation = canMoveToOrder(transitionId, newOrder, prev);
        if (!validation.canMove) {
          message.warning(validation.reason ?? '順序を変更できません');
          return prev;
        }

        // 子孫と一緒に移動後、ステップを再計算
        return calculateSteps(moveTransitionWithSubtree(transitionId, newOrder, prev));
      });
    },
    [message]
  );

  // --- 保存処理（全タブ一括保存）---

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);

      // 全タブ（全体 + 各タスクN）を一括保存
      const allTabKeys = [TAB_KEY_ALL, ...taskNumbers.map((n) => `task-${n}`)];
      const savePromises = allTabKeys.map((tabKey) => {
        const data = tabDataMap[tabKey] ?? createInitialTabData();
        const tabNum =
          tabKey === TAB_KEY_ALL
            ? undefined
            : parseInt(tabKey.replace('task-', ''), 10);

        const request: SaveExperimentPlanRequest = {
          methodId,
          taskNumber: tabNum,
          // transitionOrder の順序を保存（全トランジションIDを order 順で渡す）
          selectedTransitions: transitionOrder
            .sort((a, b) => a.order - b.order)
            .map((item) => item.id),
          creatorRefs: data.creatorRefs,
          instrumentRefs: data.instrumentRefs,
          ownerRefs: data.ownerRefs,
          notes: data.notes,
          templateValues: data.templateValues,
        };

        return saveExperimentPlan(projectId, request);
      });

      await Promise.all(savePromises);
      message.success('実験計画を保存しました（モック）');
      onSave?.();
      onClose();
    } catch (error) {
      console.error('[ExperimentPlanDialog] 保存エラー:', error);
      message.error('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }, [tabDataMap, taskNumbers, methodId, projectId, transitionOrder, onSave, onClose]);

  // --- 基本情報パネル（共通化） ---

  const renderBasicInfoPanel = () => (
    <Space direction="vertical" style={{ width: '100%' }} size={12}>
      <RefSection
        title="CreatorRef"
        options={creatorRefOptions}
        selectedValues={currentTabData.creatorRefs}
        onAdd={(v) => handleAddRef('creatorRefs', v)}
        onRemove={(v) => handleRemoveRef('creatorRefs', v)}
        disabled={disabled}
        testIdPrefix="experiment-plan-creator-ref"
      />
      <Divider style={{ margin: '4px 0' }} />
      <RefSection
        title="InstrumentRef"
        options={instrumentRefOptions}
        selectedValues={currentTabData.instrumentRefs}
        onAdd={(v) => handleAddRef('instrumentRefs', v)}
        onRemove={(v) => handleRemoveRef('instrumentRefs', v)}
        disabled={disabled}
        testIdPrefix="experiment-plan-instrument-ref"
      />
      <Divider style={{ margin: '4px 0' }} />
      <RefSection
        title="OwnerRef"
        options={ownerRefOptions}
        selectedValues={currentTabData.ownerRefs}
        onAdd={(v) => handleAddRef('ownerRefs', v)}
        onRemove={(v) => handleRemoveRef('ownerRefs', v)}
        disabled={disabled}
        testIdPrefix="experiment-plan-owner-ref"
      />
      <Divider style={{ margin: '4px 0' }} />
      {/* 注意事項 */}
      <div>
        <Text strong style={{ fontSize: 13 }}>注意事項</Text>
        <div style={{ marginTop: 6 }}>
          <Space>
            <Select
              value={pendingNoteType}
              onChange={setPendingNoteType}
              options={Object.entries(NOTE_TYPE_LABELS).map(([key, label]) => ({ value: key, label }))}
              style={{ minWidth: 220 }}
              placeholder="注意事項のタイプを選択"
              disabled={disabled}
            />
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleAddNote}
              disabled={disabled || !pendingNoteType}
            >
              追加
            </Button>
          </Space>
        </div>
        {currentTabData.notes.length > 0 && (
          <Space direction="vertical" style={{ width: '100%', marginTop: 8 }} size={6}>
            {currentTabData.notes.map((note) => (
              <Card
                key={note.id}
                size="small"
                style={{ backgroundColor: token.colorFillAlter }}
                title={<Text style={{ fontSize: 12 }}>{NOTE_TYPE_LABELS[note.type]}</Text>}
                extra={
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={() => handleRemoveNote(note.id)}
                    disabled={disabled}
                  />
                }
              >
                <TextArea
                  value={note.content}
                  onChange={(e) => handleNoteContentChange(note.id, e.target.value)}
                  rows={2}
                  showCount
                  maxLength={500}
                  disabled={disabled}
                />
              </Card>
            ))}
          </Space>
        )}
      </div>
    </Space>
  );

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          <span>実験計画詳細指示</span>
          {methodId && (
            <Text type="secondary" style={{ fontSize: 13 }}>
              — {methodId}
            </Text>
          )}
        </Space>
      }
      open={open}
      onCancel={onClose}
      width="90vw"
      style={{ maxWidth: 1600, top: 24 }}
      styles={{ body: { padding: `${token.paddingSM}px ${token.paddingMD}px`, overflowX: 'hidden' } }}
      footer={[
        /* 隠しinput（インポート用） */
        <input
          key="import-input"
          ref={importInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleImportFileChange}
        />,
        <Tooltip key="import-tooltip" title="JSONファイルから設定を読み込む">
          <Button
            key="import"
            icon={<ImportOutlined />}
            onClick={handleImport}
            disabled={isSaving}
          >
            インポート
          </Button>
        </Tooltip>,
        <Tooltip key="export-tooltip" title="現在の設定をJSONファイルに書き出す">
          <Button
            key="export"
            icon={<ExportOutlined />}
            onClick={handleExport}
            disabled={isSaving}
          >
            エクスポート
          </Button>
        </Tooltip>,
        <Button key="cancel" onClick={onClose} disabled={isSaving}>
          キャンセル
        </Button>,
        <Button
          key="save"
          type="primary"
          loading={isSaving}
          disabled={disabled || !isRightPanelActive}
          onClick={handleSave}
          data-testid="experiment-plan-dialog-save-button"
        >
          保存
        </Button>,
      ]}
    >
      {/* ====== メソッドID選択UI（allowMethodSelection=true 時のみ表示）====== */}
      {allowMethodSelection && (
        <div
          style={{
            marginBottom: 12,
            padding: '8px 12px',
            backgroundColor: token.colorFillAlter,
            borderRadius: token.borderRadius,
            border: `1px solid ${token.colorBorder}`,
          }}
        >
          <Space align="center">
            <Text strong style={{ fontSize: 13 }}>メソッドID：</Text>
            <Select
              value={methodId}
              options={(methodOptions ?? []).map((m) => ({ label: `${m.name}（${m.id}）`, value: m.id }))}
              onChange={(v) => onMethodChange?.(v)}
              style={{ minWidth: 320 }}
              placeholder="メソッドIDを選択"
              popupMatchSelectWidth={false}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              ※メソッドIDを変更すると内容がリセットされます
            </Text>
          </Space>
        </div>
      )}

      <Row gutter={16} style={{ minHeight: 680, overflowX: 'hidden' }}>
        {/* ====== 左側: トランジション一覧（テーブル、単体行選択）====== */}
        <Col span={5}>
          {/* ── トランジション選択 ── */}
          <Card
            title="トランジション"
            size="small"
            styles={{ body: { padding: 0, maxHeight: 320, overflowY: 'auto' } }}
          >
            {transitions.length === 0 ? (
              <div style={{ padding: 16 }}>
                <Empty
                  description="トランジションがありません"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </div>
            ) : (
              <Table<TransitionRow>
                dataSource={transitions}
                columns={transitionColumns}
                rowKey="id"
                size="small"
                pagination={false}
                showHeader={false}
                onRow={(record) => ({
                  onClick: () => {
                    if (disabled) return;
                    const newId = selectedTransitionId === record.id ? null : record.id;
                    setSelectedTransitionId(newId);
                    if (newId !== null) setActiveTab(TAB_KEY_ALL);
                  },
                  style: {
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    backgroundColor:
                      selectedTransitionId === record.id
                        ? token.colorPrimaryBg
                        : undefined,
                    transition: 'background-color 0.15s',
                  },
                })}
              />
            )}
          </Card>

          {/* ── 実行順序リスト（ドラッグ&ドロップ + Select手入力）── */}
          <Card
            title={
              <Space size={4}>
                <Text style={{ fontSize: 12 }}>実行順序</Text>
                {transitionOrder.length > 0 && (
                  <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>
                    {transitionOrder.length}件
                  </Tag>
                )}
              </Space>
            }
            size="small"
            style={{ marginTop: 8 }}
            styles={{ body: { padding: '4px 8px', maxHeight: 360, overflowY: 'auto' } }}
          >
            {transitionOrder.length === 0 ? (
              <Text type="secondary" style={{ fontSize: 11, display: 'block', padding: '8px 0' }}>
                トランジションがありません
              </Text>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={transitionOrder.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    {transitionOrder.map((item) => {
                      const trans = transitions.find((t) => t.id === item.id);
                      const name = trans?.name ?? item.id;
                      return (
                        <SortableTransitionRow
                          key={item.id}
                          id={item.id}
                          order={item.order}
                          step={item.step}
                          name={name}
                          prerequisiteTransitionIds={item.prerequisiteTransitionIds}
                          allTransitionOrderItems={transitionOrder}
                          maxOrder={transitionOrder.length}
                          onOrderChange={handleOrderSelectChange}
                          disabled={disabled}
                          token={token}
                        />
                      );
                    })}
                  </Space>
                </SortableContext>
              </DndContext>
            )}
          </Card>
        </Col>

        {/* ====== 右側: タブ ＋ 入力フォーム（案3: タブ切替固定）====== */}
        <Col span={19}>
          {!isRightPanelActive ? (
            /* トランジション未選択ガイド */
            <div
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 540,
                border: `1px dashed ${token.colorBorder}`,
                borderRadius: token.borderRadius,
                backgroundColor: token.colorFillAlter,
              }}
            >
              <Empty
                description="左のトランジション一覧からトランジションを選択してください"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          ) : (
            <Spin spinning={isSaving}>
              {/* ===== 全体/タスクNタブ ===== */}
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
                size="small"
                style={{ marginBottom: token.marginXS }}
              />

              {/* 選択中トランジション表示 */}
              <div
                style={{
                  padding: '4px 12px',
                  marginBottom: 8,
                  backgroundColor: token.colorInfoBg,
                  borderRadius: token.borderRadius,
                  border: `1px solid ${token.colorInfoBorder}`,
                }}
              >
                <Text type="secondary" style={{ fontSize: 12 }}>選択中のトランジション: </Text>
                <Text style={{ fontSize: 12, fontWeight: 600 }}>
                  {transitions.find((t) => t.id === selectedTransitionId)?.name ?? selectedTransitionId}
                </Text>
                {activeTab === TAB_KEY_ALL && (
                  <Text type="secondary" style={{ fontSize: 11, marginLeft: 12 }}>
                    ※ 一括タブで設定した内容は、他のすべてのタスクNoタブに反映されます。
                  </Text>
                )}
                {activeTab !== TAB_KEY_ALL && (
                  <Text type="secondary" style={{ fontSize: 11, marginLeft: 12 }}>
                    ※ 一括タブの設定を継承。このタブで変更すると個別上書きになります。
                  </Text>
                )}
              </div>

              {/* ===== 基本情報 / テンプレート入力 内部タブ ===== */}
              <div style={{ maxHeight: 540, overflowY: 'auto', overflowX: 'hidden', paddingRight: 4 }}>
                <Tabs
                  activeKey={innerTab}
                  onChange={(k) => setInnerTab(k as 'basic' | 'template')}
                  size="small"
                  type="card"
                  style={{ marginBottom: 8 }}
                  items={[
                    {
                      key: 'basic',
                      label: '基本情報',
                      children: renderBasicInfoPanel(),
                    },
                    {
                      key: 'template',
                      label: 'テンプレート入力',
                      children: (
                        <TemplateInputPanel
                          methodTemplates={filteredTemplates}
                          templateValues={currentTabData.templateValues}
                          onValueChange={handleTemplateValueChange}
                          customProps={customProps}
                          onCustomPropsChange={handleCustomPropsChange}
                          disabled={disabled}
                        />
                      ),
                    },
                  ]}
                />
              </div>
            </Spin>
          )}
        </Col>
      </Row>
    </Modal>
  );
};

export default ExperimentPlanDialog;
