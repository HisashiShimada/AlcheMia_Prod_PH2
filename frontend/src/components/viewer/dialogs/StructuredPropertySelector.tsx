// frontend/src/components/viewer/dialogs/StructuredPropertySelector.tsx
// Placeノードのプロパティ選択ダイアログ

'use client';

import React, { useState } from 'react';
import { Modal, Drawer, Tabs, Table, Checkbox, Tag, Typography, Space, Empty, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface PropertyObject {
  key?: string;
  value?: unknown;
  type?: string;
  description?: string;
  elements?: {
    value?: unknown;
  };
  children?: unknown[];
}

interface StructuredProperties {
  basic: Record<string, PropertyObject>;
  template: Record<string, PropertyObject>;
  data: Record<string, PropertyObject>;
}

interface SelectedProperties {
  basic: string[];
  template: string[];
  data: string[];
}

interface StructuredPropertySelectorProps {
  open: boolean;
  onClose: () => void;
  nodeId: string | null;
  nodeName?: string;
  structuredProperties: StructuredProperties;
  selectedProperties: SelectedProperties;
  onPropertyToggle: (structure: keyof StructuredProperties, property: string) => void;
  embedded?: boolean;  // 埋め込みモード（Modalを使用しない）- 後方互換性のため残す
  displayMode?: 'modal' | 'drawer' | 'embedded';  // 表示モード（新規）
  getContainer?: () => HTMLElement;  // コンテナ要素の取得関数（Modal/Drawer用）
}

/**
 * 構造別プロパティ選択コンポーネント（Ant Design版）
 * 基本情報、テンプレート、データの3つの構造別にプロパティを選択できるUI
 */
const StructuredPropertySelector: React.FC<StructuredPropertySelectorProps> = ({
  open,
  onClose,
  nodeId,
  nodeName,
  structuredProperties,
  selectedProperties,
  onPropertyToggle,
  embedded = false,  // デフォルトはfalse（Modal表示）- 後方互換性のため残す
  displayMode,  // 新規: 表示モード
  getContainer,  // 新規: コンテナ要素取得関数
}) => {
  const [activeTab, setActiveTab] = useState<string>('basic');

  // 実際の表示モードを決定（後方互換性を考慮）
  const actualDisplayMode: 'modal' | 'drawer' | 'embedded' = 
    displayMode || (embedded ? 'embedded' : 'modal');

  // プロパティ値のフォーマット（null / undefined / "" を区別して返す）
  const formatPropertyValue = (propertyObj: PropertyObject | unknown): {
    text: string;
    kind: 'normal' | 'undefined' | 'null' | 'empty' | 'children';
  } => {
    let value: unknown;
    if (propertyObj && typeof propertyObj === 'object') {
      const obj = propertyObj as PropertyObject;
      if (obj.value !== undefined) {
        value = obj.value;
      } else if (obj.elements && obj.elements.value !== undefined) {
        value = obj.elements.value;
      } else if (obj.children && Array.isArray(obj.children) && obj.children.length > 0) {
        return { text: `${obj.children.length}個の子要素`, kind: 'children' };
      } else {
        // value が存在しない = undefined 扱い
        return { text: '未設定', kind: 'undefined' };
      }
    } else {
      value = propertyObj;
    }

    if (value === undefined) {
      return { text: '未設定', kind: 'undefined' };
    }
    if (value === null) {
      return { text: 'null', kind: 'null' };
    }
    if (value === '') {
      return { text: '"" (空文字)', kind: 'empty' };
    }

    return { text: String(value), kind: 'normal' };
  };

  // プロパティラベル取得
  const getPropertyLabel = (propKey: string, propertyObj: PropertyObject | unknown): string => {
    if (propertyObj && typeof propertyObj === 'object') {
      const obj = propertyObj as PropertyObject;
      if (obj.key !== undefined) {
        return obj.key;
      }
    }
    return propKey;
  };

  // 構造名のマッピング
  const structureLabels: Record<keyof StructuredProperties, string> = {
    basic: '基本情報',
    template: 'テンプレート',
    data: 'データ'
  };

  // 選択済みチップの表示
  const renderSelectedChips = () => {
    const allSelected: Array<{
      structure: keyof StructuredProperties;
      property: string;
      label: string;
    }> = [];

    (Object.keys(structureLabels) as Array<keyof StructuredProperties>).forEach(structure => {
      if (selectedProperties[structure]) {
        selectedProperties[structure].forEach(prop => {
          allSelected.push({
            structure,
            property: prop,
            label: `${structureLabels[structure]}: ${prop}`
          });
        });
      }
    });

    if (allSelected.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="プロパティが選択されていません"
          style={{ margin: '16px 0' }}
        />
      );
    }

    return (
      <Space wrap style={{ padding: '16px' }}>
        {allSelected.map(({ structure, property, label }) => (
          <Tag
            key={`${structure}-${property}`}
            closable
            onClose={() => onPropertyToggle(structure, property)}
            color="blue"
          >
            {label}
          </Tag>
        ))}
      </Space>
    );
  };

  // プロパティリストの表示（Table形式）
  const renderPropertyList = (structure: keyof StructuredProperties) => {
    const properties = structuredProperties[structure] || {};
    const selected = selectedProperties[structure] || [];

    const propertyEntries = Object.entries(properties);

    if (propertyEntries.length === 0) {
      const tooltipTitle = structure === 'template'
        ? 'このノードにはテンプレートが設定されていません'
        : structure === 'data'
        ? 'このノードにはデータが設定されていません'
        : undefined;
      const emptyEl = (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={`${structureLabels[structure]}プロパティがありません`}
          style={{ padding: '32px 0' }}
        />
      );
      return tooltipTitle ? (
        <Tooltip title={tooltipTitle}>
          <span>{emptyEl}</span>
        </Tooltip>
      ) : emptyEl;
    }

    // テーブルのデータソース
    const dataSource = propertyEntries.map(([propKey, propertyObj]) => ({
      key: propKey,
      propKey,
      propertyObj,
      isSelected: selected.includes(propKey),
      label: getPropertyLabel(propKey, propertyObj),
      value: formatPropertyValue(propertyObj),
    }));

    // テーブルのカラム定義
    const columns: ColumnsType<typeof dataSource[0]> = [
      {
        title: '',
        dataIndex: 'isSelected',
        key: 'checkbox',
        width: 50,
        align: 'center',
        render: (isSelected: boolean, record) => (
          <Checkbox
            checked={isSelected}
            onChange={() => onPropertyToggle(structure, record.propKey)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      },
      {
        title: 'プロパティ名',
        dataIndex: 'label',
        key: 'label',
        width: '40%',
        render: (label: string) => <Text strong>{label}</Text>,
      },
      {
        title: '値',
        dataIndex: 'value',
        key: 'value',
        render: (formatted: { text: string; kind: string }) => {
          if (formatted.kind === 'undefined') {
            return (
              <Tooltip title="値が設定されていません">
                <Text type="secondary" italic style={{ fontSize: '12px', color: '#bfbfbf' }}>
                  {formatted.text}
                </Text>
              </Tooltip>
            );
          }
          if (formatted.kind === 'null') {
            return (
              <Tooltip title="null が設定されています">
                <Text type="secondary" italic style={{ fontSize: '12px', color: '#bfbfbf' }}>
                  {formatted.text}
                </Text>
              </Tooltip>
            );
          }
          if (formatted.kind === 'empty') {
            return (
              <Tooltip title="空の文字列が設定されています">
                <Text type="secondary" italic style={{ fontSize: '12px', color: '#bfbfbf' }}>
                  {formatted.text}
                </Text>
              </Tooltip>
            );
          }
          return (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {formatted.text}
            </Text>
          );
        },
      },
    ];

    return (
      <Table
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        size="small"
        scroll={{ y: 400 }}
        onRow={(record) => ({
          onClick: () => onPropertyToggle(structure, record.propKey),
          style: { cursor: 'pointer' },
        })}
      />
    );
  };

  // タブのバッジカウント
  const getTabLabel = (structure: keyof StructuredProperties) => {
    const count = selectedProperties[structure]?.length || 0;
    return (
      <Space>
        {structureLabels[structure]}
        {count > 0 && <Tag color="blue">{count}</Tag>}
      </Space>
    );
  };

  // 埋め込みモード時のコンテンツ
  const renderContent = () => (
    <>
      {/* 選択済みチップ */}
      <div style={{ borderBottom: '1px solid #f0f0f0', marginBottom: 16 }}>
        <Text strong style={{ padding: '8px 16px', display: 'block' }}>選択中のプロパティ</Text>
        {renderSelectedChips()}
      </div>

      {/* タブ */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'basic',
            label: getTabLabel('basic'),
            children: renderPropertyList('basic'),
          },
          {
            key: 'template',
            label: getTabLabel('template'),
            children: renderPropertyList('template'),
          },
          {
            key: 'data',
            label: getTabLabel('data'),
            children: renderPropertyList('data'),
          },
        ]}
      />
    </>
  );

  // 表示モードに応じてレンダリング
  switch (actualDisplayMode) {
    case 'embedded':
      // 埋め込みモード（SubNetViewer用）
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          height: '100%', 
          overflow: 'hidden',
          backgroundColor: '#fff'
        }}>
          {/* ヘッダー */}
          <div style={{ 
            padding: '16px', 
            borderBottom: '1px solid #f0f0f0',
            flexShrink: 0
          }}>
            <Text strong style={{ fontSize: 16 }}>
              {`プロパティ: ${nodeName || nodeId || '未選択'}`}
            </Text>
          </div>
          
          {/* コンテンツ */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {renderContent()}
          </div>
        </div>
      );

    case 'drawer':
      // Drawerモード（解決策B）
      return (
        <Drawer
          title={`プロパティ選択: ${nodeName || nodeId || '未選択'}`}
          placement="right"
          open={open}
          onClose={onClose}
          width={400}
          getContainer={getContainer || (() => document.body)}
          style={{ position: 'absolute' }}
          mask={true}
          maskClosable={true}
          destroyOnHidden={false}
        >
          {renderContent()}
        </Drawer>
      );

    case 'modal':
    default:
      // Modalモード（解決策A）
      return (
        <Modal
          title={`プロパティ選択: ${nodeName || nodeId || '未選択'}`}
          open={open}
          onCancel={onClose}
          onOk={onClose}
          width={800}
          style={{ top: 80 }}
          getContainer={getContainer || (() => document.body)}
          styles={{ body: { maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
        >
          {renderContent()}
        </Modal>
      );
  }
};

export default StructuredPropertySelector;
