/**
 * TemplateItem - テンプレートリストアイテム
 * 個別テンプレートの表示コンポーネント
 * 
 * @version 1.0.0
 * @date 2026-01-28
 */

import React from 'react';
import { Card, Typography, Tag, Tooltip, Button, Flex, Badge, theme } from 'antd';
import { WarningOutlined, DeleteOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * Template型定義
 */
export interface Template {
  id: string;
  name: string;
  propertiesCount: number;
  placeRefsCount: number;
  type?: string;
  description?: string;
  data?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/**
 * TemplateError型定義
 */
export interface TemplateError {
  message: string;
  level?: 'error' | 'warning' | 'info';
  type?: string; // エラータイプ（syntax_error, invalid_structure, reference_error等）
}

/**
 * Props型定義
 */
interface TemplateItemProps {
  template: Template;
  errors: TemplateError[];
  categoryColor: string;
  onClick: () => void;
  onDelete?: (templateId: string) => void;
  showDelete?: boolean;
}

/**
 * TemplateItem コンポーネント
 */
const TemplateItem: React.FC<TemplateItemProps> = ({
  template,
  errors,
  categoryColor,
  onClick,
  onDelete,
  showDelete = false,
}) => {
  const { token } = theme.useToken();
  const hasErrors = errors.length > 0;

  return (
    <Badge.Ribbon
      text={hasErrors ? <WarningOutlined /> : null}
      color={hasErrors ? token.colorError : 'transparent'}
      style={{ display: hasErrors ? 'block' : 'none' }}
    >
      <Card
        size="small"
        hoverable
        onClick={onClick}
        style={{
          backgroundColor: hasErrors ? '#fff3e0' : token.colorBgContainer,
          border: hasErrors ? `2px solid ${token.colorWarning}` : `1px solid ${token.colorBorder}`,
          borderLeft: hasErrors ? `4px solid ${token.colorError}` : `4px solid ${categoryColor}`,
          cursor: 'pointer',
          transition: 'all 0.2s',
          position: 'relative',
        }}
        bodyStyle={{ padding: token.paddingSM }}
      >
        <Flex vertical gap="small">
          {/* ヘッダー: 名前 + エラーバッジ + 削除ボタン */}
          <Flex align="center" gap="small">
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: categoryColor,
                flexShrink: 0,
              }}
            />
            <Text strong style={{ flex: 1 }}>
              {template.name}
            </Text>
            {hasErrors && (
              <Tooltip title={`${errors.length}件の警告`}>
                <Tag color="warning" icon={<WarningOutlined />}>
                  {errors.length}
                </Tag>
              </Tooltip>
            )}
            {showDelete && onDelete && (
              <Tooltip title="テンプレートを削除">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(template.id);
                  }}
                />
              </Tooltip>
            )}
          </Flex>

          {/* ID */}
          <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
            ID: {template.id}
          </Text>

          {/* 統計情報 */}
          <Flex gap="middle">
            <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
              プロパティ: {template.propertiesCount}件
            </Text>
            <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
              ノード紐付け: {template.placeRefsCount}件
            </Text>
          </Flex>

          {/* エラー詳細 */}
          {hasErrors && (
            <Card
              size="small"
              style={{
                backgroundColor: '#fff3e0',
                border: 'none',
              }}
              bodyStyle={{ padding: token.paddingXS }}
            >
              <Flex vertical gap="2px">
                {errors.slice(0, 2).map((error, idx) => (
                  <Text
                    key={idx}
                    type="warning"
                    style={{ fontSize: token.fontSizeSM }}
                  >
                    • {error.message}
                  </Text>
                ))}
                {errors.length > 2 && (
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    他 {errors.length - 2}件
                  </Text>
                )}
              </Flex>
            </Card>
          )}
        </Flex>
      </Card>
    </Badge.Ribbon>
  );
};

export default TemplateItem;