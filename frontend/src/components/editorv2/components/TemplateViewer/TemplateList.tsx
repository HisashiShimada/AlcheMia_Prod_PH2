/**
 * TemplateList - テンプレート一覧表示（横並び3カラムレイアウト）
 * Context APIから取得したテンプレートを表示
 */

import React from 'react';
import { Card, Typography, Badge, Spin, Checkbox, Tooltip, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTemplates } from '../../../../contexts/TemplateContext';
import TemplateItem from './TemplateItem';

const { Title, Text } = Typography;

interface Template {
  id: string;
  name: string;
  propertiesCount: number;
  placeRefsCount?: number;
  placeRefs?: unknown[];
}

interface TemplatesByCategory {
  material: Template[];
  condition: Template[];
  result: Template[];
}

interface TemplateListProps {
  onTemplateSelect: (template: Template) => void;
  showCommonTemplates: boolean;
  onShowCommonTemplatesChange: (checked: boolean) => void;
  onTemplateAdd: (category: string) => void;
  onTemplateDelete: (id: string) => void;
}

const TemplateList: React.FC<TemplateListProps> = ({
  onTemplateSelect,
  showCommonTemplates,
  onShowCommonTemplatesChange,
  onTemplateAdd,
  onTemplateDelete,
}) => {
  const { templates, commonTemplates, templateErrors, isLoading } = useTemplates();

  // デバッグログ: Contextから取得したテンプレート情報
  React.useEffect(() => {
    console.log('🔄 [TemplateList] レンダリング検出:', {
      timestamp: new Date().toISOString(),
      showCommonTemplates,
      templatesKeys: {
        material: templates?.material?.length || 0,
        condition: templates?.condition?.length || 0,
        result: templates?.result?.length || 0,
      },
    });
  });

  // 表示するテンプレートを決定（安全なデフォルト値を保証）
  const displayTemplates: TemplatesByCategory = showCommonTemplates
    ? (commonTemplates || { material: [], condition: [], result: [] })
    : (templates || { material: [], condition: [], result: [] });

  // 共通テンプレートの件数を計算
  const commonTemplateCount =
    (commonTemplates?.material?.length || 0) +
    (commonTemplates?.condition?.length || 0) +
    (commonTemplates?.result?.length || 0);

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'material':
        return '#F8C471';
      case 'condition':
        return '#85C1E9';
      case 'result':
        return '#D7BDE2';
      default:
        return '#E0E0E0';
    }
  };

  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'material':
        return 'Material Templates';
      case 'condition':
        return 'Condition Templates';
      case 'result':
        return 'Result Templates';
      default:
        return category;
    }
  };

  const renderCategoryColumn = (category: string, templateList: Template[]) => {
    const errorCount = templateList.reduce((count, template) => {
      const errors = templateErrors[template.id] || [];
      return count + errors.length;
    }, 0);

    return (
      <Card
        key={category}
        style={{
          height: '100%',
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          border: `2px solid ${getCategoryColor(category)}`,
        }}
        bodyStyle={{
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {/* ヘッダー（固定） */}
        <div
          style={{
            padding: '16px',
            backgroundColor: `${getCategoryColor(category)}20`,
            borderBottom: `2px solid ${getCategoryColor(category)}`,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <Text strong style={{ fontSize: 14 }}>
              {getCategoryLabel(category)}
            </Text>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Badge count={templateList.length} showZero style={{ backgroundColor: '#1677ff' }} />
              {errorCount > 0 && (
                <Badge count={errorCount} style={{ backgroundColor: '#faad14' }} />
              )}
              <Tooltip title={`${getCategoryLabel(category)}を追加`}>
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => onTemplateAdd(category)}
                  style={{
                    backgroundColor: getCategoryColor(category),
                    borderColor: getCategoryColor(category),
                    width: 28,
                    height: 28,
                    padding: 0,
                  }}
                />
              </Tooltip>
            </div>
          </div>
        </div>

        {/* テンプレートリスト（スクロール可能） */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '16px',
            backgroundColor: '#fafafa',
          }}
        >
          {templateList.length === 0 ? (
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '32px 0' }}>
              テンプレートがありません
            </Text>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {templateList.map((template) => (
                <TemplateItem
                  key={template.id}
                  template={template}
                  errors={templateErrors[template.id] || []}
                  categoryColor={getCategoryColor(category)}
                  onClick={() => onTemplateSelect(template)}
                  onDelete={onTemplateDelete}
                  showDelete={!template.placeRefs || template.placeRefs.length === 0}
                />
              ))}
            </div>
          )}
        </div>
      </Card>
    );
  };

  // ローディング表示
  if (isLoading) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        gap: 16,
        overflow: 'hidden',
      }}
    >
      {/* ヘッダー: タイトルと共通テンプレート切替 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <Title level={5} style={{ margin: 0, fontWeight: 'bold' }}>
          テンプレート一覧
        </Title>

        {/* 共通テンプレート表示切替チェックボックス（常に表示） */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Checkbox
            checked={showCommonTemplates}
            onChange={(e) => {
              const newValue = e.target.checked;
              console.log('🔍 [TemplateList] チェックボックス変更:', {
                oldValue: showCommonTemplates,
                newValue: newValue,
              });
              onShowCommonTemplatesChange(newValue);
            }}
          >
            共通テンプレート
          </Checkbox>
          {commonTemplateCount > 0 && (
            <Badge count={commonTemplateCount} style={{ backgroundColor: '#1677ff' }} />
          )}
        </div>
      </div>

      {/* 3カラムレイアウト */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {renderCategoryColumn('material', displayTemplates.material || [])}
        {renderCategoryColumn('condition', displayTemplates.condition || [])}
        {renderCategoryColumn('result', displayTemplates.result || [])}
      </div>
    </div>
  );
};

export default TemplateList;