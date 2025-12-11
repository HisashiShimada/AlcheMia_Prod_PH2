'use client';

import React from 'react';
import { Card, Space, Typography } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import ProjectSelector from './ProjectSelector';
import MethodSelector from './MethodSelector';
import TaskSelector from './TaskSelector';
import ProgressReport from './ProgressReport';
import { projectsData } from '@/data/projectsData';
import { Method } from '@/types/experimentWorker';

const { Title, Text } = Typography;

/**
 * 進捗報告タブのProps
 */
interface ProgressReportTabProps {
  selectedProject: string;
  onProjectChange: (value: string) => void;
  selectedMethodId: string | null;
  onSelectMethod: (methodId: string) => void;
  selectedTaskId: string;
  onSelectTask: (taskId: string) => void;
  selectedMethod: Method | null;
}

/**
 * 進捗報告タブのコンテンツ
 */
export default function ProgressReportTab({
  selectedProject,
  onProjectChange,
  selectedMethodId,
  onSelectMethod,
  selectedTaskId,
  onSelectTask,
  selectedMethod,
}: ProgressReportTabProps) {
  return (
    <>
      {/* プロジェクト選択とメソッド選択 */}
      <Card style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* プロジェクト選択 */}
          <ProjectSelector
            selectedProject={selectedProject}
            onProjectChange={onProjectChange}
          />

          {/* メソッド選択 */}
          <MethodSelector
            methods={projectsData[selectedProject]?.methods || []}
            selectedMethodId={selectedMethodId}
            onSelectMethod={onSelectMethod}
            disabled={!selectedProject}
          />

          {/* タスク選択 */}
          <TaskSelector
            selectedTaskId={selectedTaskId}
            onSelectTask={onSelectTask}
            disabled={!selectedProject}
          />
        </Space>
      </Card>

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
