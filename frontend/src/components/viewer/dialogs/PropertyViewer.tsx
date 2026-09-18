// frontend/src/components/viewer/dialogs/PropertyViewer.tsx
// プロパティビューアコンポーネント（Ant Design v6版）

'use client';

import React, { useState } from 'react';
import { Typography, Tabs, Table, Card, Button, Space, Tag, theme, Tooltip } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { PropertyObject, StructuredProperties } from '@/types/editor';
import type { DataResultsGroup } from '@/utils/maimlDataExtractor';
import { useLanguage } from '@/contexts/LanguageContext';

const { Title, Text } = Typography;

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
  const { t } = useLanguage();
  
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
        <Tooltip title={t('viewer.propertyViewer.valueNotSet')}>
          <Text type="secondary" italic style={{ color: '#bfbfbf' }}>{t('viewer.propertyViewer.valueNotSetLabel')}</Text>
        </Tooltip>
      );
    }
    // null: 明示的に null が設定されている
    if (value === null) {
      return (
        <Tooltip title={t('viewer.propertyViewer.nullSet')}>
          <Text type="secondary" italic style={{ color: '#bfbfbf' }}>null</Text>
        </Tooltip>
      );
    }
    // 空文字: 値は存在するが中身が空
    if (value === '') {
      return (
        <Tooltip title={t('viewer.propertyViewer.emptyStringSet')}>
          <Text type="secondary" italic style={{ color: '#bfbfbf' }}>
            {`""`} <Text type="secondary" style={{ fontSize: 10 }}>({t('viewer.propertyViewer.emptyStringLabel')})</Text>
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

  // 基本情報・データタブ用カラム
  const columns = [
    {
      title: t('viewer.propertyViewer.colProperty'),
      dataIndex: 'propKey',
      key: 'propKey',
      width: '35%',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: t('viewer.propertyViewer.colValue'),
      dataIndex: 'value',
      key: 'value',
      render: renderValue,
    },
  ];

  // ✅ Fix4: テンプレートタブ専用カラム（type/description列追加）
  const templateColumns = [
    {
      title: t('viewer.propertyViewer.colKey'),
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
          <Tooltip title={t('viewer.propertyViewer.xsiTypeNotSet')}>
            <Text type="secondary" style={{ fontSize: 11, color: '#bfbfbf' }}>-</Text>
          </Tooltip>
        ),
    },
    {
      title: t('viewer.propertyViewer.colValue'),
      dataIndex: 'value',
      key: 'value',
      width: '25%',
      render: renderValue,
    },
    {
      title: t('viewer.propertyViewer.colDescriptionUnit'),
      dataIndex: 'description',
      key: 'description',
      width: '25%',
      render: (_: unknown, record: { description?: string; [key: string]: unknown }) => {
        const text = record.description;
        return text && text.trim()
          ? <Text type="secondary" style={{ fontSize: 11 }}>{text}</Text>
          : (
            <Tooltip title={t('viewer.propertyViewer.descriptionNotSet')}>
              <Text type="secondary" style={{ fontSize: 11, color: '#bfbfbf' }}>-</Text>
            </Tooltip>
          );
      },
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

  // -----------------------------------------------------------------------
  // データタブ: Results N件グループ表示用
  // -----------------------------------------------------------------------

  /** データタブ テーブル行データ型 */
  interface DataTabRow {
    key: string;
    propKey: string;
    xsiType?: string;
    value?: string;
    description?: string;
  }

  /** データタブ カラム定義（テンプレートタブと同等の4列） */
  const dataTabColumns: ColumnsType<DataTabRow> = [
    {
      title: t('viewer.propertyViewer.colKey'),
      dataIndex: 'propKey',
      key: 'propKey',
      width: '22%',
      render: (text: string) => <Text strong style={{ fontSize: 12 }}>{text}</Text>,
    },
    {
      title: 'xsi:type',
      dataIndex: 'xsiType',
      key: 'xsiType',
      width: '22%',
      render: (text?: string) => text
        ? <Text type="secondary" style={{ fontSize: 11 }}>{text}</Text>
        : (
          <Tooltip title={t('viewer.propertyViewer.xsiTypeNotSet')}>
            <Text type="secondary" style={{ fontSize: 11, color: '#bfbfbf' }}>-</Text>
          </Tooltip>
        ),
    },
    {
      title: t('viewer.propertyViewer.colValue'),
      dataIndex: 'value',
      key: 'value',
      width: '28%',
      render: (text?: string) => renderValue(text),
    },
    {
      title: t('viewer.propertyViewer.colDescriptionUnit'),
      dataIndex: 'description',
      key: 'description',
      width: '28%',
      render: (text?: string) => text && text.trim()
        ? <Text type="secondary" style={{ fontSize: 11 }}>{text}</Text>
        : (
          <Tooltip title={t('viewer.propertyViewer.descriptionNotSet')}>
            <Text type="secondary" style={{ fontSize: 11, color: '#bfbfbf' }}>-</Text>
          </Tooltip>
        ),
    },
  ];

  /**
   * DataResultsGroup[] をタブ内コンテンツとしてレンダリングする
   * 各グループにカウントヘッダーを付与し、テンプレートタブと同等の4列テーブルで表示する
   */
  const renderDataGroups = (groups: DataResultsGroup[]) => {
    if (groups.length === 0) {
      return (
        <Tooltip title={t('viewer.propertyViewer.dataNotSet')}>
          <Text type="secondary" style={{ cursor: 'default' }}>{t('viewer.propertyViewer.noPropertiesToDisplay')}</Text>
        </Tooltip>
      );
    }

    return (
      <div>
        {groups.map((group, index) => {
          const headerLabel = group.resultsName
            ? `Results #${index + 1}  ${group.resultsName}`
            : `Results #${index + 1}`;

          const rows: DataTabRow[] = group.properties.map((p, i) => ({
            key: `${index}_${i}`,
            propKey: p.key,
            xsiType: p.xsiType,
            value: p.value,
            description: [p.description, p.units ? t('viewer.propertyViewer.unitLabel').replace('{units}', p.units) : undefined]
              .filter(Boolean)
              .join(' / ') || undefined,
          }));

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
              {/* Results メタ情報 */}
              {(group.resultsDescription || group.resultsUuid) && (
                <div style={{ marginBottom: 6, paddingLeft: 4 }}>
                  {group.resultsDescription && (
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {group.resultsDescription}
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
              {/* プロパティテーブル */}
              {rows.length > 0 ? (
                <Table<DataTabRow>
                  columns={dataTabColumns}
                  dataSource={rows}
                  pagination={false}
                  size="small"
                  showHeader={true}
                  scroll={{ x: true }}
                />
              ) : (
                <Text type="secondary" style={{ fontSize: 12, paddingLeft: 8 }}>
                  {t('viewer.propertyViewer.noProperties')}
                </Text>
              )}
            </div>
          );
        })}
      </div>
    );
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
      name: t('viewer.propertyKeyMap.name'),
      type: t('viewer.propertyKeyMap.type'),
      description: t('viewer.propertyKeyMap.description'),
      uuid: 'UUID',
      annotation: 'Annotation',
      placeRefs: t('viewer.propertyKeyMap.placeRefs'),
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
      label: t('viewer.propertyViewer.tabBasic'),
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
      label: t('viewer.propertyViewer.tabTemplate'),
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
        <Tooltip title={t('viewer.propertyViewer.templateNotSet')}>
          <Text type="secondary" style={{ cursor: 'default' }}>{t('viewer.propertyViewer.noPropertiesToDisplay')}</Text>
        </Tooltip>
      ),
    },
    {
      key: 'data',
      label: (
        <Space>
          {t('viewer.propertyViewer.tabData')}
          {(structuredProperties.dataGroups ?? []).length > 0 && (
            <Tag color="blue">{t('viewer.propertyViewer.itemCount').replace('{count}', String((structuredProperties.dataGroups ?? []).length))}</Tag>
          )}
        </Space>
      ),
      children: renderDataGroups(structuredProperties.dataGroups ?? []),
    },
  ];
  
  // プロパティが空の場合
  if (!properties || Object.keys(properties).length === 0) {
    return (
      <Card
        title={t('viewer.propertyViewer.propertyCardTitle')}
        extra={onClose && <Button type="text" icon={<CloseOutlined />} onClick={onClose} />}
        style={{ height: '100%' }}
      >
        <Text type="secondary">{t('viewer.propertyViewer.noPropertyInfo')}</Text>
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
            {t('viewer.propertyViewer.headerTitle').replace('{name}', properties.name || t('viewer.propertyViewer.nodeDefault'))}
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
