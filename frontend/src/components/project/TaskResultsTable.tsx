'use client';

import React from 'react';
import { Table, Button, Typography, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined } from '@ant-design/icons';
import { useLanguage } from '@/contexts/LanguageContext';

const { Text } = Typography;

interface TaskResult {
  id: string;
  workId: string;
  reporterName: string;
  reportedAt: string;
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

  const columns: ColumnsType<TaskResult> = [
    {
      title: t('projectManagement.task_results.work_id'),
      dataIndex: 'workId',
      key: 'workId',
      width: '25%',
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: t('projectManagement.task_results.reporter_name'),
      dataIndex: 'reporterName',
      key: 'reporterName',
      width: '30%',
    },
    {
      title: t('projectManagement.task_results.reported_at'),
      dataIndex: 'reportedAt',
      key: 'reportedAt',
      width: '30%',
      render: (text: string) => <Text type="secondary">{text}</Text>,
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
