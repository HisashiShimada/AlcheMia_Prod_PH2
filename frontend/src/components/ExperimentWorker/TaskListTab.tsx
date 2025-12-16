'use client';

import React, { useState, useCallback } from 'react';
import { Card, Space, Button, Typography, Divider, message } from 'antd';
import { RightOutlined, UnorderedListOutlined, FileTextOutlined } from '@ant-design/icons';
import TaskListTable from './TaskListTable';
import {
  getTasksByProjectAndMethod,
  updateTaskStatus
} from '@/data/projectsData';
import type { Task } from '@/types/experimentWorker';

const { Title } = Typography;

interface TaskListTabProps {
  selectedProject: string | null;
  onProjectChange: (projectId: string) => void;
  selectedMethodId: string | null;
  onSelectMethod: (methodId: string) => void;
  onTabChange?: (tabKey: string) => void;
}

/**
 * タスク一覧タブ - メインコンテナ
 * プロジェクト・メソッド選択、タスク一覧表示を統合
 */
export default function TaskListTab({
  selectedProject,
  onProjectChange,
  selectedMethodId,
  onSelectMethod,
  onTabChange
}: TaskListTabProps) {
  // タスク一覧の展開状態
  const [isTaskListExpanded, setIsTaskListExpanded] = useState(true);
  
  // タスクデータの取得
  const [tasks, setTasks] = useState<Task[]>(() => {
    if (selectedProject && selectedMethodId) {
      return getTasksByProjectAndMethod(selectedProject, selectedMethodId);
    }
    return [];
  });

  // タスクアクション処理
  const handleTaskAction = useCallback((taskId: string, action: string) => {
    if (!selectedProject || !selectedMethodId) {
      message.warning('プロジェクトとメソッドを選択してください');
      return;
    }

    try {
      switch (action) {
        case 'start':
          // タスクを開始
          const updatedTasksStart = updateTaskStatus(
            selectedProject,
            selectedMethodId,
            taskId,
            'started'
          );
          setTasks([...updatedTasksStart]);
          message.success('タスクを開始しました');
          break;

        case 'record':
          // 実験記録タブへ遷移
          if (onTabChange) {
            onTabChange('3'); // 実験記録タブ
            message.info('実験記録タブに移動します');
          }
          break;

        case 'progress':
          // 進捗報告タブへ遷移
          if (onTabChange) {
            onTabChange('6'); // 進捗報告タブ
            message.info('進捗報告タブに移動します');
          }
          break;

        case 'complete':
          // タスクを完了
          const updatedTasksComplete = updateTaskStatus(
            selectedProject,
            selectedMethodId,
            taskId,
            'completed'
          );
          setTasks([...updatedTasksComplete]);
          message.success('タスクを完了しました');
          break;

        default:
          message.warning('不明なアクションです');
      }
    } catch (error) {
      console.error('タスクアクション処理エラー:', error);
      message.error('タスクの更新に失敗しました');
    }
  }, [selectedProject, selectedMethodId, onTabChange]);

  // 指示確認ボタン
  const handleInstructionConfirmation = useCallback(() => {
    if (onTabChange) {
      onTabChange('2'); // 作業指示確認タブ
    }
  }, [onTabChange]);

  // 一括進捗報告ボタン
  const handleBatchProgressReport = useCallback(() => {
    message.info('一括進捗報告機能は今後実装予定です');
  }, []);

  // 承認依頼ボタン
  const handleApprovalRequest = useCallback(() => {
    message.info('承認依頼機能は今後実装予定です');
  }, []);

  return (
    <div style={{ padding: '24px' }}>
      <Card
        style={{
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
        }}
      >
        {/* 指示確認ボタン */}
        <div style={{ marginBottom: '16px', textAlign: 'right' }}>
          <Button
            type="default"
            size="middle"
            onClick={handleInstructionConfirmation}
            icon={<FileTextOutlined />}
            aria-label="作業指示を確認"
          >
            指示確認
            <RightOutlined style={{ fontSize: '12px', marginLeft: '4px' }} />
          </Button>
        </div>

        {/* タスク一覧展開ボタン */}
        <div style={{ marginBottom: '16px' }}>
          <Button
            type="text"
            size="large"
            icon={<UnorderedListOutlined />}
            onClick={() => setIsTaskListExpanded(!isTaskListExpanded)}
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#212121'
            }}
            aria-label="タスク一覧を表示/非表示"
          >
            タスク一覧
            <RightOutlined
              style={{
                fontSize: '12px',
                marginLeft: '8px',
                transform: isTaskListExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s'
              }}
            />
          </Button>
        </div>

        {/* タスク一覧テーブル */}
        {isTaskListExpanded && (
          <>
            {selectedProject && selectedMethodId && tasks.length > 0 ? (
              <TaskListTable
                tasks={tasks}
                onTaskAction={handleTaskAction}
              />
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#9e9e9e',
                  fontSize: '14px'
                }}
              >
                {!selectedProject || !selectedMethodId
                  ? 'プロジェクトとメソッドを選択してください'
                  : 'タスクが見つかりません'}
              </div>
            )}
          </>
        )}

        {/* フッターボタン */}
        {selectedProject && selectedMethodId && tasks.length > 0 && (
          <>
            <Divider style={{ margin: '16px 0' }} />
            <div
              style={{
                background: '#E8F5E9',
                padding: '16px 24px',
                borderRadius: '8px',
                textAlign: 'right'
              }}
            >
              <Space size="middle">
                <Button
                  type="default"
                  size="large"
                  onClick={handleBatchProgressReport}
                >
                  一括進捗報告
                </Button>
                <Button
                  type="primary"
                  size="large"
                  onClick={handleApprovalRequest}
                >
                  承認依頼
                </Button>
              </Space>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
