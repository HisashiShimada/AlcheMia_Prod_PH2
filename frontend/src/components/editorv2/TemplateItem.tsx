/**
 * TemplateItem - テンプレートリストアイテム
 * 個別テンプレートの表示コンポーネント
 */

import React from 'react';
import { Card, Typography, Tag, Tooltip, Button, Badge } from 'antd';
import { WarningOutlined, DeleteOutlined } from '@ant-design/icons';
import { Template } from '@/types/maiml-unified';
import type { TemplateError } from '@/types/editor';

const { Text } = Typography;

interface TemplateItemProps {
  template: Template;
  errors: TemplateError[];
  categoryColor: string;
  onClick: () => void;
  onDelete: (id: string) => void;
  showDelete: boolean;
}

const TemplateItem: React.FC<TemplateItemProps> = ({
  template,
  errors,
  categoryColor,
  onClick,
  onDelete,
  showDelete,
}) => {
  const hasErrors = errors.length > 0;

  return (
    <Badge
      count={
        hasErrors ? (
          <WarningOutlined style={{ color: '#fff', fontSize: 14 }} />
        ) : (
          0
        )
      }
      offset={[-8, 8]}
      style={{
        backgroundColor: '#f44336',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      }}
    >
      <Card
        size="small"
        onClick={onClick}
        style={{
          backgroundColor: hasErrors ? '#fff3e0' : 'white',
          border: hasErrors ? '2px solid #ff9800' : '1px solid #e0e0e0',
          borderLeft: hasErrors ? '4px solid #f44336' : `4px solid ${categoryColor}`,
          cursor: 'pointer',
          transition: 'all 0.2s',
          position: 'relative',
        }}
        hoverable
        styles={{ body: { padding: '12px' } }}
      >
        {/* ヘッダー: カテゴリ色・タイトル・警告・削除ボタン */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: categoryColor,
              flexShrink: 0,
            }}
          />
          <Text strong style={{ flex: 1, fontSize: 14 }}>
            {template.name}
          </Text>
          {hasErrors && (
            <Tooltip title={`${errors.length}件の警告`}>
              <Tag icon={<WarningOutlined />} color="warning">
                {errors.length}
              </Tag>
            </Tooltip>
          )}
          {showDelete && (
            <Tooltip title="テンプレートを削除">
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(template.id);
                }}
                style={{ padding: '2px 4px' }}
              />
            </Tooltip>
          )}
        </div>

        {/* ID表示 */}
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
          ID: {template.id}
        </Text>

        {/* カウント情報 */}
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            プロパティ: {template.properties?.length}件
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ノード紐付け: {template.placeRefs.length || 0}件
          </Text>
        </div>

        {/* エラー詳細（警告がある場合のみ） */}
        {hasErrors && (
          <div
            style={{
              marginTop: 8,
              padding: 8,
              backgroundColor: '#fff3e0',
              borderRadius: 4,
            }}
          >
            {errors.slice(0, 2).map((error, idx) => (
              <Text
                key={idx}
                style={{ fontSize: 12, color: '#ed6c02', display: 'block' }}
              >
                • {error.message}
              </Text>
            ))}
            {errors.length > 2 && (
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                他 {errors.length - 2}件
              </Text>
            )}
          </div>
        )}
      </Card>
    </Badge>
  );
};

export default TemplateItem;