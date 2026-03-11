'use client';

import React from 'react';
import { Table, Tag, Typography, Empty, theme, Button } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Task } from '@/types/project';

const { Text } = Typography;

interface TaskResultsTableProps {
  results: Task[];
  onViewResult: (result: Task) => void;
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
        return t('projectManagement.task_results.status_pending') || '実行待ち';
      case 'in_progress':
        return t('projectManagement.task_results.status_in_progress') || '実行中';
      case 'error':
        return t('projectManagement.task_results.status_error') || '異常終了';
      case 'review_waiting':
        return t('projectManagement.task_results.status_review_waiting') || 'レビュー待ち';
      case 'completed':
        return t('projectManagement.task_results.status_completed') || '完了';
      default:
        return status;
    }
  };

  const columns: ColumnsType<Task> = [
    {
      title: t('projectManagement.task_results.task_name') || 'タスク名',
      dataIndex: 'taskName',
      key: 'taskName',
      width: '28%',
      sorter: (a, b) => (a.taskName || a.transitionName).localeCompare(b.taskName || b.transitionName),
      render: (_text: string, record: Task) => <Text strong>{record.taskName || record.transitionName}</Text>,
    },
    {
      title: t('projectManagement.task_results.method_name') || 'メソッド',
      dataIndex: 'methodName',
      key: 'methodName',
      width: '18%',
      sorter: (a, b) => (a.methodName || '').localeCompare(b.methodName || ''),
      render: (text: string | undefined) => text || '-',
    },
    {
      title: t('projectManagement.task_results.status') || 'ステータス',
      dataIndex: 'workStatus',
      key: 'workStatus',
      width: '14%',
      align: 'center',
      sorter: (a, b) => {
        const statusOrder = { pending: 0, in_progress: 1, error: 2, review_waiting: 3, completed: 4 };
        return (statusOrder[a.workStatus as keyof typeof statusOrder] || 0) - (statusOrder[b.workStatus as keyof typeof statusOrder] || 0);
      },
      render: (status: string) => {
        const getStatusColor = (status: string) => {
          switch (status) {
            case 'pending':
              return 'default';
            case 'in_progress':
              return 'processing';
            case 'error':
              return 'error';
            case 'review_waiting':
              return 'warning';
            case 'completed':
              return 'success';
            default:
              return 'default';
          }
        };
        return <Tag color={getStatusColor(status)}>{getStatusLabel(status)}</Tag>;
      },
    },
    {
      title: t('projectManagement.task_results.work_completed_at') || '作業終了日',
      dataIndex: 'workCompletedAt',
      key: 'workCompletedAt',
      width: '18%',
      align: 'right',
      sorter: (a, b) => {
        if (!a.workCompletedAt && !b.workCompletedAt) return 0;
        if (!a.workCompletedAt) return 1;
        if (!b.workCompletedAt) return -1;
        return new Date(a.workCompletedAt).getTime() - new Date(b.workCompletedAt).getTime();
      },
      render: (date: string | null) => (
        <Text style={{ fontSize: token.fontSizeSM }}>
          {date ? new Date(date).toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }) : '-'}
        </Text>
      ),
    },
    {
      title: t('projectManagement.task_results.review_completed_at') || 'レビュー完了日',
      dataIndex: 'reviewCompletedAt',
      key: 'reviewCompletedAt',
      width: '12%',
      align: 'right',
      sorter: (a, b) => {
        if (!a.reviewCompletedAt && !b.reviewCompletedAt) return 0;
        if (!a.reviewCompletedAt) return 1;
        if (!b.reviewCompletedAt) return -1;
        return new Date(a.reviewCompletedAt).getTime() - new Date(b.reviewCompletedAt).getTime();
      },
      render: (date: string | null) => (
        <Text style={{ fontSize: token.fontSizeSM }}>
          {date ? new Date(date).toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }) : '-'}
        </Text>
      ),
    },
    {
      title: t('projectManagement.task_results.actions') || '操作',
      key: 'actions',
      width: '10%',
      align: 'center',
      render: (_: unknown, record: Task) => (
        <Button
          type="default"
          size="small"
          icon={<EyeOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onViewResult(record);
          }}
        >
          {t('projectManagement.task_results.view_result') || '結果確認'}
        </Button>
      ),
    },
  ];

  return (
    <Table
      dataSource={results}
      columns={columns}
      rowKey={(record) => record.workId || record.taskId}
      size="small"
      pagination={false}
      locale={{
        emptyText: (
          <Empty
            description={t('projectManagement.task_results.no_tasks') || 'タスクがありません'}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ),
      }}
    />
  );
};

export default TaskResultsTable;
