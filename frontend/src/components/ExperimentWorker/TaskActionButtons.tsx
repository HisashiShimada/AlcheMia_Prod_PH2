'use client';

import React from 'react';
import { Button } from 'antd';
import { PlayCircleOutlined, FormOutlined, LineChartOutlined, CheckCircleOutlined, AlertOutlined } from '@ant-design/icons';
import { Task } from '@/types/experimentWorker';

interface TaskActionButtonsProps {
  task: Task;
  onAction: (action: string) => void;
  buttonType: 'start' | 'record' | 'progress' | 'complete' | 'issue';
}

/**
 * タスクアクションボタン（個別ボタン）
 * 各カラムに表示する個別のボタンを返す
 * ステータスに応じて活性/非活性を制御する
 */
export default function TaskActionButtons({ task, onAction, buttonType }: TaskActionButtonsProps) {
  const { status } = task;

  // 開始ボタン
  if (buttonType === 'start') {
    // 開始前、完了、中断の場合のみ活性
    const isDisabled = !(status === 'not_started' || status === 'completed' || status === 'suspended');
    const label = status === 'not_started' ? 'タスクを開始' : 'タスクを再開';
    
    return (
      <Button
        data-testid={`task-action-btn-start-${task.taskId}`}
        type="default"
        size="small"
        icon={<PlayCircleOutlined />}
        onClick={() => onAction('start')}
        disabled={isDisabled}
        aria-label={label}
        style={{
          borderColor: isDisabled ? undefined : '#0093CF',
          color: isDisabled ? undefined : '#0093CF'
        }}
      >
        開始
      </Button>
    );
  }

  // 結果記録ボタン
  if (buttonType === 'record') {
    // 開始、作業中の場合のみ活性
    const isDisabled = !(status === 'started' || status === 'in_progress');
    
    return (
      <Button
        data-testid={`task-action-btn-record-${task.taskId}`}
        type="default"
        size="small"
        icon={<FormOutlined />}
        onClick={() => onAction('record')}
        disabled={isDisabled}
        aria-label="実験結果を記録"
      >
        記録
      </Button>
    );
  }

  // 進捗報告ボタン
  if (buttonType === 'progress') {
    // 開始、作業中の場合のみ活性
    const isDisabled = !(status === 'started' || status === 'in_progress');
    
    return (
      <Button
        data-testid={`task-action-btn-progress-${task.taskId}`}
        type="default"
        size="small"
        icon={<LineChartOutlined />}
        onClick={() => onAction('progress')}
        disabled={isDisabled}
        aria-label="進捗を報告"
      >
        報告
      </Button>
    );
  }

  // 問題報告ボタン（Phase 2追加）
  if (buttonType === 'issue') {
    // 開始、作業中の場合のみ活性
    const isDisabled = !(status === 'started' || status === 'in_progress');
    
    return (
      <Button
        data-testid={`task-action-btn-issue-${task.taskId}`}
        type="default"
        size="small"
        icon={<AlertOutlined />}
        onClick={() => onAction('issue')}
        disabled={isDisabled}
        aria-label="問題を報告"
        style={{
          borderColor: isDisabled ? undefined : '#FF6B6B',
          color: isDisabled ? undefined : '#FF6B6B'
        }}
      >
        報告
      </Button>
    );
  }

  // 終了ボタン
  if (buttonType === 'complete') {
    // 作業中の場合のみ活性
    const isDisabled = status !== 'in_progress';
    
    return (
      <Button
        data-testid={`task-action-btn-complete-${task.taskId}`}
        type="default"
        size="small"
        icon={<CheckCircleOutlined />}
        onClick={() => onAction('complete')}
        disabled={isDisabled}
        aria-label="タスクを完了"
        style={{
          borderColor: isDisabled ? undefined : '#0093CF',
          color: isDisabled ? undefined : '#0093CF'
        }}
      >
        終了
      </Button>
    );
  }

  return null;
}
