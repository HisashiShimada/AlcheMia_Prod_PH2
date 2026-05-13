// frontend/src/components/viewer/dialogs/PropertyViewerWithSelection.tsx
// プロパティビューア with 選択機能（Ant Design v6版）

'use client';

import React, { useState } from 'react';
import { Typography, Tabs, Table, Button, Space, Tag, theme, Checkbox, Empty, Tooltip } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { PropertyObject, StructuredProperties, SelectedProperties, TableDataType } from '@/types/editor';

const { Title, Text } = Typography;

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
  
  // プロパティデータをテーブル用に変換（基本情報・データタブ）
  const convertToTableData = (data: Record<string, unknown>): TableDataType[] => {
    return Object.entries(data).map(([propKey, value]) => ({
      key: propKey,
      propKey: formatKey(propKey),
      value: value,
    }));
  };

  // ✅ テンプレートタブ専用: structuredProperties.template から xsiType/description を取り出す
  const convertToTemplateTableData = (propsMap: Record<string, PropertyObject>): TableDataType[] => {
    return Object.entries(propsMap).map(([rawKey, propObj]) => {
      // 'property_' プレフィックスを除去して表示
      const displayKey = rawKey.startsWith('property_') ? rawKey.slice('property_'.length) : rawKey;
      return {
        key: rawKey,  // 内部キーはそのまま（選択状態管理に使用）
        propKey: displayKey,
        value: propObj.value,
        xsiType: propObj.type ?? '',
        description: propObj.description ?? '',
      };
    });
  };
  
  // 値のレンダリングヘルパー（undefined / null / "" を明確に区別して表示する）
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
    // boolean: JavaScript boolean型、または文字列 "true"/"false" を色付けして表示
    if (typeof value === 'boolean' || value === 'true' || value === 'false') {
      const isTruthy = value === true || value === 'true';
      return isTruthy
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
        render: renderValue,
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
      const tooltipTitle = structure === 'data'
        ? 'このノードにはデータが設定されていません'
        : 'プロパティがありません';
      return (
        <Tooltip title={tooltipTitle}>
          <span><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="プロパティがありません" /></span>
        </Tooltip>
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
      // ✅ テンプレートタブ専用: convertToTemplateTableData + 専用カラム
      children: (() => {
        const selected = selectedProperties['template'] || [];
        const tableData = convertToTemplateTableData(structuredProperties.template || {});
        if (tableData.length === 0) {
          return (
            <Tooltip title="このノードにはテンプレートが設定されていません">
              <span><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="プロパティがありません" /></span>
            </Tooltip>
          );
        }
        const templateCols: ColumnsType<TableDataType> = [
          {
            title: '',
            dataIndex: 'selected',
            key: 'selected',
            width: 40,
            align: 'center',
            render: (_: unknown, record: TableDataType) => (
              <Checkbox
                checked={selected.includes(record.key)}
                onChange={(e) => { e.stopPropagation(); onPropertyToggle('template', record.key); }}
              />
            ),
          },
          {
            title: 'キー',
            dataIndex: 'propKey',
            key: 'propKey',
            width: '28%',
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
            width: '27%',
            render: (_: unknown, record: TableDataType) => {
              const text = record.description;
              return text && text.trim()
                ? <Text type="secondary" style={{ fontSize: 11 }}>{text}</Text>
                : (
                  <Tooltip title="説明・単位が設定されていません">
                    <Text type="secondary" style={{ fontSize: 11, color: '#bfbfbf' }}>-</Text>
                  </Tooltip>
                );
            },
          },
        ];
        return (
          <Table<TableDataType>
            columns={templateCols}
            dataSource={tableData}
            pagination={false}
            size="small"
            showHeader={true}
            onRow={(record) => ({
              onClick: () => onPropertyToggle('template', record.key),
              style: {
                cursor: 'pointer',
                backgroundColor: selected.includes(record.key) ? '#e6f7ff' : 'transparent',
              },
            })}
            scroll={{ x: true, y: 400 }}
          />
        );
      })(),
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
