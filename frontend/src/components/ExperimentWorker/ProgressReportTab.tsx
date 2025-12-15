'use client';

import React, { useState } from 'react';
import { Card, Space, Typography, theme, Button } from 'antd';
import { BarChartOutlined, CheckOutlined, FolderOutlined, ToolOutlined, AimOutlined } from '@ant-design/icons';
import ProgressReport from './ProgressReport';
import UnifiedSelectionDialog from './UnifiedSelectionDialog';
import { projectsData } from '@/data/projectsData';
import { Method } from '@/types/experimentWorker';

const { Title, Text } = Typography;

/**
 * 空状態アイコンのサイズ（UIポリシー準拠）
 */
const EMPTY_ICON_SIZE = 48;

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

  // 選択したプロジェクトとメソッドに基づいてトランジションをフィルタリング
  const getFilteredProgressData = () => {
    if (!selectedProject) {
      return [];
    }

    const allProgressData = projectsData[selectedProject]?.progressData || [];

    // メソッドが選択されている場合はフィルタリング
    if (selectedMethodId) {
      return allProgressData.filter(
        (progress) => progress.methodId === selectedMethodId
      );
    }

    // メソッドが選択されていない場合は空配列を返す
    return [];
  };

  const filteredProgressData = getFilteredProgressData();

  return (
    <>
      {/* 選択プロジェクト・メソッド・タスク */}
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
            <BarChartOutlined style={{ fontSize: EMPTY_ICON_SIZE, color: token.colorTextDisabled }} />
            <Title level={3} type="secondary">
              📊 進捗報告
            </Title>
            <Text type="secondary">
              プロジェクトを選択してください
            </Text>
          </Space>
        </Card>
      ) : !selectedMethodId ? (
        <Card>
          <Space direction="vertical" align="center" style={{ width: '100%', padding: `${token.marginXXL}px 0` }}>
            <BarChartOutlined style={{ fontSize: EMPTY_ICON_SIZE, color: token.colorTextDisabled }} />
            <Title level={3} type="secondary">
              📊 進捗報告
            </Title>
            <Text type="secondary">
              メソッドを選択してください
            </Text>
          </Space>
        </Card>
      ) : (
        <Card>
          <ProgressReport progressData={filteredProgressData} />
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
