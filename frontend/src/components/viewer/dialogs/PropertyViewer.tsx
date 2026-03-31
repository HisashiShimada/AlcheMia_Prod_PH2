// frontend/src/components/viewer/dialogs/PropertyViewer.tsx
// プロパティビューアコンポーネント（Ant Design v6版）

'use client';

import React, { useState } from 'react';
import { Typography, Tabs, Table, Card, Button, Space, Tag, theme, Tooltip } from 'antd';
import { CloseOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

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
  // null / "" / 0 / false はそのまま返す。value が undefined のときのみ undefined を返す（renderValue が処理）
  const getPropertyValue = (propObj: PropertyObject): unknown => {
    if (propObj.value !== undefined) {
      return propObj.value;
    }
    if (propObj.defaultValue !== undefined) {
      return propObj.defaultValue;
    }
    return undefined;
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
  
  // プロパティ値のレンダリングヘルパー
  // undefined / null / "" を明確に区別して表示する
  const renderValue = (value: unknown) => {
    // undefined: プロパティ自体が未設定
    if (value === undefined) {
      return (
        <Tooltip title="値が設定されていません">
          <Text type="secondary" italic style={{ color: '#bfbfbf' }}>未設定</Text>
        </Tooltip>
      );
    }
    // null: 明示的に null が設定されている
    if (value === null) {
      return (
        <Tooltip title="null が設定されています">
          <Text type="secondary" italic style={{ color: '#bfbfbf' }}>null</Text>
        </Tooltip>
      );
    }
    // 空文字: 値は存在するが中身が空
    if (value === '') {
      return (
        <Tooltip title="空の文字列が設定されています">
          <Text type="secondary" italic style={{ color: '#bfbfbf' }}>
            {`""`} <Text type="secondary" style={{ fontSize: 10 }}>(空文字)</Text>
          </Text>
        </Tooltip>
      );
    }
    // boolean: true / false をそのまま表示
    if (typeof value === 'boolean') {
      return value
        ? <Tag color="success">true</Tag>
        : <Tag color="error">false</Tag>;
    }
    if (typeof value === 'object') {
      // Object型をフラット展開して表示
      return (
        <div style={{ fontSize: 12 }}>
          {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', gap: 4 }}>
              <Text type="secondary" style={{ fontSize: 11, minWidth: 60 }}>{k}:</Text>
              <Text style={{ fontSize: 11 }}>{String(v ?? '')}</Text>
            </div>
          ))}
        </div>
      );
    }
    return <Text>{String(value)}</Text>;
  };

  // 基本情報・データタブ用カラム
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
      render: renderValue,
    },
  ];

  // ✅ Fix4: テンプレートタブ専用カラム（type/description列追加）
  const templateColumns = [
    {
      title: 'キー',
      dataIndex: 'propKey',
      key: 'propKey',
      width: '30%',
      render: (text: string) => <Text strong style={{ fontSize: 12 }}>{text}</Text>,
    },
    {
      title: 'xsi:type',
      dataIndex: 'xsiType',
      key: 'xsiType',
      width: '20%',
      render: (text: string) => text
        ? <Text type="secondary" style={{ fontSize: 11 }}>{text}</Text>
        : (
          <Tooltip title="xsi:type が設定されていません">
            <Text type="secondary" style={{ fontSize: 11, color: '#bfbfbf' }}>-</Text>
          </Tooltip>
        ),
    },
    {
      title: '値',
      dataIndex: 'value',
      key: 'value',
      width: '25%',
      render: renderValue,
    },
    {
      title: '説明/単位',
      dataIndex: 'description',
      key: 'description',
      width: '25%',
      render: (text: string) => text
        ? <Text type="secondary" style={{ fontSize: 11 }}>{text}</Text>
        : (
          <Tooltip title="説明・単位が設定されていません">
            <Text type="secondary" style={{ fontSize: 11, color: '#bfbfbf' }}>-</Text>
          </Tooltip>
        ),
    },
  ];

  // ✅ Fix4: テンプレートタブ用データ変換（structuredProperties.template から直接 xsiType/description を取り出す）
  const convertToTemplateTableData = (propsMap: Record<string, PropertyObject>) => {
    return Object.entries(propsMap).map(([rawKey, propObj], index) => {
      // 'property_' プレフィックスを除去して表示
      const displayKey = rawKey.startsWith('property_') ? rawKey.slice('property_'.length) : rawKey;
      return {
        key: index.toString(),
        propKey: displayKey,
        xsiType: propObj.type ?? '',
        value: propObj.value,
        description: propObj.description ?? '',
      };
    });
  };
  
  // 基本情報・データタブ用データ変換
  const convertToTableData = (data: Record<string, unknown>) => {
    return Object.entries(data).map(([propKey, value], index) => ({
      key: index.toString(),
      propKey: formatKey(propKey),
      value: value,
    }));
  };
  
  // キー名をフォーマット
  const formatKey = (key: string): string => {
    // ✅ property_* プレフィックスを除去して表示
    if (key.startsWith('property_')) {
      return key.slice('property_'.length);
    }
    const keyMap: Record<string, string> = {
      id: 'ID',
      name: '名前',
      type: 'タイプ',
      description: '説明',
      uuid: 'UUID',
      annotation: 'Annotation',
      placeRefs: 'Place参照',
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
      children: Object.keys(structuredProperties.template || {}).length > 0 ? (
        <Table
          columns={templateColumns}
          dataSource={convertToTemplateTableData(structuredProperties.template)}
          pagination={false}
          size="small"
          showHeader={true}
          scroll={{ x: true }}
        />
      ) : (
        <Tooltip title="このノードにはテンプレートが設定されていません">
          <Text type="secondary" style={{ cursor: 'default' }}>表示するプロパティがありません</Text>
        </Tooltip>
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
        <Tooltip title="このノードにはデータが設定されていません">
          <Text type="secondary" style={{ cursor: 'default' }}>表示するプロパティがありません</Text>
        </Tooltip>
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
