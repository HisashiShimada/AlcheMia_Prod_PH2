'use client';

import React, { useState } from 'react';
import { Card, Space, Typography, theme, Button, Select } from 'antd';
import { ExperimentOutlined, CheckOutlined, AimOutlined } from '@ant-design/icons';
import TransitionList from './TransitionList';
import TaskSelectionDialog from './TaskSelectionDialog';
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
  // 選択されたメソッドに基づいてタスク一覧を生成
  const tasks = selectedMethod
    ? [
        { taskId: 'new', taskName: '新規タスク' },
        { taskId: 'task001', taskName: 'タスク001' },
        { taskId: 'task002', taskName: 'タスク002' },
        { taskId: 'task003', taskName: 'タスク003' },
      ]
    : [];

  // Selectコンポーネント用のオプションを生成
  const taskOptions = tasks.map((task) => ({
    label: task.taskName,
    value: task.taskId,
  }));

  return (
    <>
      {/* 選択カード */}
      <Card 
        style={{ 
          marginBottom: token.marginLG,
          backgroundColor: selectedMethod ? token.colorPrimaryBg : token.colorBgContainer,
          borderColor: selectedMethod ? token.colorPrimary : token.colorBorder,
        }}
      >
        <div style={{ width: '100%' }}>
          {/* タスク選択（コンボボックス） + 選択ボタン */}
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: token.margin }}>
            <Space size="middle" style={{ flex: 1 }}>
              <AimOutlined style={{ fontSize: 16, color: token.colorPrimary }} />
              <Text strong style={{ minWidth: 80 }}>タスク:</Text>
              <Select
                style={{ flex: 1, minWidth: 200 }}
                placeholder="タスクを選択してください"
                value={selectedTaskId || undefined}
                onChange={onSelectTask}
                options={taskOptions}
                disabled={!selectedMethod}
                size="large"
              />
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

      {/* タスク選択ダイアログ */}
      <TaskSelectionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        selectedProject={selectedProject}
        selectedMethodId={selectedMethodId}
        selectedTaskId={selectedTaskId}
        onSelectTask={onSelectTask}
      />
    </>
  );
}
