'use client';

import React from 'react';
import { Card, Space, Typography, theme } from 'antd';
import { FolderOutlined } from '@ant-design/icons';
import { projectsData } from '@/data/projectsData';

const { Text } = Typography;

interface ProjectSelectorProps {
  selectedProject: string;
  onProjectChange?: (value: string) => void;
}

/**
 * プロジェクト選択コンポーネント
 * カード形式で選択中のプロジェクト情報を表示
 */
export default function ProjectSelector({
  selectedProject,
}: ProjectSelectorProps) {
  const { token } = theme.useToken();

  // 選択中のプロジェクト情報を取得
  const selectedProjectData = selectedProject ? projectsData[selectedProject] : null;

  return (
    <Card
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
        {selectedProjectData ? (
          <Space orientation="vertical" size={0} style={{ paddingLeft: 24 }}>
            <Text strong style={{ fontSize: 14 }}>
              {selectedProjectData.projectName}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {selectedProjectData.fileName} • {selectedProjectData.methods?.length || 0} メソッド
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
