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
      width: 150,
      ellipsis: true,
      render: (text: string) => (
        <Text strong style={{ fontSize: '14px' }}>
          {text}
        </Text>
      )
    },
    {
      title: 'サンプル番号',
      dataIndex: 'sampleNumber',
      key: 'sampleNumber',
      width: 130,
      render: (text: string) => (
        <div
          style={{
            background: '#FCE4EC',
            padding: '4px 8px',
            borderRadius: '4px',
            display: 'inline-block'
          }}
        >
          <Text style={{ fontSize: '13px', color: '#212121' }}>
            {text}
          </Text>
        </div>
      )
    },
    {
      title: '備考',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (text: string) => (
        <Text style={{ fontSize: '13px', color: '#757575' }}>
          {text || '-'}
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
      title: '進捗報告',
      dataIndex: 'progressReport',
      key: 'progressReport',
      width: 120,
      render: (text: string) => (
        <Text style={{ fontSize: '13px', color: '#757575' }}>
          {text || '-'}
        </Text>
      )
    },
    {
      title: '実験記録番号',
      dataIndex: 'recordNumber',
      key: 'recordNumber',
      width: 150,
      render: (text: string) => (
        <Text style={{ fontSize: '13px', color: '#757575' }}>
          {text || '-'}
        </Text>
      )
    },
    {
      title: 'アクション',
      key: 'actions',
      width: 240,
      align: 'center',
      render: (_, record: Task) => (
        <TaskActionButtons
          task={record}
          onAction={(action) => onTaskAction(record.taskId, action)}
        />
      )
    }
  ];

  return (
    <Table
      columns={columns}
      dataSource={tasks}
      rowKey="taskId"
      pagination={false}
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
