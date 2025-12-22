// frontend/src/components/viewer/dialogs/PropertyViewer.tsx
// プロパティビューアコンポーネント（Ant Design v6版）

'use client';

import React, { useState, useEffect } from 'react';
import { Typography, Tabs, Table, Card, Button, Space, Tag, theme } from 'antd';
import { CloseOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

/**
 * プロパティビューアコンポーネント
 * MAIML構造に特化したプロパティ表示
 */
interface PropertyViewerProps {
  properties: Record<string, any>;  // ノードのプロパティ情報
  maimlData: string;  // MAIMLデータ全体（XML文字列）
  onClose?: () => void;  // 閉じるボタンのハンドラ
}

const PropertyViewer: React.FC<PropertyViewerProps> = ({
  properties,
  maimlData,
  onClose,
}) => {
  const { token } = theme.useToken();
  
  // アクティブなタブの状態
  const [activeTab, setActiveTab] = useState('basic');
  
  // 各タブのデータ
  const [basicInfo, setBasicInfo] = useState<Record<string, any>>({});
  const [templateProps, setTemplateProps] = useState<Record<string, any>>({});
  const [dataProps, setDataProps] = useState<Record<string, any>>({});
  
  // MAIMLデータのパース結果
  const [parsedXml, setParsedXml] = useState<Document | null>(null);
  
  // ヘッダーカラー
  const [headerColor, setHeaderColor] = useState('#D7BDE2');
  
  // 初期化処理
  useEffect(() => {
    if (!maimlData) return;
    
    try {
      // XMLをパース
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(maimlData, 'text/xml');
      setParsedXml(xmlDoc);
      
      // ノードタイプに応じたヘッダー色を設定
      if (properties && properties.type) {
        switch (properties.type) {
          case 'Result':
            setHeaderColor('#D7BDE2'); // マゼンタ
            break;
          case 'Condition':
            setHeaderColor('#85C1E9'); // シアン
            break;
          case 'Material':
            setHeaderColor('#F8C471'); // 黄色
            break;
          case 'Transition':
            setHeaderColor('#CCCCCC'); // グレー
            break;
          default:
            setHeaderColor('#D7BDE2');
        }
      }
    } catch (err) {
      console.error('MAIMLデータのパースエラー:', err);
    }
  }, [maimlData, properties]);
  
  // プロパティが更新されたときにデータを取得
  useEffect(() => {
    if (!parsedXml || !properties || !properties.id) return;
    
    const nodeId = properties.id;
    const nodeType = properties.type;
    
    console.log(`[PropertyViewer] ノード情報: id=${nodeId}, type=${nodeType}`);
    
    // Transitionノードのプロパティを取得
    const fetchTransitionPropertiesInternal = (nodeId: string) => {
      const newBasicInfo: Record<string, unknown> = {
        id: nodeId,
        name: properties.name || nodeId,
        type: properties.type || 'Transition',
      };
      
      setBasicInfo(newBasicInfo);
      setTemplateProps({});
      setDataProps({});
    };
    
    // Placeノードのプロパティを取得
    const fetchPlacePropertiesInternal = (nodeId: string, nodeType: string) => {
      const newBasicInfo: Record<string, unknown> = {
        id: nodeId,
        name: properties.name || nodeId,
        type: properties.type || 'Place',
      };
      
      setBasicInfo(newBasicInfo);
      setTemplateProps({});
      setDataProps({});
    };
    
    // transitionノードの場合
    if (nodeType === 'Transition') {
      fetchTransitionPropertiesInternal(nodeId);
    } else {
      // placeノードの場合
      fetchPlacePropertiesInternal(nodeId, nodeType);
    }
  }, [parsedXml, properties]);
  
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
  const convertToTableData = (data: Record<string, any>) => {
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
