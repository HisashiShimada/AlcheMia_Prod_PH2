'use client';

import React from 'react';
import { Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Task, TaskStatus } from '@/types/experimentWorker';
import TaskActionButtons from './TaskActionButtons';

const { Text } = Typography;

interface TaskListTableProps {
  tasks: Task[];
  onTaskAction: (taskId: string, action: string) => void;
}

/**
 * タスク一覧テーブル
 * タスクのリストをテーブル形式で表示する
 */
export default function TaskListTable({ tasks, onTaskAction }: TaskListTableProps) {
  // ステータスバッジの色とラベルを取得
  const getStatusConfig = (status: TaskStatus) => {
    const configs = {
      not_started: { color: 'default', label: '開始前' },
      started: { color: 'blue', label: '開始' },
      in_progress: { color: 'orange', label: '作業中' },
      completed: { color: 'green', label: '完了' },
      forced_terminated: { color: 'red', label: '強制終了' },
      suspended: { color: 'default', label: '中断' }
    };
    return configs[status] || { color: 'default', label: '不明' };
  };

  // テーブルの列定義
  const columns: ColumnsType<Task> = [
    {
      title: 'タスク名',
      dataIndex: 'taskName',
      key: 'taskName',
      width: 200,
      ellipsis: true,
      render: (text: string) => (
        <Text strong style={{ fontSize: '14px' }}>
          {text}
        </Text>
      )
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (status: TaskStatus) => {
        const config = getStatusConfig(status);
        return (
          <Tag
            color={config.color}
            style={{ margin: 0 }}
            aria-label={`ステータス: ${config.label}`}
          >
            {config.label}
          </Tag>
        );
      }
    },
    {
      title: '進捗率',
      dataIndex: 'progressRate',
      key: 'progressRate',
      width: 100,
      align: 'center',
      render: (rate: number) => (
        <Text strong style={{ fontSize: '14px', color: '#0093CF' }}>
          {rate}%
        </Text>
      )
    },
    {
      title: '開始',
      key: 'start',
      width: 80,
      align: 'center',
      render: (_, record: Task) => (
        <TaskActionButtons
          task={record}
          onAction={(action) => onTaskAction(record.taskId, action)}
          buttonType="start"
        />
      )
    },
    {
      title: '結果記録',
      key: 'record',
      width: 100,
      align: 'center',
      render: (_, record: Task) => (
        <TaskActionButtons
          task={record}
          onAction={(action) => onTaskAction(record.taskId, action)}
          buttonType="record"
        />
      )
    },
    {
      title: '進捗報告',
      key: 'progress',
      width: 100,
      align: 'center',
      render: (_, record: Task) => (
        <TaskActionButtons
          task={record}
          onAction={(action) => onTaskAction(record.taskId, action)}
          buttonType="progress"
        />
      )
    },
    {
      title: '終了',
      key: 'complete',
      width: 80,
      align: 'center',
      render: (_, record: Task) => (
        <TaskActionButtons
          task={record}
          onAction={(action) => onTaskAction(record.taskId, action)}
          buttonType="complete"
        />
      )
    }
  ];

  return (
    <Table
      columns={columns}
      dataSource={tasks}
      rowKey="taskId"
      pagination={{
        pageSize: 10,
        showSizeChanger: false,
        showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}件`,
        position: ['bottomCenter']
      }}
      scroll={{ x: 1200 }}
      size="middle"
      bordered
      aria-label="タスク一覧"
      aria-describedby="task-list-description"
      style={{
        background: '#ffffff',
        borderRadius: '8px'
      }}
    />
  );
}
