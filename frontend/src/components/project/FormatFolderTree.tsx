'use client';

import React from 'react';
import {
  Typography,
  Tag,
  Dropdown,
  Space,
  Button,
  theme,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  SortAscendingOutlined,
  SortDescendingOutlined,
  SortAscendingOutlined as SortIcon,
} from '@ant-design/icons';

const { Text } = Typography;

/**
 * フォーマットフォルダの型定義
 */
interface Format {
  id: string;
  name: string;
  folderName: string;
  description: string;
  fileCount: number;
  fileType: 'xml' | 'maiml';
  category: string;
  department: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

/**
 * FormatFolderTreeのProps
 */
interface FormatFolderTreeProps {
  formats: Format[];
  selectedFormatId: string | null;
  onFormatSelect: (formatId: string) => void;
  sortBy: 'name' | 'category' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: 'name' | 'category' | 'updatedAt') => void;
}

/**
 * フォーマット専用のフォルダツリーコンポーネント
 * XMLフォーマットファイルのフォルダ一覧を表示
 */
const FormatFolderTree: React.FC<FormatFolderTreeProps> = ({
  formats,
  selectedFormatId,
  onFormatSelect,
  sortBy,
  sortOrder,
  onSortChange,
}) => {
  const { token } = theme.useToken();
  
  const getCategoryTagColor = (category: string): string => {
    const colors: Record<string, string> = {
      protocol: 'cyan',
      material: 'success',
      measurement: 'blue',
      analysis: 'orange',
      sample: 'purple',
      device: 'red',
    };
    return colors[category] || 'default';
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      protocol: 'プロトコル',
      material: '材料',
      measurement: '測定',
      analysis: '解析',
      sample: '試料',
      device: '装置',
    };
    return labels[category] || category;
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'name',
      label: (
        <Space>
          <span>フォーマット名</span>
          {sortBy === 'name' && (sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />)}
        </Space>
      ),
      onClick: () => onSortChange('name'),
    },
    {
      key: 'category',
      label: (
        <Space>
          <span>カテゴリ</span>
          {sortBy === 'category' && (sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />)}
        </Space>
      ),
      onClick: () => onSortChange('category'),
    },
    {
      key: 'updatedAt',
      label: (
        <Space>
          <span>更新日</span>
          {sortBy === 'updatedAt' && (sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />)}
        </Space>
      ),
      onClick: () => onSortChange('updatedAt'),
    },
  ];

  return (
    <div
      style={{
        height: '100%',
        backgroundColor: token.colorBgContainer,
        borderRight: `1px solid ${token.colorBorderSecondary}`,
        overflowY: 'auto',
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          padding: token.margin,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Text strong style={{ fontSize: token.fontSize }}>
              フォーマット一覧
            </Text>
            <div>
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                {formats.length} フォーマット
              </Text>
            </div>
          </div>
          <Dropdown menu={{ items: menuItems }} placement="bottomRight">
            <Button type="text" icon={<SortIcon />} size="small" />
          </Dropdown>
        </div>
      </div>

      {/* フォーマット一覧 */}
      <Space orientation="vertical" size={0} style={{ width: '100%' }}>
        {formats.map((format) => (
          <div
            key={format.id}
            onClick={() => onFormatSelect(format.id)}
            style={{
              padding: `${token.paddingSM}px ${token.margin}px`,
              cursor: 'pointer',
              backgroundColor: selectedFormatId === format.id ? token.colorPrimaryBg : 'transparent',
              borderLeft: selectedFormatId === format.id ? `3px solid ${token.colorPrimary}` : '3px solid transparent',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: token.marginXS, width: '100%' }}>
              <Space size="small">
                <Text
                  strong={selectedFormatId === format.id}
                  style={{ fontSize: token.fontSize }}
                >
                  {format.name}
                </Text>
                <Tag
                  color={format.fileType === 'xml' ? 'cyan' : 'purple'}
                  style={{ fontSize: token.fontSizeSM, margin: 0 }}
                >
                  {format.fileType.toUpperCase()}
                </Tag>
              </Space>
              <Space size="small" wrap>
                <Tag
                  color={getCategoryTagColor(format.category)}
                  style={{ fontSize: token.fontSizeSM, margin: 0 }}
                >
                  {getCategoryLabel(format.category)}
                </Tag>
                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                  {format.fileCount} ファイル
                </Text>
              </Space>
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                部門: {format.department}
              </Text>
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                更新: {new Date(format.updatedAt).toLocaleDateString('ja-JP')}
              </Text>
            </div>
          </div>
        ))}
      </Space>
    </div>
  );
};

export default FormatFolderTree;
