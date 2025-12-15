'use client';

import React from 'react';
import {
  List,
  Typography,
  Tag,
  Dropdown,
  Space,
  Button,
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
        backgroundColor: '#ffffff',
        borderRight: '1px solid rgba(0, 0, 0, 0.06)',
        overflowY: 'auto',
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          padding: 16,
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Text strong style={{ fontSize: 14 }}>
              フォーマット一覧
            </Text>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
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
      <List
        dataSource={formats}
        renderItem={(format) => (
          <List.Item
            key={format.id}
            onClick={() => onFormatSelect(format.id)}
            style={{
              padding: '12px 16px',
              cursor: 'pointer',
              backgroundColor: selectedFormatId === format.id ? '#FFF1F3' : 'transparent',
              borderLeft: selectedFormatId === format.id ? '3px solid #CF0027' : '3px solid transparent',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
              <Space size="small">
                <Text
                  strong={selectedFormatId === format.id}
                  style={{ fontSize: 14 }}
                >
                  {format.name}
                </Text>
                <Tag
                  color={format.fileType === 'xml' ? 'cyan' : 'purple'}
                  style={{ fontSize: 9, margin: 0 }}
                >
                  {format.fileType.toUpperCase()}
                </Tag>
              </Space>
              <Space size="small" wrap>
                <Tag
                  color={getCategoryTagColor(format.category)}
                  style={{ fontSize: 10, margin: 0 }}
                >
                  {getCategoryLabel(format.category)}
                </Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {format.fileCount} ファイル
                </Text>
              </Space>
              <Text type="secondary" style={{ fontSize: 11 }}>
                部門: {format.department}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                更新: {new Date(format.updatedAt).toLocaleDateString('ja-JP')}
              </Text>
            </div>
          </List.Item>
        )}
      />
    </div>
  );
};

export default FormatFolderTree;
