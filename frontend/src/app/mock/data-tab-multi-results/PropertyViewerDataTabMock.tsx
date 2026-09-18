// frontend/src/app/mock/data-tab-multi-results/PropertyViewerDataTabMock.tsx
// データタブ複数Results対応 - 変更後の表示見本（独立モックコンポーネント）
//
// アクセス: http://localhost:3000/mock/data-tab-multi-results
//
// 【このモックの目的】
//   現状の PropertyViewer.tsx では "データ" タブが 1 件目の Results しか表示できない。
//   修正後のイメージを独立したモックとして先行確認するためのコンポーネント。
//
// 【変更後の表示方針】
//   - Results 件数分だけグループ（Divider区切り）を表示
//   - 各グループ内はテンプレートタブと同等の4列テーブル
//     （キー / xsi:type / 値 / 説明・単位）
//   - Results が 0 件の場合は「表示するプロパティがありません」

'use client';

import React, { useState } from 'react';
import {
  Typography,
  Tabs,
  Table,
  Button,
  Space,
  Tag,
  theme,
  Tooltip,
  Select,
  Card,
} from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

// ---------------------------------------------------------------------------
// モック用型定義（maimlDataExtractor.ts の変更後の型イメージ）
// ---------------------------------------------------------------------------

/** 1プロパティ分のデータ */
interface MockDataPropertyObject {
  key: string;
  value?: string;
  xsiType?: string;
  units?: string;
  description?: string;
}

/** 1件の Results グループ */
interface MockDataResultsGroup {
  resultsId: string;
  resultsUuid?: string;
  resultsName?: string;
  resultsDescription?: string;
  elementUuid?: string;
  elementDescription?: string;
  properties: MockDataPropertyObject[];
}

/** テーブル行データ型 */
interface DataTableRow {
  key: string;
  propKey: string;
  xsiType?: string;
  value?: string;
  description?: string;
}

/** テンプレートタブ用テーブル行 */
type TemplateTableRow = DataTableRow;

/** テンプレートプロパティ定義 */
interface TemplateProp {
  key: string;
  xsiType?: string;
  defaultValue?: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// モックデータ定義
// ---------------------------------------------------------------------------

/** Material ノード用モックデータ（Results 3件） */
const MOCK_MATERIAL_GROUPS: MockDataResultsGroup[] = [
  {
    resultsId: 'results_exp_001',
    resultsUuid: 'a1b2c3d4-0001-4aaa-8000-000000000001',
    resultsName: '実験記録 #1（2026-07-01）',
    resultsDescription: '初回試行：標準条件下での測定',
    elementUuid: 'e1f2a3b4-0001-4bbb-9000-000000000011',
    elementDescription: 'シリコンウェハ サンプル A',
    properties: [
      { key: 'purity',      xsiType: 'doubleType', value: '99.95', units: '%',    description: '純度' },
      { key: 'thickness',   xsiType: 'doubleType', value: '0.725', units: 'mm',   description: 'ウェハ厚さ' },
      { key: 'diameter',    xsiType: 'doubleType', value: '200.0', units: 'mm',   description: 'ウェハ直径' },
      { key: 'resistivity', xsiType: 'doubleType', value: '10.2',  units: 'Ω·cm', description: '比抵抗' },
      { key: 'supplier',    xsiType: 'stringType', value: 'SampleTech Inc.',      description: '供給元' },
    ],
  },
  {
    resultsId: 'results_exp_002',
    resultsUuid: 'a1b2c3d4-0002-4aaa-8000-000000000002',
    resultsName: '実験記録 #2（2026-08-15）',
    resultsDescription: '第2回試行：温度条件変更後',
    elementUuid: 'e1f2a3b4-0002-4bbb-9000-000000000012',
    elementDescription: 'シリコンウェハ サンプル B',
    properties: [
      { key: 'purity',      xsiType: 'doubleType', value: '99.92', units: '%',    description: '純度' },
      { key: 'thickness',   xsiType: 'doubleType', value: '0.730', units: 'mm',   description: 'ウェハ厚さ' },
      { key: 'diameter',    xsiType: 'doubleType', value: '200.0', units: 'mm',   description: 'ウェハ直径' },
      { key: 'resistivity', xsiType: 'doubleType', value: '10.8',  units: 'Ω·cm', description: '比抵抗' },
      { key: 'supplier',    xsiType: 'stringType', value: 'SampleTech Inc.',      description: '供給元' },
    ],
  },
  {
    resultsId: 'results_exp_003',
    resultsUuid: 'a1b2c3d4-0003-4aaa-8000-000000000003',
    resultsName: '実験記録 #3（2026-09-10）',
    resultsDescription: '第3回試行：ロット変更後の品質確認',
    elementUuid: 'e1f2a3b4-0003-4bbb-9000-000000000013',
    elementDescription: 'シリコンウェハ サンプル C',
    properties: [
      { key: 'purity',      xsiType: 'doubleType', value: '99.98', units: '%',    description: '純度' },
      { key: 'thickness',   xsiType: 'doubleType', value: '0.720', units: 'mm',   description: 'ウェハ厚さ' },
      { key: 'diameter',    xsiType: 'doubleType', value: '200.0', units: 'mm',   description: 'ウェハ直径' },
      { key: 'resistivity', xsiType: 'doubleType', value: '9.9',   units: 'Ω·cm', description: '比抵抗' },
      { key: 'supplier',    xsiType: 'stringType', value: 'SampleTech Inc.',      description: '供給元' },
    ],
  },
];

/** Condition ノード用モックデータ（Results 2件） */
const MOCK_CONDITION_GROUPS: MockDataResultsGroup[] = [
  {
    resultsId: 'results_cond_001',
    resultsUuid: 'b2c3d4e5-0001-4ccc-8100-000000000021',
    resultsName: '実験記録 #1',
    resultsDescription: '初回試行：炉温設定確認',
    elementUuid: 'f2a3b4c5-0001-4ddd-9100-000000000031',
    properties: [
      { key: 'temperature', xsiType: 'doubleType', value: '1050.0',    units: '℃',  description: 'プロセス温度' },
      { key: 'pressure',    xsiType: 'doubleType', value: '1.013',     units: 'atm', description: '雰囲気圧力' },
      { key: 'duration',    xsiType: 'doubleType', value: '120.0',     units: 'min', description: 'プロセス時間' },
      { key: 'atmosphere',  xsiType: 'stringType', value: 'N2',                      description: '雰囲気ガス' },
    ],
  },
  {
    resultsId: 'results_cond_002',
    resultsUuid: 'b2c3d4e5-0002-4ccc-8100-000000000022',
    resultsName: '実験記録 #2',
    resultsDescription: '第2回試行：温度を高めに設定',
    elementUuid: 'f2a3b4c5-0002-4ddd-9100-000000000032',
    properties: [
      { key: 'temperature', xsiType: 'doubleType', value: '1100.0',       units: '℃',  description: 'プロセス温度' },
      { key: 'pressure',    xsiType: 'doubleType', value: '1.013',        units: 'atm', description: '雰囲気圧力' },
      { key: 'duration',    xsiType: 'doubleType', value: '90.0',         units: 'min', description: 'プロセス時間' },
      { key: 'atmosphere',  xsiType: 'stringType', value: 'N2/O2 mixed',               description: '雰囲気ガス' },
    ],
  },
];

/** Result ノード用モックデータ（Results 1件のみ） */
const MOCK_RESULT_GROUPS: MockDataResultsGroup[] = [
  {
    resultsId: 'results_meas_001',
    resultsUuid: 'c3d4e5f6-0001-4eee-8200-000000000041',
    resultsName: '測定記録 #1',
    resultsDescription: '初回測定結果',
    elementUuid: 'a3b4c5d6-0001-4fff-9200-000000000051',
    properties: [
      { key: 'oxide_thickness',  xsiType: 'doubleType',  value: '102.3',               units: 'nm', description: '酸化膜厚さ' },
      { key: 'uniformity',       xsiType: 'doubleType',  value: '1.8',                 units: '%',  description: '膜厚均一性' },
      { key: 'measurement_tool', xsiType: 'stringType',  value: 'Ellipsometer XY-100',              description: '測定装置' },
      { key: 'pass_fail',        xsiType: 'booleanType', value: 'true',                             description: '合否判定' },
    ],
  },
];

/** Results 0件のノード用モックデータ */
const MOCK_EMPTY_GROUPS: MockDataResultsGroup[] = [];

// ---------------------------------------------------------------------------
// シナリオ定義
// ---------------------------------------------------------------------------

type ScenarioKey = 'material-3' | 'condition-2' | 'result-1' | 'empty';

interface Scenario {
  label: string;
  nodeType: 'Material' | 'Condition' | 'Result';
  nodeName: string;
  nodeId: string;
  groups: MockDataResultsGroup[];
}

const SCENARIOS: Record<ScenarioKey, Scenario> = {
  'material-3': {
    label: 'Material ノード（Results 3件）',
    nodeType: 'Material',
    nodeName: 'Si_Wafer',
    nodeId: 'place_mat_001',
    groups: MOCK_MATERIAL_GROUPS,
  },
  'condition-2': {
    label: 'Condition ノード（Results 2件）',
    nodeType: 'Condition',
    nodeName: 'FurnaceCondition',
    nodeId: 'place_cond_001',
    groups: MOCK_CONDITION_GROUPS,
  },
  'result-1': {
    label: 'Result ノード（Results 1件）',
    nodeType: 'Result',
    nodeName: 'OxideThickness',
    nodeId: 'place_res_001',
    groups: MOCK_RESULT_GROUPS,
  },
  'empty': {
    label: '結果なし（Results 0件）',
    nodeType: 'Material',
    nodeName: 'UnmeasuredSample',
    nodeId: 'place_mat_002',
    groups: MOCK_EMPTY_GROUPS,
  },
};

// ---------------------------------------------------------------------------
// ヘルパー関数
// ---------------------------------------------------------------------------

const getHeaderColor = (type: 'Material' | 'Condition' | 'Result'): string => {
  switch (type) {
    case 'Result':    return '#D7BDE2';
    case 'Condition': return '#85C1E9';
    case 'Material':  return '#F8C471';
    default:          return '#D7BDE2';
  }
};

const toTableRows = (props: MockDataPropertyObject[]): DataTableRow[] =>
  props.map((p, i) => ({
    key: `${i}`,
    propKey: p.key,
    xsiType: p.xsiType,
    value: p.value,
    description: [p.description, p.units ? `単位: ${p.units}` : undefined]
      .filter(Boolean)
      .join(' / ') || undefined,
  }));

// ---------------------------------------------------------------------------
// データタブ / テンプレートタブ 共通カラム定義（4列）
// ---------------------------------------------------------------------------

const makePropertyColumns = (valueLabel: string): ColumnsType<DataTableRow> => [
  {
    title: 'キー',
    dataIndex: 'propKey',
    key: 'propKey',
    width: '22%',
    render: (text: string) => (
      <Text strong style={{ fontSize: 12 }}>{text}</Text>
    ),
  },
  {
    title: 'xsi:type',
    dataIndex: 'xsiType',
    key: 'xsiType',
    width: '22%',
    render: (text?: string) =>
      text ? (
        <Text type="secondary" style={{ fontSize: 11 }}>{text}</Text>
      ) : (
        <Tooltip title="xsi:type が設定されていません">
          <Text type="secondary" style={{ fontSize: 11, color: '#bfbfbf' }}>-</Text>
        </Tooltip>
      ),
  },
  {
    title: valueLabel,
    dataIndex: 'value',
    key: 'value',
    width: '28%',
    render: (text?: string) => {
      if (text === undefined || text === null) {
        return (
          <Tooltip title="値が設定されていません">
            <Text type="secondary" italic style={{ color: '#bfbfbf' }}>未設定</Text>
          </Tooltip>
        );
      }
      if (text === 'true')  return <Tag color="success">true</Tag>;
      if (text === 'false') return <Tag color="error">false</Tag>;
      return <Text style={{ fontSize: 12 }}>{text}</Text>;
    },
  },
  {
    title: '説明/単位',
    dataIndex: 'description',
    key: 'description',
    width: '28%',
    render: (text?: string) =>
      text && text.trim() ? (
        <Text type="secondary" style={{ fontSize: 11 }}>{text}</Text>
      ) : (
        <Tooltip title="説明・単位が設定されていません">
          <Text type="secondary" style={{ fontSize: 11, color: '#bfbfbf' }}>-</Text>
        </Tooltip>
      ),
  },
];

const DATA_COLUMNS     = makePropertyColumns('値');
const TEMPLATE_COLUMNS = makePropertyColumns('値（デフォルト）');

// ---------------------------------------------------------------------------
// タブ描画関数
// ---------------------------------------------------------------------------

/** データタブ: Results N件グループ表示（変更後イメージ） */
const renderDataTab = (groups: MockDataResultsGroup[]) => {
  if (groups.length === 0) {
    return (
      <Tooltip title="このノードにはデータが設定されていません">
        <Text type="secondary" style={{ cursor: 'default' }}>
          表示するプロパティがありません
        </Text>
      </Tooltip>
    );
  }

  return (
    <div>
      {groups.map((group, index) => {
        const headerLabel = group.resultsName
          ? `Results #${index + 1}  ${group.resultsName}`
          : `Results #${index + 1}`;

        return (
          <div key={group.resultsId} style={{ marginBottom: 24 }}>
            {/* グループヘッダー */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 6,
                paddingBottom: 6,
                borderBottom: '1px solid #d9d9d9',
              }}
            >
              <Tag color="geekblue" style={{ fontWeight: 600, fontSize: 12, margin: 0 }}>
                {headerLabel}
              </Tag>
              <Text type="secondary" style={{ fontSize: 11 }}>
                id: {group.resultsId}
              </Text>
            </div>

            {(group.resultsDescription || group.resultsUuid) && (
              <div style={{ marginBottom: 6, paddingLeft: 4 }}>
                {group.resultsDescription && (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    📝 {group.resultsDescription}
                  </Text>
                )}
                {group.resultsUuid && (
                  <div>
                    <Text type="secondary" style={{ fontSize: 10, color: '#bfbfbf' }}>
                      uuid: {group.resultsUuid}
                    </Text>
                  </div>
                )}
              </div>
            )}

            {group.properties.length > 0 ? (
              <Table<DataTableRow>
                columns={DATA_COLUMNS}
                dataSource={toTableRows(group.properties)}
                pagination={false}
                size="small"
                showHeader={true}
                scroll={{ x: true }}
              />
            ) : (
              <Text type="secondary" style={{ fontSize: 12, paddingLeft: 8 }}>
                プロパティがありません
              </Text>
            )}
          </div>
        );
      })}
    </div>
  );
};

/** テンプレートタブ: 現行と同等の4列表示（比較用） */
const TEMPLATE_DEFS: Record<'Material' | 'Condition' | 'Result', TemplateProp[]> = {
  Material: [
    { key: 'purity',      xsiType: 'doubleType', defaultValue: '',      description: '純度 / %' },
    { key: 'thickness',   xsiType: 'doubleType', defaultValue: '',      description: 'ウェハ厚さ / mm' },
    { key: 'diameter',    xsiType: 'doubleType', defaultValue: '200.0', description: 'ウェハ直径 / mm' },
    { key: 'resistivity', xsiType: 'doubleType', defaultValue: '',      description: '比抵抗 / Ω·cm' },
    { key: 'supplier',    xsiType: 'stringType', defaultValue: '',      description: '供給元' },
  ],
  Condition: [
    { key: 'temperature', xsiType: 'doubleType', defaultValue: '1050.0', description: 'プロセス温度 / ℃' },
    { key: 'pressure',    xsiType: 'doubleType', defaultValue: '1.013',  description: '雰囲気圧力 / atm' },
    { key: 'duration',    xsiType: 'doubleType', defaultValue: '120.0',  description: 'プロセス時間 / min' },
    { key: 'atmosphere',  xsiType: 'stringType', defaultValue: 'N2',     description: '雰囲気ガス' },
  ],
  Result: [
    { key: 'oxide_thickness',  xsiType: 'doubleType',  defaultValue: '', description: '酸化膜厚さ / nm' },
    { key: 'uniformity',       xsiType: 'doubleType',  defaultValue: '', description: '膜厚均一性 / %' },
    { key: 'measurement_tool', xsiType: 'stringType',  defaultValue: '', description: '測定装置' },
    { key: 'pass_fail',        xsiType: 'booleanType', defaultValue: '', description: '合否判定' },
  ],
};

const renderTemplateTab = (type: 'Material' | 'Condition' | 'Result') => {
  const rows: TemplateTableRow[] = TEMPLATE_DEFS[type].map((p, i) => ({
    key: `${i}`,
    propKey: p.key,
    xsiType: p.xsiType,
    value: p.defaultValue,
    description: p.description,
  }));
  return (
    <Table<TemplateTableRow>
      columns={TEMPLATE_COLUMNS}
      dataSource={rows}
      pagination={false}
      size="small"
      showHeader={true}
      scroll={{ x: true }}
    />
  );
};

/** 基本情報タブ */
const renderBasicTab = (scenario: Scenario) => {
  const rows = [
    { key: '0', propKey: 'ID',     value: scenario.nodeId },
    { key: '1', propKey: 'タイプ', value: scenario.nodeType },
    { key: '2', propKey: '名前',   value: scenario.nodeName },
  ];
  return (
    <Table
      columns={[
        { title: 'プロパティ', dataIndex: 'propKey', key: 'propKey', width: '35%',
          render: (text: string) => <Text strong>{text}</Text> },
        { title: '値', dataIndex: 'value', key: 'value',
          render: (text: string) => <Text>{text}</Text> },
      ]}
      dataSource={rows}
      pagination={false}
      size="small"
      showHeader={false}
    />
  );
};

// ---------------------------------------------------------------------------
// メインコンポーネント
// ---------------------------------------------------------------------------

const PropertyViewerDataTabMock: React.FC = () => {
  const { token } = theme.useToken();
  const [selectedScenario, setSelectedScenario] = useState<ScenarioKey>('material-3');
  const [activeTab, setActiveTab] = useState<string>('data');

  const scenario = SCENARIOS[selectedScenario];
  const headerColor = getHeaderColor(scenario.nodeType);

  const tabItems = [
    {
      key: 'basic',
      label: '基本情報',
      children: renderBasicTab(scenario),
    },
    {
      key: 'template',
      label: 'テンプレート',
      children: renderTemplateTab(scenario.nodeType),
    },
    {
      key: 'data',
      label: (
        <Space>
          データ
          {scenario.groups.length > 0 && (
            <Tag color="blue">{scenario.groups.length}件</Tag>
          )}
        </Space>
      ),
      children: renderDataTab(scenario.groups),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* シナリオ切り替えセレクタ */}
      <Card
        size="small"
        style={{ marginBottom: 16, background: '#fffbe6', border: '1px solid #ffe58f' }}
      >
        <Space>
          <Text strong>📋 表示シナリオ:</Text>
          <Select<ScenarioKey>
            value={selectedScenario}
            onChange={(val) => {
              setSelectedScenario(val);
              setActiveTab('data');
            }}
            style={{ minWidth: 280 }}
            options={[
              { value: 'material-3', label: 'Material ノード（Results 3件）' },
              { value: 'condition-2', label: 'Condition ノード（Results 2件）' },
              { value: 'result-1', label: 'Result ノード（Results 1件）' },
              { value: 'empty', label: '結果なし（Results 0件）' },
            ]}
          />
        </Space>
      </Card>

      {/* PropertyViewer 本体イメージ */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: 620,
          backgroundColor: token.colorBgContainer,
          border: `1px solid ${token.colorBorder}`,
          borderRadius: token.borderRadius,
          overflow: 'hidden',
        }}
      >
        {/* ヘッダー */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            backgroundColor: headerColor,
            borderBottom: `1px solid ${token.colorBorder}`,
            flexShrink: 0,
          }}
        >
          <Space>
            <Title level={5} style={{ margin: 0, color: 'white' }}>
              {scenario.nodeName} プロパティ
            </Title>
            <Tag color="white" style={{ color: headerColor }}>
              {scenario.nodeType}
            </Tag>
          </Space>
          <Button
            type="text"
            icon={<CloseOutlined />}
            style={{ color: 'white' }}
          />
        </div>

        {/* タブコンテンツ */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
          />
        </div>
      </div>
    </div>
  );
};

export default PropertyViewerDataTabMock;

