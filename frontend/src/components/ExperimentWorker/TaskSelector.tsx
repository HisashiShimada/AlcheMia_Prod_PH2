'use client';

import React from 'react';
import { Card, Space, Typography, theme } from 'antd';
import { AimOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface TaskSelectorProps {
  selectedTaskId: string | null;
  onSelectTask?: (taskId: string) => void;
  disabled?: boolean;
}

/**
 * タスク選択コンポーネント
 * カード形式で選択中のタスク情報を表示
 */
export default function TaskSelector({
  selectedTaskId,
  disabled = false,
}: TaskSelectorProps) {
  const { token } = theme.useToken();

  // TODO: 実際のタスク一覧はAPIから取得する予定
  // 現在はダミーデータで実装
  const tasks = [
    { taskId: 'new', taskName: '新規タスク', tag: '新規' },
    { taskId: 'task001', taskName: 'タスク001' },
    { taskId: 'task002', taskName: 'タスク002' },
    { taskId: 'task003', taskName: 'タスク003' },
  ];

  // 選択中のタスク情報を取得
  const selectedTask = tasks.find((t) => t.taskId === selectedTaskId);

  return (
    <Card
      size="small"
      style={{
        backgroundColor: selectedTaskId ? token.colorPrimaryBg : token.colorBgContainer,
        borderColor: selectedTaskId ? token.colorPrimary : token.colorBorder,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {/* ヘッダー */}
        <Space>
          <AimOutlined style={{ fontSize: 16, color: token.colorPrimary }} />
          <Text strong>タスク</Text>
        </Space>

        {/* 選択中の情報 */}
        {selectedTask ? (
          <Space direction="vertical" size={0} style={{ paddingLeft: 24 }}>
            <Text strong style={{ fontSize: 14 }}>
              {selectedTask.taskName}
            </Text>
            {selectedTask.tag && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {selectedTask.tag}
              </Text>
            )}
          </Space>
        ) : (
          <Text type="secondary" style={{ paddingLeft: 24, fontSize: 12 }}>
            {disabled ? 'プロジェクトを選択してください' : 'タスクが選択されていません'}
          </Text>
        )}
      </Space>
    </Card>
  );
}
