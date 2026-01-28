/**
 * TemplateList - テンプレート一覧表示（横並び3カラムレイアウト）
 * 
 * @version 1.0.0
 * @date 2026-01-28
 */

import React, { useEffect } from 'react';
import { Card, Typography, Badge, Spin, Flex, Checkbox, Button, Tooltip, theme } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import TemplateItem, { Template, TemplateError } from './TemplateItem';

const { Title, Text } = Typography;

/**
 * CategorizedTemplates型定義
 */
export interface CategorizedTemplates {
  material: Template[];
  condition: Template[];
  result: Template[];
}

/**
 * Props型定義
 */
interface TemplateListProps {
  templates: CategorizedTemplates;
  commonTemplates?: CategorizedTemplates;
  templateErrors: Record<string, TemplateError[]>;
  showCommonTemplates: boolean;
  isLoading?: boolean;
  onTemplateSelect: (template: Template) => void;
  onShowCommonTemplatesChange: (show: boolean) => void;
  onTemplateAdd: (category: 'material' | 'condition' | 'result') => void;
  onTemplateDelete: (templateId: string) => void;
}

/**
 * TemplateList コンポーネント
 */
const TemplateList: React.FC<TemplateListProps> = ({
  templates,
  commonTemplates,
  templateErrors,
  showCommonTemplates,
  isLoading = false,
  onTemplateSelect,
  onShowCommonTemplatesChange,
  onTemplateAdd,
  onTemplateDelete,
}) => {
  const { token } = theme.useToken();

  // レンダリング検出用のuseEffect
  useEffect(() => {
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
  const displayTemplates = showCommonTemplates && commonTemplates
    ? commonTemplates
    : templates;

  console.log('🔍 [TemplateList] displayTemplates:', {
    showCommonTemplates,
    material: displayTemplates.material?.length || 0,
    condition: displayTemplates.condition?.length || 0,
    result: displayTemplates.result?.length || 0,
  });

  // 共通テンプレートの件数を計算
  const commonTemplateCount = commonTemplates
    ? (commonTemplates.material?.length || 0) +
      (commonTemplates.condition?.length || 0) +
      (commonTemplates.result?.length || 0)
    : 0;

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

  const renderCategoryColumn = (category: 'material' | 'condition' | 'result', templateList: Template[]) => {
    const errorCount = templateList.reduce((count, template) => {
      const errors = templateErrors[template.id] || [];
      return count + errors.length;
    }, 0);

    return (
      <Card
        key={category}
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: '400px',
          border: `2px solid ${getCategoryColor(category)}`,
          overflow: 'hidden',
        }}
        bodyStyle={{
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {/* ヘッダー（固定） */}
        <div
          style={{
            padding: token.padding,
            backgroundColor: `${getCategoryColor(category)}20`,
            borderBottom: `2px solid ${getCategoryColor(category)}`,
            flexShrink: 0,
          }}
        >
          <Flex justify="space-between" align="center" style={{ marginBottom: token.marginXS }}>
            <Text strong>{getCategoryLabel(category)}</Text>
            <Flex gap="small" align="center">
              <Badge count={templateList.length} showZero color={token.colorPrimary} />
              {errorCount > 0 && (
                <Badge count={errorCount} color={token.colorWarning} />
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
                  }}
                />
              </Tooltip>
            </Flex>
          </Flex>
        </div>

        {/* テンプレートリスト（スクロール可能） */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'scroll',
            overflowX: 'hidden',
            padding: token.padding,
            backgroundColor: '#fafafa',
          }}
        >
          {templateList.length === 0 ? (
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', paddingTop: token.paddingXL }}>
              テンプレートがありません
            </Text>
          ) : (
            <Flex vertical gap="small">
              {templateList.map((template) => (
                <TemplateItem
                  key={template.id}
                  template={template}
                  errors={templateErrors[template.id] || []}
                  categoryColor={getCategoryColor(category)}
                  onClick={() => onTemplateSelect(template)}
                  onDelete={onTemplateDelete}
                  showDelete={!template.placeRefsCount || template.placeRefsCount === 0}
                />
              ))}
            </Flex>
          )}
        </div>
      </Card>
    );
  };

  // ローディング表示
  if (isLoading) {
    return (
      <Flex
        align="center"
        justify="center"
        style={{ height: '100%' }}
      >
        <Spin size="large" />
      </Flex>
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
        padding: token.padding,
        gap: token.padding,
        overflow: 'hidden',
      }}
    >
      {/* ヘッダー: タイトルと共通テンプレート切替 */}
      <Flex justify="space-between" align="center" style={{ flexShrink: 0 }}>
        <Title level={4} style={{ margin: 0, fontWeight: 'bold' }}>
          テンプレート一覧
        </Title>

        {/* 共通テンプレート表示切替チェックボックス */}
        <Flex align="center" gap="small">
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
            <Badge count={commonTemplateCount} color={token.colorInfo} />
          )}
        </Flex>
      </Flex>

      {/* 3カラムレイアウト */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: token.padding,
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