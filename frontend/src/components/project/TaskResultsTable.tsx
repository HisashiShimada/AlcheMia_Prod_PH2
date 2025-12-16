'use client';

import React from 'react';
import { Table, Button, Tag, Typography, Empty, theme } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined } from '@ant-design/icons';
import { useLanguage } from '@/contexts/LanguageContext';

const { Text } = Typography;

interface TaskResult {
  id: string;
  workId: string;
  reporterName: string;
  reportedAt: string;
  status: string;
}

interface TaskResultsTableProps {
  results: TaskResult[];
  onViewResult: (result: TaskResult) => void;
}

/**
 * タスク結果一覧テーブル
 */
const TaskResultsTable: React.FC<TaskResultsTableProps> = ({
  results,
  onViewResult,
}) => {
  const { t } = useLanguage();
  const { token } = theme.useToken();

  // ステータスラベルを取得
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return t('projectManagement.task_results.status_pending');
      case 'in_progress':
        return t('projectManagement.task_results.status_in_progress');
      case 'review_waiting':
        return t('projectManagement.task_results.status_review_waiting');
      case 'reviewed':
        return t('projectManagement.task_results.status_reviewed');
      default:
        return status;
    }
  };

  const columns: ColumnsType<TaskResult> = [
    {
      title: t('projectManagement.task_results.work_id'),
      dataIndex: 'workId',
      key: 'workId',
      width: '20%',
      sorter: (a, b) => a.workId.localeCompare(b.workId),
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: t('projectManagement.task_results.reporter_name'),
      dataIndex: 'reporterName',
      key: 'reporterName',
      width: '20%',
      sorter: (a, b) => a.reporterName.localeCompare(b.reporterName, 'ja'),
    },
    {
      title: t('projectManagement.task_results.reported_at'),
      dataIndex: 'reportedAt',
      key: 'reportedAt',
      width: '20%',
      sorter: (a, b) => new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime(),
      render: (text: string) => <Text type="secondary">{text}</Text>,
    },
    {
      title: t('projectManagement.task_results.status'),
      dataIndex: 'status',
      key: 'status',
      width: '25%',
      align: 'center',
      sorter: (a, b) => {
        const statusOrder = { pending: 0, in_progress: 1, review_waiting: 2, reviewed: 3 };
        return (statusOrder[a.status as keyof typeof statusOrder] || 0) - (statusOrder[b.status as keyof typeof statusOrder] || 0);
      },
      render: (status: string) => {
        const getStatusColor = (status: string) => {
          switch (status) {
            case 'pending':
              return 'blue';
            case 'in_progress':
              return 'cyan';
            case 'review_waiting':
              return 'purple';
            case 'reviewed':
              return 'success';
            default:
              return 'default';
          }
        };
        return <Tag color={getStatusColor(status)}>{getStatusLabel(status)}</Tag>;
      },
    },
    {
      title: t('projectManagement.task_results.actions'),
      key: 'actions',
      width: '15%',
      align: 'center',
      render: (_text: string, record: TaskResult) => (
        <Button
          type="default"
          size="small"
          icon={<EyeOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onViewResult(record);
          }}
        >
          {t('projectManagement.task_results.view_result')}
        </Button>
      ),
    },
  ];

  return (
    <Table
      dataSource={results}
      columns={columns}
      rowKey="id"
      size="small"
      pagination={false}
      locale={{
        emptyText: (
          <Empty
            description={t('projectManagement.task_results.no_tasks')}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ),
      }}
    />
  );
};

export default TaskResultsTable;
