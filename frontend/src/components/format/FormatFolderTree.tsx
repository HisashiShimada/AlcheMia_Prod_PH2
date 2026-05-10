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
import { useLanguage } from '@/contexts/LanguageContext';

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
  sortBy: 'name' | 'category' | 'updatedAt' | null;
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
  const { t, locale } = useLanguage();
  const dateLocale = locale === 'en' ? 'en-US' : 'ja-JP';

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
      protocol: t('format.tree.categoryProtocol'),
      material: t('format.tree.categoryMaterial'),
      measurement: t('format.tree.categoryMeasurement'),
      analysis: t('format.tree.categoryAnalysis'),
      sample: t('format.tree.categorySample'),
      device: t('format.tree.categoryDevice'),
    };
    return labels[category] || category;
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'name',
      label: (
        <Space>
          <span>{t('format.tree.nameColumn')}</span>
          {sortBy === 'name' && (sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />)}
        </Space>
      ),
      onClick: () => onSortChange('name'),
    },
    {
      key: 'category',
      label: (
        <Space>
          <span>{t('format.tree.categoryColumn')}</span>
          {sortBy === 'category' && (sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />)}
        </Space>
      ),
      onClick: () => onSortChange('category'),
    },
    {
      key: 'updatedAt',
      label: (
        <Space>
          <span>{t('format.tree.updatedAtColumn')}</span>
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
              {t('formatFolderTree.title')}
            </Text>
            <div>
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                {formats.length} {t('format.tree.formatCount')}
              </Text>
            </div>
          </div>
          <Dropdown menu={{ items: menuItems }} placement="bottomRight">
            <Button type="text" icon={<SortIcon />} size="small" />
          </Dropdown>
        </div>
      </div>

      {/* フォーマット一覧 */}
      <Space orientation="vertical" size={0} style={{ width: '100%' }} data-testid="format-list">
        {formats.map((format) => (
          <div
            key={format.id}
            onClick={() => onFormatSelect(format.id)}
            data-testid={`format-item-${format.id}`}
            data-format-name={format.name}
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
                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                  {format.fileCount} {t('format.tree.fileCount')}
                </Text>
              </Space>
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                {t('format.tree.updatedAt')} {new Date(format.updatedAt).toLocaleDateString(dateLocale)}
              </Text>
            </div>
          </div>
        ))}
      </Space>
    </div>
  );
};

export default FormatFolderTree;
