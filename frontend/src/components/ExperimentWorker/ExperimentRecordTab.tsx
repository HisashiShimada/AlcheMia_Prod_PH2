'use client';

import React, { useState } from 'react';
import { Card, Space, Typography, theme, Button } from 'antd';
import { ExperimentOutlined, CheckOutlined, FolderOutlined, ToolOutlined, AimOutlined } from '@ant-design/icons';
import TransitionList from './TransitionList';
import UnifiedSelectionDialog from './UnifiedSelectionDialog';
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
  const [dialogOpen, setDialogOpen] = useState(false);

  // 選択中のプロジェクト情報を取得
  const selectedProjectData = selectedProject ? projectsData[selectedProject] : null;

  // タスクデータ（TODO: 実際のデータはAPIから取得）
  const tasks = [
    { taskId: 'new', taskName: '新規タスク' },
    { taskId: 'task001', taskName: 'タスク001' },
    { taskId: 'task002', taskName: 'タスク002' },
    { taskId: 'task003', taskName: 'タスク003' },
  ];
  const selectedTask = tasks.find((t) => t.taskId === selectedTaskId);

  return (
    <>
      {/* 選択カード */}
      <Card 
        style={{ 
          marginBottom: token.marginLG,
          backgroundColor: selectedProject ? token.colorPrimaryBg : token.colorBgContainer,
          borderColor: selectedProject ? token.colorPrimary : token.colorBorder,
        }}
      >
        <div style={{ width: '100%' }}>
          {/* プロジェクト */}
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: token.margin }}>
            <Space size="middle" style={{ flex: 1 }}>
              <FolderOutlined style={{ fontSize: 16, color: token.colorPrimary }} />
              <Text strong style={{ minWidth: 80 }}>プロジェクト:</Text>
              <Text>
                {selectedProjectData ? selectedProjectData.projectName : '未選択'}
              </Text>
            </Space>
          </div>

          {/* メソッド */}
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: token.margin }}>
            <Space size="middle" style={{ flex: 1 }}>
              <ToolOutlined style={{ fontSize: 16, color: token.colorPrimary }} />
              <Text strong style={{ minWidth: 80 }}>メソッド:</Text>
              <Text>
                {selectedMethod ? selectedMethod.methodName : '未選択'}
              </Text>
            </Space>
          </div>

          {/* タスク + 選択ボタン */}
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
            <Space size="middle" style={{ flex: 1 }}>
              <AimOutlined style={{ fontSize: 16, color: token.colorPrimary }} />
              <Text strong style={{ minWidth: 80 }}>タスク:</Text>
              <Text>
                {selectedTask ? selectedTask.taskName : '未選択'}
              </Text>
            </Space>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => setDialogOpen(true)}
              size="large"
            >
              選択
            </Button>
          </div>
        </div>
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

      {/* 統合選択ダイアログ */}
      <UnifiedSelectionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        selectedProject={selectedProject}
        selectedMethodId={selectedMethodId}
        selectedTaskId={selectedTaskId}
        onProjectChange={onProjectChange}
        onSelectMethod={onSelectMethod}
        onSelectTask={onSelectTask}
      />
    </>
  );
}
