'use client';

import React from 'react';
import { Card, Space, Typography, theme } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import ProgressReport from './ProgressReport';
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

    </>
  );
}
