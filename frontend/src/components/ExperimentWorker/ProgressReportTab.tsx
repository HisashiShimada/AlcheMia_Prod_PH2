'use client';

import React, { useState } from 'react';
import { Card, Space, Typography, theme, Button, Select } from 'antd';
import { BarChartOutlined, CheckOutlined, AimOutlined, FileTextOutlined } from '@ant-design/icons';
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
  const tasks = (selectedProject && selectedMethodId)
    ? (projectsData[selectedProject]?.methods?.find((m) => m.methodId === selectedMethodId)?.tasks || [])
    : [];

  // Selectコンポーネント用のオプションを生成
  const taskOptions = tasks.map((task) => ({
    label: task.taskName,
    value: task.taskId,
  }));

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
      {/* 選択タスク */}
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
                placeholder="-"
                value={selectedTaskId || undefined}
                onChange={onSelectTask}
                options={[
                  { value: undefined, label: '-' },
                  ...taskOptions
                ]}
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

      {/* 報告タイプ選択 */}
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
          <ProgressReport 
            progressData={filteredProgressData}
            reportType={reportType}
            onReportTypeChange={setReportType}
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
