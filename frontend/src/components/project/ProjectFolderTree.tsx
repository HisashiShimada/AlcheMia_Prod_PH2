'use client';

import React, { useState } from 'react';
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
import type { Project } from '@/types/project';

const { Text } = Typography;

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
  const { t } = useLanguage();
  const { token } = theme.useToken();
  
  const getStatusChipColor = (status: number): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    // status: 0=計画中, 1=タスク実行待ち, 2=タスク実行中, 3=承認待ち, 4=完了, 5=異常終了
    switch (status) {
      case 0: return 'default';  // プロジェクト計画中
      case 1: return 'info';     // タスク実行待ち
      case 2: return 'primary';  // タスク実行中
      case 3: return 'warning';  // 承認待ち
      case 4: return 'success';  // プロジェクト完了
      case 5: return 'error';    // タスク異常終了
      default: return 'default';
    }
  };

  const getSortLabel = (sort: 'name' | 'status' | 'createdAt'): string => {
    switch (sort) {
      case 'name':
        return t('projectManagement.folder_tree.sort.name');
      case 'status':
        return t('projectManagement.folder_tree.sort.status');
      case 'createdAt':
        return t('projectManagement.folder_tree.sort.created_at');
      default:
        return sort;
    }
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'name',
      label: (
        <Space>
          <span>{t('projectManagement.folder_tree.sort.name')}</span>
          {sortBy === 'name' && (sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />)}
        </Space>
      ),
      onClick: () => onSortChange('name'),
    },
    {
      key: 'status',
      label: (
        <Space>
          <span>{t('projectManagement.folder_tree.sort.status')}</span>
          {sortBy === 'status' && (sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />)}
        </Space>
      ),
      onClick: () => onSortChange('status'),
    },
    {
      key: 'createdAt',
      label: (
        <Space>
          <span>{t('projectManagement.folder_tree.sort.created_at')}</span>
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
              {t('projectManagement.folder_tree.title')}
            </Text>
            <div>
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                {projects.length} {t('projectManagement.folder_tree.projects')}
              </Text>
            </div>
          </div>
          <Dropdown menu={{ items: menuItems }} placement="bottomRight">
            <Button type="text" icon={<SortIcon />} size="small" />
          </Dropdown>
        </div>
      </div>

      {/* プロジェクト一覧 */}
      <Space orientation="vertical" size={0} style={{ width: '100%' }}>
        {projects.map((project) => (
          <div
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
                {project.statusName && (
                  <Tag
                    color={getStatusChipColor(project.status) === 'primary' ? 'cyan' : getStatusChipColor(project.status)}
                    style={{ fontSize: token.fontSizeSM, margin: 0 }}
                  >
                    {project.statusName}
                  </Tag>
                )}
                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                  {project.fileCount} {t('projectManagement.folder_tree.files')}
                </Text>
              </Space>
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                {t('projectManagement.folder_tree.owner')}: {project.ownerName || project.owner}
              </Text>
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                {project.departmentName || project.department} | {new Date(project.createdAt).toLocaleDateString('ja-JP')}
              </Text>
            </div>
          </div>
        ))}
      </Space>
    </div>
  );
};

export default ProjectFolderTree;
