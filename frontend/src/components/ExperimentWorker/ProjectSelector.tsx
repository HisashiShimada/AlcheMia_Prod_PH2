'use client';

import React from 'react';
import { Card, Space, Typography, theme } from 'antd';
import { FolderOutlined } from '@ant-design/icons';
const { Text } = Typography;

interface ProjectSelectorProps {
  selectedProject: string;
  onProjectChange?: (value: string) => void;
  /** 選択中のプロジェクト名 */
  projectName?: string;
  /** 選択中のプロジェクトのファイル名 */
  fileName?: string;
  /** 選択中のプロジェクトのメソッド数 */
  methodCount?: number;
}

/**
 * プロジェクト選択コンポーネント
 * カード形式で選択中のプロジェクト情報を表示
 */
export default function ProjectSelector({
  selectedProject,
  projectName,
  fileName,
  methodCount,
}: ProjectSelectorProps) {
  const { token } = theme.useToken();

  return (
    <Card
      data-testid="project-selector"
      size="small"
      style={{
        backgroundColor: selectedProject ? token.colorPrimaryBg : token.colorBgContainer,
        borderColor: selectedProject ? token.colorPrimary : token.colorBorder,
      }}
    >
      <Space orientation="vertical" size="small" style={{ width: '100%' }}>
        {/* ヘッダー */}
        <Space>
          <FolderOutlined style={{ fontSize: 16, color: token.colorPrimary }} />
          <Text strong>プロジェクト</Text>
        </Space>

        {/* 選択中の情報 */}
        {selectedProject && projectName ? (
          <Space orientation="vertical" size={0} style={{ paddingLeft: 24 }}>
            <Text strong style={{ fontSize: 14 }}>
              {projectName}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {fileName} • {methodCount ?? 0} メソッド
            </Text>
          </Space>
        ) : (
          <Text type="secondary" style={{ paddingLeft: 24, fontSize: 12 }}>
            プロジェクトが選択されていません
          </Text>
        )}
      </Space>
    </Card>
  );
}
