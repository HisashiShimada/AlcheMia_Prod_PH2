'use client';

import React from 'react';
import { Card, Space, Typography } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import ProjectSelector from './ProjectSelector';
import ProgressReport from './ProgressReport';
import { projectsData } from '@/data/projectsData';

const { Title, Text } = Typography;

/**
 * 進捗報告タブのProps
 */
interface ProgressReportTabProps {
  selectedProject: string;
  onProjectChange: (value: string) => void;
}

/**
 * 進捗報告タブのコンテンツ
 */
export default function ProgressReportTab({
  selectedProject,
  onProjectChange,
}: ProgressReportTabProps) {
  return (
    <>
      {/* プロジェクト選択 */}
      <ProjectSelector
        selectedProject={selectedProject}
        onProjectChange={onProjectChange}
      />

      {!selectedProject ? (
        <Card>
          <Space direction="vertical" align="center" style={{ width: '100%', padding: '64px 0' }}>
            <BarChartOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
            <Title level={3} type="secondary">
              📊 進捗報告
            </Title>
            <Text type="secondary">
              プロジェクトを選択してください
            </Text>
          </Space>
        </Card>
      ) : (
        <Card>
          <ProgressReport
            progressData={projectsData[selectedProject]?.progressData || []}
          />
        </Card>
      )}
    </>
  );
}
