'use client';

/**
 * 不確かさ記録タブ
 *
 * 左パネル: 実験記録タブで保存された property / content 値の一覧（上から順次選択可能）
 * 右パネル: 選択中の property / content を targetProperty として
 *           UncertaintyCriteriaSelectorPanel をインライン表示する
 */

import React, { useState, useMemo } from 'react';
import {
  Layout,
  Tag,
  Typography,
  Tooltip,
  theme,
  Empty,
} from 'antd';
import { INITIAL_TASKS, MOCK_TRANSITIONS, MOCK_METHODS } from './WorkRecordPanel';
import type { MockTask } from './WorkRecordPanel';
import UncertaintyCriteriaSelectorPanel from '../uncertainty/UncertaintyCriteriaSelectorPanel';
import type { TargetProperty, AssignPayload } from '../uncertainty/UncertaintyCriteriaSelectorModal';

const { Sider, Content } = Layout;
const { Text } = Typography;

// ============================================================================
// ローカル型（WorkRecordPanel の内部型を参照用に再宣言）
// ============================================================================

interface MockMethod { id: string; order: number; }
interface MockPropertyLocal { key: string; label: string; xsiType: string; unit: string; expected: number | string | null; }
interface MockTemplateLocal { id: string; name: string; category: string; properties: MockPropertyLocal[]; }
interface MockTransitionLocal { id: string; order: number; methodId: string; templates: MockTemplateLocal[]; }

// ============================================================================
// 定数
// ============================================================================

/** xsiType → MAIML type 文字列変換 */
const XSI_TO_TYPE: Record<string, string> = {
  FloatValue:   'Float',
  IntegerValue: 'Integer',
  StringValue:  'String',
};

/** template.category → section 変換 */
const CATEGORY_TO_SECTION: Record<string, 'material' | 'condition' | 'result'> = {
  Materials:  'material',
  Conditions: 'condition',
  Results:    'result',
};

/** xsiType の表示用ラベル */
const XSI_SHORT: Record<string, string> = {
  FloatValue: 'Float', IntegerValue: 'Int', StringValue: 'Str',
};

/** xsiType のタグカラー */
const XSI_COLOR: Record<string, string> = {
  FloatValue: 'geekblue', IntegerValue: 'purple', StringValue: 'cyan',
};

/** section のバッジカラー */
const SECTION_COLOR: Record<string, string> = {
  material:  'green',
  condition: 'blue',
  result:    'purple',
};

// ============================================================================
// 型定義
// ============================================================================

/** 左パネルの1行データ */
interface PropertyRow {
  /** 一意キー: `${taskNo}-${transitionId}-${propKey}` */
  rowKey: string;
  taskNo: number;
  transitionId: string;
  propKey: string;
  label: string;
  xsiType: string;
  unit: string;
  section: 'material' | 'condition' | 'result';
  /** 実際に記録された値（null = 未記録） */
  actual: number | string | null;
}

// ============================================================================
// 左パネルのデータ生成
// ============================================================================

/**
 * INITIAL_TASKS・MOCK_TRANSITIONS のモックデータから
 * property 行リストを生成する。
 *
 * @remarks
 * 上から順に: TaskNo 昇順 → Transition order 昇順 → Template 順 → Property 順
 */
function buildPropertyRows(tasks: MockTask[]): PropertyRow[] {
  const rows: PropertyRow[] = [];

  // Method order → Transition order の順で走査
  const orderedTransitions = (MOCK_METHODS as MockMethod[]).slice()
    .sort((a: MockMethod, b: MockMethod) => a.order - b.order)
    .flatMap((m: MockMethod) =>
      (MOCK_TRANSITIONS as MockTransitionLocal[]).filter((t: MockTransitionLocal) => t.methodId === m.id)
        .sort((a: MockTransitionLocal, b: MockTransitionLocal) => a.order - b.order)
    );

  tasks.forEach((task) => {
    orderedTransitions.forEach((transition: MockTransitionLocal) => {
      const taskTransition = task.transitions.find((tt) => tt.transitionId === transition.id);
      if (!taskTransition) return;

      transition.templates.forEach((template: MockTemplateLocal) => {
        const section = CATEGORY_TO_SECTION[template.category] ?? 'condition';
        template.properties.forEach((prop: MockPropertyLocal) => {
          rows.push({
            rowKey: `${task.taskNo}-${transition.id}-${prop.key}`,
            taskNo: task.taskNo,
            transitionId: transition.id,
            propKey: prop.key,
            label: prop.label,
            xsiType: prop.xsiType,
            unit: prop.unit,
            section,
            actual: (() => {
              const v = taskTransition.actuals[prop.key] ?? null;
              // Insertion / DataGrid はプロパティ値として使わない
              return (v !== null && typeof v === 'object') ? null : (v as string | number | null);
            })(),
          });
        });
      });
    });
  });

  return rows;
}

/**
 * PropertyRow → TargetProperty 変換
 */
function toTargetProperty(row: PropertyRow): TargetProperty {
  return {
    name: `${row.label} (${row.propKey})`,
    xpath: `//transition[@id="${row.transitionId}"]//property[@key="${row.propKey}"]`,
    tag: 'property',
    type: XSI_TO_TYPE[row.xsiType] ?? row.xsiType,
    value: row.actual !== null ? String(row.actual) : '',
    unit: row.unit || '—',
    section: row.section,
  };
}

// ============================================================================
// コンポーネント
// ============================================================================

/**
 * 不確かさ記録タブ
 *
 * 実験作業者メニューの「不確かさ記録」タブ（key='5'）の children として使用する。
 */
export default function UncertaintyRecordTab() {
  const { token } = theme.useToken();

  // モックデータからプロパティ行を生成
  const propertyRows = useMemo(() => buildPropertyRows(INITIAL_TASKS), []);

  // 左パネルで選択中の行
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(
    propertyRows.length > 0 ? propertyRows[0].rowKey : null
  );

  // 選択中の行に対応する TargetProperty
  const targetProperty = useMemo<TargetProperty | null>(() => {
    if (!selectedRowKey) return null;
    const row = propertyRows.find((r) => r.rowKey === selectedRowKey);
    if (!row) return null;
    return toTargetProperty(row);
  }, [selectedRowKey, propertyRows]);

  // 付与ハンドラ: 付与後に次の property へ自動遷移する
  const handleAssign = (payload: AssignPayload) => {
    console.info('[UncertaintyRecordTab] assign:', payload);

    // 次の行へ遷移
    if (!selectedRowKey) return;
    const currentIdx = propertyRows.findIndex((r) => r.rowKey === selectedRowKey);
    const nextRow = propertyRows[currentIdx + 1];
    if (nextRow) {
      setSelectedRowKey(nextRow.rowKey);
    }
    // 最後の行の場合は現在の選択を維持（末尾に留まる）
  };

  return (
    <Layout
      style={{
        height: 'calc(100vh - 280px)',
        background: token.colorBgLayout,
        overflow: 'hidden',
      }}
    >
      {/* ────────────────────────────────────────
          左パネル: property / content 一覧
      ──────────────────────────────────────── */}
      <Sider
        width={300}
        style={{
          background: token.colorBgContainer,
          borderRight: `1px solid ${token.colorBorder}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* タイトル */}
        <div
          style={{
            padding: '10px 14px 8px',
            borderBottom: `1px solid ${token.colorBorder}`,
            background: token.colorBgContainer,
            flexShrink: 0,
          }}
        >
          <Text strong style={{ fontSize: 13 }}>
            📋 実験記録の property / content
          </Text>
          <div style={{ fontSize: 11, color: token.colorTextSecondary, marginTop: 2 }}>
            行を選択すると右に不確かさ基準が表示されます
          </div>
        </div>

        {/* 一覧 */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {propertyRows.length === 0 ? (
            <Empty
              description="記録された property / content がありません"
              style={{ marginTop: 40 }}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <div style={{ padding: '4px 0' }}>
              {propertyRows.map((row) => {
                const isSelected = row.rowKey === selectedRowKey;
                const hasValue = row.actual !== null;
                return (
                  <div
                    key={row.rowKey}
                    onClick={() => setSelectedRowKey(row.rowKey)}
                    style={{
                      padding: '8px 14px',
                      cursor: 'pointer',
                      borderLeft: isSelected
                        ? `3px solid ${token.colorPrimary}`
                        : '3px solid transparent',
                      background: isSelected ? '#e6f0ff' : 'transparent',
                      transition: 'background 0.15s',
                      borderBottom: `1px solid ${token.colorBorderSecondary}`,
                    }}
                  >
                    {/* 行上部: TaskNo + section バッジ + xsiType タグ */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <Tag
                        color="default"
                        style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '16px' }}
                      >
                        Task #{row.taskNo}
                      </Tag>
                      <Tag
                        color={SECTION_COLOR[row.section]}
                        style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '16px' }}
                      >
                        {row.section}
                      </Tag>
                      <Tag
                        color={XSI_COLOR[row.xsiType] ?? 'default'}
                        style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '16px' }}
                      >
                        {XSI_SHORT[row.xsiType] ?? row.xsiType}
                      </Tag>
                    </div>

                    {/* 行中部: ラベル */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <Text
                        strong
                        style={{
                          fontSize: 13,
                          color: isSelected ? token.colorPrimary : token.colorText,
                        }}
                      >
                        {row.label}
                      </Text>
                      {row.unit && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          [{row.unit}]
                        </Text>
                      )}
                    </div>

                    {/* 行下部: 実績値 */}
                    <div style={{ marginTop: 3 }}>
                      {hasValue ? (
                        <Text
                          style={{
                            fontSize: 12,
                            color: '#1677ff',
                            fontFamily: 'Consolas, Monaco, monospace',
                          }}
                        >
                          {row.actual}
                          {row.unit && (
                            <span style={{ color: token.colorTextSecondary, marginLeft: 2 }}>
                              {row.unit}
                            </span>
                          )}
                        </Text>
                      ) : (
                        <Text type="secondary" italic style={{ fontSize: 11 }}>
                          未記録
                        </Text>
                      )}
                    </div>

                    {/* key のツールチップ */}
                    <Tooltip title={row.propKey}>
                      <div
                        style={{
                          marginTop: 3,
                          fontSize: 10,
                          color: token.colorTextQuaternary,
                          fontFamily: 'Consolas, Monaco, monospace',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {row.propKey}
                      </div>
                    </Tooltip>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Sider>

      {/* ────────────────────────────────────────
          右パネル: 不確かさ基準セレクタ（インライン）
      ──────────────────────────────────────── */}
      <Content
        style={{
          background: token.colorBgLayout,
          padding: '12px 16px',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <UncertaintyCriteriaSelectorPanel
          targetProperty={targetProperty}
          onAssign={handleAssign}
        />
      </Content>
    </Layout>
  );
}
