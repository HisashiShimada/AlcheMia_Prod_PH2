'use client';

import React, { useState } from 'react';
import { Card, Space, Typography, theme, Button, Select, Empty } from 'antd';
import { 
  ExperimentOutlined, 
  CheckOutlined, 
  AimOutlined, 
  PartitionOutlined,
  UnorderedListOutlined,
  BarChartOutlined
} from '@ant-design/icons';
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
 * 表示モード
 */
type ViewMode = 'list' | 'flow';

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
  // 表示モードの状態管理
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // 選択中のプロジェクト情報を取得
  const selectedProjectData = selectedProject ? projectsData[selectedProject] : null;

  // タスクデータ: 選択されたプロジェクトとメソッドに紐づくタスクを取得
  const tasks = selectedProject && selectedMethod
    ? selectedMethod.tasks || []
    : [];

  // Selectコンポーネント用のオプションを生成
  const taskOptions = [
    { label: '-', value: '' }, // 未選択状態を表す
    ...tasks.map((task) => ({
      label: task.taskName,
      value: task.taskId,
    })),
  ];

  // フロー図に切り替え
  const handleSwitchToFlow = () => {
    setViewMode('flow');
  };

  // 一覧表示に切り替え
  const handleSwitchToList = () => {
    setViewMode('list');
  };

  return (
    <>
      {/* 選択カード */}
      <div
        style={{ 
          marginBottom: token.marginLG,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: token.paddingLG,
          paddingRight: token.paddingLG,
          backgroundColor: token.colorBgContainer,
          border: `1px solid ${token.colorBorder}`,
          borderRadius: 0,
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
                value={selectedTaskId || ''}
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
      </div>

      {/* 表示切り替えボタン */}
      {selectedProject && selectedMethod && (
        <div style={{ marginBottom: token.margin, display: 'flex', justifyContent: 'flex-end' }}>
          <Space size="middle">
            {viewMode === 'list' ? (
              <Button
                type="default"
                icon={<PartitionOutlined />}
                onClick={handleSwitchToFlow}
                size="large"
              >
                フロー図に切り替え
              </Button>
            ) : (
              <Button
                type="default"
                icon={<UnorderedListOutlined />}
                onClick={handleSwitchToList}
                size="large"
              >
                一覧表示に切り替え
              </Button>
            )}
          </Space>
        </div>
      )}

      {/* トランジション一覧カード - タスク選択後のみ表示 */}
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
      ) : !selectedMethod ? (
        <Card>
          <Space direction="vertical" align="center" style={{ width: '100%', padding: `${token.marginXXL}px 0` }}>
            <ExperimentOutlined style={{ fontSize: EMPTY_ICON_SIZE, color: token.colorTextDisabled }} />
            <Title level={3} type="secondary">
              📋 トランジション一覧
            </Title>
            <Text type="secondary">
              メソッドを選択してください
            </Text>
          </Space>
        </Card>
      ) : !selectedTaskId ? (
        <Card>
          <Space direction="vertical" align="center" style={{ width: '100%', padding: `${token.marginXXL}px 0` }}>
            <AimOutlined style={{ fontSize: EMPTY_ICON_SIZE, color: token.colorTextDisabled }} />
            <Title level={3} type="secondary">
              📋 トランジション一覧
            </Title>
            <Text type="secondary">
              タスクを選択してください
            </Text>
          </Space>
        </Card>
      ) : (
        <Card>
          {viewMode === 'list' ? (
            /* トランジション一覧表示 - タスク選択後のみ表示 */
            <>
              <Title level={4} style={{ marginTop: 0, marginBottom: token.marginLG }}>
                <BarChartOutlined style={{ marginRight: 8 }} />
                トランジション一覧
              </Title>
              <TransitionList
                transitions={selectedMethod?.transitions || []}
                methodName={selectedMethod?.methodName}
                selectedTaskId={selectedTaskId}
                onTaskCreated={onTaskCreated}
              />
            </>
          ) : (
            /* フロー図表示（プレースホルダー） */
            <div style={{ padding: `${token.marginXXL}px 0` }}>
              <Empty
                image={<PartitionOutlined style={{ fontSize: EMPTY_ICON_SIZE, color: token.colorPrimary }} />}
                imageStyle={{ height: EMPTY_ICON_SIZE }}
                description={
                  <Space direction="vertical" align="center" size="small">
                    <Title level={4} style={{ margin: 0 }}>
                      フロー図表示
                    </Title>
                    <Text type="secondary">
                      {selectedMethod?.methodName || 'メソッド'} のワークフローをフロー図で表示します
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      （実装予定）
                    </Text>
                  </Space>
                }
              />
            </div>
          )}
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
