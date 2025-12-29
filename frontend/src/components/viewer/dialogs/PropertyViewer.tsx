// frontend/src/components/viewer/dialogs/PropertyViewer.tsx
// プロパティビューアコンポーネント（Ant Design v6版）

'use client';

import React, { useState, useEffect } from 'react';
import { Typography, Tabs, Table, Card, Button, Space, Tag, theme } from 'antd';
import { CloseOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

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
 * プロパティビューアコンポーネント
 * MAIML構造に特化したプロパティ表示（structuredProperties方式）
 */
interface PropertyViewerProps {
  properties: {
    id: string;
    name: string;
    type: 'Material' | 'Condition' | 'Result' | 'Transition';
  };
  structuredProperties: StructuredProperties;  // 構造化されたプロパティ
  onClose?: () => void;  // 閉じるボタンのハンドラ
}

const PropertyViewer: React.FC<PropertyViewerProps> = ({
  properties,
  structuredProperties,
  onClose,
}) => {
  const { token } = theme.useToken();
  
  // アクティブなタブの状態
  const [activeTab, setActiveTab] = useState('basic');
  
  // ヘッダーカラーを計算
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
  
  // プロパティテーブルのカラム定義
  const columns = [
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
  
  // プロパティデータをテーブル用に変換
  const convertToTableData = (data: Record<string, unknown>) => {
    return Object.entries(data).map(([propKey, value], index) => ({
      key: index.toString(),
      propKey: formatKey(propKey),
      value: value,
    }));
  };
  
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
  
  // タブアイテム
  const tabItems = [
    {
      key: 'basic',
      label: '基本情報',
      children: (
        <Table
          columns={columns}
          dataSource={convertToTableData(basicInfo)}
          pagination={false}
          size="small"
          showHeader={false}
        />
      ),
    },
    {
      key: 'template',
      label: 'テンプレート',
      children: Object.keys(templateProps).length > 0 ? (
        <Table
          columns={columns}
          dataSource={convertToTableData(templateProps)}
          pagination={false}
          size="small"
          showHeader={false}
        />
      ) : (
        <Text type="secondary">表示するプロパティがありません</Text>
      ),
    },
    {
      key: 'data',
      label: 'データ',
      children: Object.keys(dataProps).length > 0 ? (
        <Table
          columns={columns}
          dataSource={convertToTableData(dataProps)}
          pagination={false}
          size="small"
          showHeader={false}
        />
      ) : (
        <Text type="secondary">表示するプロパティがありません</Text>
      ),
    },
  ];
  
  // プロパティが空の場合
  if (!properties || Object.keys(properties).length === 0) {
    return (
      <Card
        title="プロパティ"
        extra={onClose && <Button type="text" icon={<CloseOutlined />} onClick={onClose} />}
        style={{ height: '100%' }}
      >
        <Text type="secondary">プロパティ情報がありません</Text>
      </Card>
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

export default PropertyViewer;
