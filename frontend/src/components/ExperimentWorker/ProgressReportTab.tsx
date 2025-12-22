'use client';

import React, { useState } from 'react';
import { Card, Space, Typography, theme, Button, Select } from 'antd';
import { BarChartOutlined, CheckOutlined, CheckSquareOutlined, FileTextOutlined } from '@ant-design/icons';
import ProgressReport from './ProgressReport';
import TaskSelectionDialog from './TaskSelectionDialog';
import { projectsData } from '@/data/projectsData';
import { Method } from '@/types/experimentWorker';

const { Title, Text } = Typography;

// 報告タイプの定義
type ReportType = 'progress' | 'issue' | 'milestone';

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
  const [reportType, setReportType] = useState<ReportType>('progress');

  // タスクデータを選択されたプロジェクトとメソッドから取得
  const tasks = selectedProject && selectedMethod
    ? selectedMethod.tasks || []
    : [];

  // Selectコンポーネント用のオプションを生成
  const taskOptions = tasks.map((task) => ({
    label: task.taskName,
    value: task.taskId,
  }));

  // 選択したプロジェクトとメソッドとタスクに基づいてprogressDataを取得
  // タスク未選択: 選択プロジェクトと選択メソッドに紐づくすべてのトランジションを表示
  // タスク選択時: 選択プロジェクトと選択メソッドと選択タスクに紐づくすべてのトランジションを表示
  const getProgressDataForMethod = () => {
    if (!selectedProject || !selectedMethodId) {
      return [];
    }

    const allProgressData = projectsData[selectedProject]?.progressData || [];

    // メソッドでフィルタリング
    let filteredData = allProgressData.filter(
      (progress) => progress.methodId === selectedMethodId
    );

    // タスクが選択されている場合は、さらにタスクでフィルタリング
    if (selectedTaskId) {
      filteredData = filteredData.filter(
        (progress) => progress.taskName === tasks.find(t => t.taskId === selectedTaskId)?.taskName
      );
    }

    return filteredData;
  };

  const filteredProgressData = getProgressDataForMethod();

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* 報告タイプ選択 */}
      <div 
        style={{ 
          height: 56,
          marginBottom: 0,
          borderRadius: 0,
          backgroundColor: token.colorBgContainer,
          borderColor: token.colorBorder,
          borderWidth: 1,
          borderStyle: 'solid',
          display: 'flex',
          alignItems: 'center',
          padding: `0 ${token.padding}px`,
          flexShrink: 0,
        }}
      >
        <Space size="middle" style={{ width: '100%' }}>
          <FileTextOutlined style={{ fontSize: 16, color: token.colorInfo }} />
          <Text strong style={{ minWidth: 80 }}>報告タイプ:</Text>
          <Select
            style={{ flex: 1, minWidth: 200 }}
            value={reportType}
            onChange={(value: ReportType) => setReportType(value)}
            options={[
              { label: '進捗更新', value: 'progress' },
              { label: '問題報告', value: 'issue' },
              { label: 'マイルストーン到達', value: 'milestone' },
            ]}
            size="large"
          />
        </Space>
      </div>

      {/* 選択タスク */}
      <div 
        style={{ 
          height: 56,
          marginBottom: token.marginLG,
          borderRadius: 0,
          backgroundColor: token.colorBgContainer,
          borderColor: token.colorBorder,
          borderWidth: 1,
          borderStyle: 'solid',
          display: 'flex',
          alignItems: 'center',
          padding: `0 ${token.padding}px`,
          flexShrink: 0,
        }}
      >
        <div style={{ width: '100%' }}>
          {/* タスク選択（コンボボックス） + 選択ボタン */}
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: token.margin }}>
            <Space size="middle" style={{ flex: 1 }}>
              <CheckSquareOutlined style={{ fontSize: 16, color: token.colorPrimary }} />
              <Text strong style={{ minWidth: 80 }}>タスク:</Text>
              <Select
                style={{ flex: 1, minWidth: 200 }}
                placeholder="-"
                value={selectedTaskId || ''}
                onChange={(value) => onSelectTask(value || '')}
                options={[
                  { value: '', label: '-' },
                  ...taskOptions
                ]}
                disabled={!selectedMethod}
                size="large"
                allowClear
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

      {/* コンテンツエリア（残りの高さを占有） */}
      <div style={{ 
        flex: 1, 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {!selectedProject ? (
          <Card style={{ height: '100%', overflow: 'auto' }}>
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
          <Card style={{ height: '100%', overflow: 'auto' }}>
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
          <Card style={{ 
            height: '100%', 
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <ProgressReport 
                progressData={filteredProgressData}
                reportType={reportType}
                onReportTypeChange={setReportType}
              />
            </div>
          </Card>
        )}
      </div>

      {/* タスク選択ダイアログ */}
      <TaskSelectionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        selectedProject={selectedProject}
        selectedMethodId={selectedMethodId}
        selectedTaskId={selectedTaskId}
        onSelectTask={onSelectTask}
      />
    </div>
  );
}
