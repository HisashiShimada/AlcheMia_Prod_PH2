'use client';

import React from 'react';
import { Select, Space, Typography } from 'antd';
import { AimOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface TaskSelectorProps {
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  disabled?: boolean;
}

/**
 * タスク選択コンポーネント
 * ドロップダウンリストでタスクを選択可能にする
 * MethodSelectorと同じスタイルで横一列に表示
 */
export default function TaskSelector({
  selectedTaskId,
  onSelectTask,
  disabled = false,
}: TaskSelectorProps) {
  // TODO: 実際のタスク一覧はAPIから取得する予定
  // 現在はダミーデータで実装
  const tasks = [
    { taskId: 'new', taskName: '新規タスク' },
    { taskId: 'task001', taskName: 'タスク001' },
    { taskId: 'task002', taskName: 'タスク002' },
    { taskId: 'task003', taskName: 'タスク003' },
  ];

  return (
    <Space align="center" size="middle" style={{ width: '100%' }}>
      <AimOutlined style={{ fontSize: 16, color: '#CF0027' }} />
      <Text strong style={{ minWidth: 100 }}>
        タスク:
      </Text>
      <Select
        value={selectedTaskId || 'new'}
        onChange={onSelectTask}
        disabled={disabled}
        style={{ minWidth: 300, flex: 1, maxWidth: 600 }}
        size="large"
      >
        {tasks.map((task) => (
          <Select.Option key={task.taskId} value={task.taskId}>
            <Text strong={task.taskId === 'new'}>
              {task.taskName}
            </Text>
          </Select.Option>
        ))}
      </Select>
    </Space>
  );
}
