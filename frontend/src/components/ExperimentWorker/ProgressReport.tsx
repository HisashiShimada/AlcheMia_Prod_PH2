'use client';

import React from 'react';
import { Card, Table, Tag, Progress, Space, Typography, Empty } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { TransitionProgress, ProgressStatus } from '@/types/experimentWorker';

const { Title, Text } = Typography;

interface ProgressReportProps {
  progressData: TransitionProgress[];
}

// ステータスの表示色を取得
const getStatusColor = (status: ProgressStatus): string => {
  switch (status) {
    case 'not_started':
      return 'default';
    case 'in_progress':
      return 'blue';
    case 'completed':
      return 'green';
    case 'on_hold':
      return 'orange';
    case 'issue':
      return 'red';
    default:
      return 'default';
  }
};

// ステータスのラベルを取得
const getStatusLabel = (status: ProgressStatus): string => {
  switch (status) {
    case 'not_started':
      return '未着手';
    case 'in_progress':
      return '進行中';
    case 'completed':
      return '完了';
    case 'on_hold':
      return '保留';
    case 'issue':
      return '課題あり';
    default:
      return '不明';
  }
};

/**
 * 進捗報告コンポーネント（簡略版）
 * トランジションの進捗状況を一覧表示
 */
export default function ProgressReport({ progressData }: ProgressReportProps) {
  if (!progressData || progressData.length === 0) {
    return (
      <Card>
        <Empty description="進捗データがありません" />
      </Card>
    );
  }

  const columns: ColumnsType<TransitionProgress> = [
    {
      title: 'トランジション名',
      dataIndex: 'transitionName',
      key: 'transitionName',
      render: (text: string, record: TransitionProgress) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            ID: {record.transitionId}
          </Text>
        </div>
      ),
    },
    {
      title: 'メソッド名',
      dataIndex: 'methodName',
      key: 'methodName',
      render: (text: string, record: TransitionProgress) => (
        <div>
          <Text>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.methodId}
          </Text>
        </div>
      ),
    },
    {
      title: '進捗率',
      dataIndex: 'progressRate',
      key: 'progressRate',
      render: (rate: number) => (
        <Space>
          <Progress
            percent={rate}
            size="small"
            style={{ width: 120 }}
            status={rate === 100 ? 'success' : rate === 0 ? 'exception' : 'active'}
          />
        </Space>
      ),
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      render: (status: ProgressStatus) => (
        <Tag color={getStatusColor(status)}>{getStatusLabel(status)}</Tag>
      ),
    },
    {
      title: '進捗報告数',
      dataIndex: 'reportCount',
      key: 'reportCount',
      align: 'center',
      render: (count: number) => (
        <Tag color={count > 0 ? 'blue' : 'default'}>{count}</Tag>
      ),
    },
    {
      title: '未解決課題数',
      dataIndex: 'issueCount',
      key: 'issueCount',
      align: 'center',
      render: (count: number) => (
        <Tag color={count > 0 ? 'red' : 'default'}>{count}</Tag>
      ),
    },
  ];

  // サマリー統計
  const totalCount = progressData.length;
  const completedCount = progressData.filter((p) => p.status === 'completed').length;
  const inProgressCount = progressData.filter((p) => p.status === 'in_progress').length;
  const notStartedCount = progressData.filter((p) => p.status === 'not_started').length;
  const issueCount = progressData.filter((p) => p.status === 'issue').length;
  const avgProgress = totalCount > 0
    ? Math.round(progressData.reduce((sum, p) => sum + p.progressRate, 0) / totalCount)
    : 0;

  return (
    <div>
      {/* サマリー情報 */}
      <Space size="large" wrap style={{ marginBottom: 24 }}>
        <Card size="small" style={{ minWidth: 150 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>合計トランジション数</Text>
          <Title level={3} style={{ margin: 0 }}>{totalCount}</Title>
        </Card>
        <Card size="small" style={{ minWidth: 120 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>完了</Text>
          <Title level={3} style={{ margin: 0, color: '#52c41a' }}>{completedCount}</Title>
        </Card>
        <Card size="small" style={{ minWidth: 120 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>進行中</Text>
          <Title level={3} style={{ margin: 0, color: '#1890ff' }}>{inProgressCount}</Title>
        </Card>
        <Card size="small" style={{ minWidth: 120 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>未着手</Text>
          <Title level={3} style={{ margin: 0, color: '#8c8c8c' }}>{notStartedCount}</Title>
        </Card>
        <Card size="small" style={{ minWidth: 120 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>課題あり</Text>
          <Title level={3} style={{ margin: 0, color: '#ff4d4f' }}>{issueCount}</Title>
        </Card>
        <Card size="small" style={{ minWidth: 140 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>平均進捗率</Text>
          <Title level={3} style={{ margin: 0 }}>{avgProgress}%</Title>
        </Card>
      </Space>

      {/* トランジション一覧 */}
      <Title level={4} style={{ marginBottom: 16 }}>
        <BarChartOutlined style={{ marginRight: 8 }} />
        トランジション一覧
      </Title>
      <Table
        columns={columns}
        dataSource={progressData}
        rowKey={(record) => `${record.transitionId}-${record.methodId}`}
        pagination={{ pageSize: 10 }}
        size="small"
      />
    </div>
  );
}
