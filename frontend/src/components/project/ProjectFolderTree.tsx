'use client';

import React, { useState } from 'react';
import {
  List,
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

interface Project {
  id: string;
  name: string;
  folderName: string;
  fileCount: number;
  status: string;
  department: string;
  owner: string;
  createdAt: string;
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
  
  const getStatusChipColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    const colors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
      planning: 'default',
      pending: 'info',
      in_progress: 'primary',
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
        <Space>
          <span>プロジェクト名</span>
          {sortBy === 'name' && (sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />)}
        </Space>
      ),
      onClick: () => onSortChange('name'),
    },
    {
      key: 'status',
      label: (
        <Space>
          <span>ステータス</span>
          {sortBy === 'status' && (sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />)}
        </Space>
      ),
      onClick: () => onSortChange('status'),
    },
    {
      key: 'createdAt',
      label: (
        <Space>
          <span>作成日</span>
          {sortBy === 'createdAt' && (sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />)}
        </Space>
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
          padding: token.margin,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Text strong style={{ fontSize: token.fontSize }}>
              プロジェクト一覧
            </Text>
            <div>
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                {projects.length} プロジェクト
              </Text>
            </div>
          </div>
          <Dropdown menu={{ items: menuItems }} placement="bottomRight">
            <Button type="text" icon={<SortIcon />} size="small" />
          </Dropdown>
        </div>
      </div>

      {/* プロジェクト一覧 */}
      <List
        dataSource={projects}
        renderItem={(project) => (
          <List.Item
            key={project.id}
            onClick={() => onProjectSelect(project.id)}
            style={{
              padding: `${token.paddingSM}px ${token.margin}px`,
              cursor: 'pointer',
              backgroundColor: selectedProjectId === project.id ? token.colorPrimaryBg : 'transparent',
              borderLeft: selectedProjectId === project.id ? `3px solid ${token.colorPrimary}` : '3px solid transparent',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: token.marginXS, width: '100%' }}>
              <Text
                strong={selectedProjectId === project.id}
                style={{ fontSize: token.fontSize }}
              >
                {project.name}
              </Text>
              <Space size="small" wrap>
                <Tag
                  color={getStatusChipColor(project.status) === 'primary' ? 'cyan' : getStatusChipColor(project.status)}
                  style={{ fontSize: token.fontSizeSM, margin: 0 }}
                >
                  {getStatusLabel(project.status)}
                </Tag>
                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                  {project.fileCount} ファイル
                </Text>
              </Space>
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                所有者: {project.owner}
              </Text>
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                {project.department} | {new Date(project.createdAt).toLocaleDateString('ja-JP')}
              </Text>
            </div>
          </List.Item>
        )}
      />
    </div>
  );
};

export default ProjectFolderTree;
