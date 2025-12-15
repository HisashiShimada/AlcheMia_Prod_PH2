'use client';

import React from 'react';
import { Space, Button } from 'antd';
import { PlayCircleOutlined, FormOutlined, LineChartOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Task } from '@/types/experimentWorker';

interface TaskActionButtonsProps {
  task: Task;
  onAction: (action: string) => void;
}

/**
 * タスクアクションボタン群
 * タスクのステータスに応じて適切なボタンを表示する
 */
export default function TaskActionButtons({ task, onAction }: TaskActionButtonsProps) {
  const { status } = task;

  // 開始前: 「開始」ボタンのみ
  if (status === 'not_started') {
    return (
      <Space size="small">
        <Button
          type="primary"
          size="small"
          icon={<PlayCircleOutlined />}
          onClick={() => onAction('start')}
          aria-label="タスクを開始"
        >
          開始
        </Button>
      </Space>
    );
  }

  // 開始: 「結果入力」「進捗報告」ボタン
  if (status === 'started') {
    return (
      <Space size="small">
        <Button
          type="default"
          size="small"
          icon={<FormOutlined />}
          onClick={() => onAction('record')}
          aria-label="実験結果を入力"
        >
          結果入力
        </Button>
        <Button
          type="default"
          size="small"
          icon={<LineChartOutlined />}
          onClick={() => onAction('progress')}
          aria-label="進捗を報告"
        >
          進捗報告
        </Button>
      </Space>
    );
  }

  // 作業中: 「結果入力」「進捗報告」「終了」ボタン
  if (status === 'in_progress') {
    return (
      <Space size="small">
        <Button
          type="default"
          size="small"
          icon={<FormOutlined />}
          onClick={() => onAction('record')}
          aria-label="実験結果を入力"
        >
          結果入力
        </Button>
        <Button
          type="default"
          size="small"
          icon={<LineChartOutlined />}
          onClick={() => onAction('progress')}
          aria-label="進捗を報告"
        >
          進捗報告
        </Button>
        <Button
          type="primary"
          size="small"
          icon={<CheckCircleOutlined />}
          onClick={() => onAction('complete')}
          aria-label="タスクを完了"
        >
          終了
        </Button>
      </Space>
    );
  }

  // 完了: 「開始」ボタンのみ（再開用）
  if (status === 'completed') {
    return (
      <Space size="small">
        <Button
          type="default"
          size="small"
          icon={<PlayCircleOutlined />}
          onClick={() => onAction('start')}
          aria-label="タスクを再開"
        >
          開始
        </Button>
      </Space>
    );
  }

  // 中断: 「開始」ボタンのみ（再開用）
  if (status === 'suspended') {
    return (
      <Space size="small">
        <Button
          type="default"
          size="small"
          icon={<PlayCircleOutlined />}
          onClick={() => onAction('start')}
          aria-label="タスクを再開"
        >
          開始
        </Button>
      </Space>
    );
  }

  // 強制終了: ボタンなし
  if (status === 'forced_terminated') {
    return null;
  }

  // その他: ボタンなし
  return null;
}
