// frontend/src/components/viewer/dialogs/PropertyViewerWithSelection.tsx
// プロパティビューア with 選択機能（Ant Design v6版）

'use client';

import React, { useState, useEffect } from 'react';
import { Typography, Tabs, Table, Button, Space, Tag, theme, Checkbox, Empty } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

/**
 * 選択されたプロパティの状態
 */
interface SelectedProperties {
  basic: string[];
  template: string[];
  data: string[];
}

/**
 * プロパティオブジェクトの型定義
 */
interface PropertyObject {
  key?: string;
  value?: unknown;
  type?: string;
  description?: string;
  defaultValue?: string;
}

/**
 * 構造化されたプロパティの型定義
 */
interface StructuredProperties {
  basic: Record<string, PropertyObject>;
  template: Record<string, PropertyObject>;
  data: Record<string, PropertyObject>;
}

/**
 * プロパティビューア with 選択機能コンポーネント
 * PropertyViewerをベースに、チェックボックス選択機能を追加
 */
interface PropertyViewerWithSelectionProps {
  // プロパティ情報
  properties: {
    id: string;
    name: string;
    type: 'Material' | 'Condition' | 'Result' | 'Transition';
  };
  
  // 構造化されたプロパティ（MAIMLデータの代わり）
  structuredProperties: StructuredProperties;
  
  // 選択状態（親コンポーネントで管理）
  selectedProperties: SelectedProperties;
  
  // プロパティ選択時のコールバック
  onPropertyToggle: (
    structure: 'basic' | 'template' | 'data',
    property: string
  ) => void;
  
  // 閉じるボタンのハンドラ
  onClose?: () => void;
}

/**
 * テーブルデータの型
 */
interface TableDataType {
  key: string;  // 内部キー（プロパティ名）
  propKey: string;  // 表示用プロパティ名
  value: unknown;  // 値
}

const PropertyViewerWithSelection: React.FC<PropertyViewerWithSelectionProps> = ({
  properties,
  structuredProperties,
  selectedProperties,
  onPropertyToggle,
  onClose,
}) => {
  const { token } = theme.useToken();
  
  // アクティブなタブの状態
  const [activeTab, setActiveTab] = useState('basic');
  
  // ヘッダーカラーを計算（useMemoで最適化）
  const headerColor = React.useMemo(() => {
    if (!properties?.type) return '#D7BDE2';
    
    switch (properties.type) {
      case 'Result':
        return '#D7BDE2'; // マゼンタ
      case 'Condition':
        return '#85C1E9'; // シアン
      case 'Material':
        return '#F8C471'; // 黄色
      case 'Transition':
        return '#CCCCCC'; // グレー
      default:
        return '#D7BDE2';
    }
  }, [properties?.type]);
  
  // structuredPropertiesから値を取得するヘルパー関数
  const getPropertyValue = (propObj: PropertyObject): unknown => {
    if (propObj.value !== undefined) {
      return propObj.value;
    }
    if (propObj.defaultValue !== undefined) {
      return propObj.defaultValue;
    }
    return '未設定';
  };
  
  // structuredPropertiesをテーブル用のRecord形式に変換
  const basicInfo = React.useMemo(() => {
    const result: Record<string, unknown> = {};
    Object.entries(structuredProperties.basic || {}).forEach(([key, propObj]) => {
      result[key] = getPropertyValue(propObj);
    });
    return result;
  }, [structuredProperties.basic]);
  
  const templateProps = React.useMemo(() => {
    const result: Record<string, unknown> = {};
    Object.entries(structuredProperties.template || {}).forEach(([key, propObj]) => {
      result[key] = getPropertyValue(propObj);
    });
    return result;
  }, [structuredProperties.template]);
  
  const dataProps = React.useMemo(() => {
    const result: Record<string, unknown> = {};
    Object.entries(structuredProperties.data || {}).forEach(([key, propObj]) => {
      result[key] = getPropertyValue(propObj);
    });
    return result;
  }, [structuredProperties.data]);
  
  // キー名をフォーマット
  const formatKey = (key: string): string => {
    const keyMap: Record<string, string> = {
      id: 'ID',
      name: '名前',
      type: 'タイプ',
      description: '説明',
      uuid: 'UUID',
      template_uuid: 'Template UUID',
      template_description: 'Template Description',
      instruction_id: 'Instruction ID',
      instruction_uuid: 'Instruction UUID',
      instruction_description: 'Instruction Description',
      insertion_uri: 'Insertion URI',
      insertion_hash: 'Insertion Hash',
      insertion_format: 'Insertion Format',
      results_id: 'Results ID',
      results_uuid: 'Results UUID',
      results_name: 'Results Name',
      results_description: 'Results Description',
      results_uri: 'Results URI',
      results_hash: 'Results Hash',
    };
    
    return keyMap[key] || key;
  };
  
  // プロパティデータをテーブル用に変換
  const convertToTableData = (data: Record<string, unknown>): TableDataType[] => {
    return Object.entries(data).map(([propKey, value]) => ({
      key: propKey,  // 内部キー
      propKey: formatKey(propKey),  // 表示用プロパティ名
      value: value,  // 値
    }));
  };
  
  // テーブルのカラム定義を生成
  const getColumns = (structure: 'basic' | 'template' | 'data'): ColumnsType<TableDataType> => {
    const selected = selectedProperties[structure] || [];
    
    return [
      {
        title: '',
        dataIndex: 'selected',
        key: 'selected',
        width: 50,
        align: 'center',
        render: (_: unknown, record: TableDataType) => (
          <Checkbox
            checked={selected.includes(record.key)}
            onChange={(e) => {
              e.stopPropagation();
              onPropertyToggle(structure, record.key);
            }}
          />
        ),
      },
      {
        title: 'プロパティ',
        dataIndex: 'propKey',
        key: 'propKey',
        width: '35%',
        render: (text: string) => <Text strong>{text}</Text>,
      },
      {
        title: '値',
        dataIndex: 'value',
        key: 'value',
        render: (value: unknown) => {
          if (value === null || value === undefined || value === '') {
            return <Text type="secondary" italic>未設定</Text>;
          }
          if (typeof value === 'boolean') {
            return value ? (
              <Tag color="success">はい</Tag>
            ) : (
              <Tag color="error">いいえ</Tag>
            );
          }
          if (typeof value === 'object') {
            return <Text code>{JSON.stringify(value)}</Text>;
          }
          return <Text>{String(value)}</Text>;
        },
      },
    ];
  };
  
  // プロパティテーブルをレンダリング
  const renderPropertyTable = (
    structure: 'basic' | 'template' | 'data',
    data: Record<string, unknown>
  ) => {
    const tableData = convertToTableData(data);
    const selected = selectedProperties[structure] || [];
    
    if (tableData.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="プロパティがありません"
        />
      );
    }
    
    return (
      <Table<TableDataType>
        columns={getColumns(structure)}
        dataSource={tableData}
        pagination={false}
        size="small"
        showHeader={true}
        onRow={(record) => ({
          onClick: () => onPropertyToggle(structure, record.key),
          style: { 
            cursor: 'pointer',
            backgroundColor: selected.includes(record.key) ? '#e6f7ff' : 'transparent',
          },
        })}
        scroll={{ y: 400 }}
      />
    );
  };
  
  // 選択数を計算
  const getSelectedCount = (structure: 'basic' | 'template' | 'data'): number => {
    return selectedProperties[structure]?.length || 0;
  };
  
  // タブアイテム
  const tabItems = [
    {
      key: 'basic',
      label: (
        <Space>
          基本情報
          {getSelectedCount('basic') > 0 && (
            <Tag color="blue">{getSelectedCount('basic')}</Tag>
          )}
        </Space>
      ),
      children: renderPropertyTable('basic', basicInfo),
    },
    {
      key: 'template',
      label: (
        <Space>
          テンプレート
          {getSelectedCount('template') > 0 && (
            <Tag color="blue">{getSelectedCount('template')}</Tag>
          )}
        </Space>
      ),
      children: renderPropertyTable('template', templateProps),
    },
    {
      key: 'data',
      label: (
        <Space>
          データ
          {getSelectedCount('data') > 0 && (
            <Tag color="blue">{getSelectedCount('data')}</Tag>
          )}
        </Space>
      ),
      children: renderPropertyTable('data', dataProps),
    },
  ];
  
  // プロパティが空の場合
  if (!properties || !properties.id) {
    return (
      <div style={{ padding: 16 }}>
        <Text type="secondary">プロパティ情報がありません</Text>
      </div>
    );
  }
  
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      backgroundColor: token.colorBgContainer,
    }}>
      {/* ヘッダー */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: headerColor,
          borderBottom: `1px solid ${token.colorBorder}`,
        }}
      >
        <Space>
          <Title level={5} style={{ margin: 0, color: 'white' }}>
            {properties.name || 'ノード'} プロパティ
          </Title>
          {properties.type && (
            <Tag color="white" style={{ color: headerColor }}>
              {properties.type}
            </Tag>
          )}
        </Space>
        {onClose && (
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={onClose}
            style={{ color: 'white' }}
          />
        )}
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
  );
};

export default PropertyViewerWithSelection;
