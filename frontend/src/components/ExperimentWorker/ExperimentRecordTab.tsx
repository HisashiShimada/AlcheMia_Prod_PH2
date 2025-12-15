'use client';

import React from 'react';
import { Card, Space, Typography, theme } from 'antd';
import { ExperimentOutlined } from '@ant-design/icons';
import ProjectSelector from './ProjectSelector';
import MethodSelector from './MethodSelector';
import TaskSelector from './TaskSelector';
import TransitionList from './TransitionList';
import { projectsData } from '@/data/projectsData';
import { Method } from '@/types/experimentWorker';

const { Title, Text } = Typography;

/**
 * 空状態アイコンのサイズ（UIポリシー準拠）
 */
const EMPTY_ICON_SIZE = 48;

/**
 * 実験記録タブのProps
 */
interface ExperimentRecordTabProps {
  selectedProject: string;
  onProjectChange: (value: string) => void;
  selectedMethodId: string | null;
  onSelectMethod: (methodId: string) => void;
  selectedTaskId: string;
  onSelectTask: (taskId: string) => void;
  onTaskCreated: (newTaskId: string) => void;
  selectedMethod: Method | null;
}

/**
 * 実験記録タブのコンテンツ
 */
export default function ExperimentRecordTab({
  selectedProject,
  onProjectChange,
  selectedMethodId,
  onSelectMethod,
  selectedTaskId,
  onSelectTask,
  onTaskCreated,
  selectedMethod,
}: ExperimentRecordTabProps) {
  // テーマトークンを取得（UIポリシー準拠）
  const { token } = theme.useToken();

  return (
    <>
      {/* プロジェクト選択とメソッド選択 */}
      <Card style={{ marginBottom: token.marginLG }}>
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
          <Space direction="vertical" align="center" style={{ width: '100%', padding: `${token.marginXXL}px 0` }}>
            <ExperimentOutlined style={{ fontSize: EMPTY_ICON_SIZE, color: token.colorTextDisabled }} />
            <Title level={3} type="secondary">
              🧪 実験記録
            </Title>
            <Text type="secondary">
              プロジェクトを選択してください
            </Text>
          </Space>
        </Card>
      ) : (
        <Card>
          {/* トランジション表示エリア */}
          <TransitionList
            transitions={selectedMethod?.transitions || []}
            methodName={selectedMethod?.methodName}
            selectedTaskId={selectedTaskId}
            onTaskCreated={onTaskCreated}
          />
        </Card>
      )}
    </>
  );
}
