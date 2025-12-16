'use client';

import React from 'react';
import {
  List,
  Typography,
  Tag,
  Button,
  Dropdown,
  Space,
  Flex,
  theme,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  SortAscendingOutlined,
  SortDescendingOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface Project {
  id: string;
  name: string;
  folderName: string;
  fileCount: number;
  status: string;
}

interface ProjectFolderTreeProps {
  projects: Project[];
  selectedProjectId: string | null;
  onProjectSelect: (projectId: string) => void;
  expandedFolders: Set<string>;
  onToggleFolder: (folderId: string) => void;
  sortBy: 'name' | 'status' | 'createdAt';
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: 'name' | 'status' | 'createdAt') => void;
}

/**
 * プロジェクトフォルダツリーコンポーネント
 * 左側のサイドバーに表示されるフォルダ階層
 */
const ProjectFolderTree: React.FC<ProjectFolderTreeProps> = ({
  projects,
  selectedProjectId,
  onProjectSelect,
  expandedFolders,
  onToggleFolder,
  sortBy,
  sortOrder,
  onSortChange,
}) => {
  const { token } = theme.useToken();

  const getStatusTagColor = (status: string): string => {
    const colors: Record<string, string> = {
      planning: 'default',
      pending: 'processing',
      in_progress: 'blue',
      completed: 'success',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      planning: 'プロジェクト計画中',
      pending: 'タスク実行待ち',
      in_progress: 'タスク実行中',
      completed: 'プロジェクト完了',
    };
    return labels[status] || status;
  };

  const getSortIcon = () => {
    if (sortOrder === 'asc') {
      return <ArrowUpOutlined style={{ fontSize: 14 }} />;
    } else {
      return <ArrowDownOutlined style={{ fontSize: 14 }} />;
    }
  };

  const getSortLabel = (sort: 'name' | 'status' | 'createdAt'): string => {
    const labels = {
      name: 'プロジェクト名',
      status: 'ステータス',
      createdAt: '作成日',
    };
    return labels[sort];
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'name',
      label: (
        <Flex justify="space-between" align="center" style={{ minWidth: 120 }}>
          <span>プロジェクト名</span>
          {sortBy === 'name' && getSortIcon()}
        </Flex>
      ),
      onClick: () => onSortChange('name'),
    },
    {
      key: 'status',
      label: (
        <Flex justify="space-between" align="center" style={{ minWidth: 120 }}>
          <span>ステータス</span>
          {sortBy === 'status' && getSortIcon()}
        </Flex>
      ),
      onClick: () => onSortChange('status'),
    },
    {
      key: 'createdAt',
      label: (
        <Flex justify="space-between" align="center" style={{ minWidth: 120 }}>
          <span>作成日</span>
          {sortBy === 'createdAt' && getSortIcon()}
        </Flex>
      ),
      onClick: () => onSortChange('createdAt'),
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
          padding: 16,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Flex justify="space-between" align="center">
          <div>
            <Text strong style={{ display: 'block', fontSize: 14 }}>
              プロジェクト一覧
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {projects.length} プロジェクト
            </Text>
          </div>
          <Dropdown menu={{ items: menuItems }} trigger={['click']}>
            <Button
              type="text"
              size="small"
              icon={sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
            />
          </Dropdown>
        </Flex>
      </div>

      {/* プロジェクト一覧 */}
      <List
        dataSource={projects}
        renderItem={(project) => (
          <List.Item
            key={project.id}
            onClick={() => onProjectSelect(project.id)}
            style={{
              cursor: 'pointer',
              padding: '8px 16px',
              backgroundColor:
                selectedProjectId === project.id
                  ? token.colorPrimaryBg
                  : 'transparent',
              borderLeft:
                selectedProjectId === project.id
                  ? `3px solid ${token.colorPrimary}`
                  : '3px solid transparent',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (selectedProjectId !== project.id) {
                e.currentTarget.style.backgroundColor = token.colorBgTextHover;
              }
            }}
            onMouseLeave={(e) => {
              if (selectedProjectId !== project.id) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text
                strong={selectedProjectId === project.id}
                style={{ fontSize: 14 }}
              >
                {project.name}
              </Text>
              <Flex align="center" gap={8}>
                <Tag
                  color={getStatusTagColor(project.status)}
                  style={{
                    fontSize: 10,
                    padding: '0 6px',
                    margin: 0,
                  }}
                >
                  {getStatusLabel(project.status)}
                </Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {project.fileCount} ファイル
                </Text>
              </Flex>
            </Space>
          </List.Item>
        )}
        style={{ padding: '8px 0' }}
      />
    </div>
  );
};

export default ProjectFolderTree;
