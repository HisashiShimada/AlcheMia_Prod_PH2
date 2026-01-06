'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Card, Space, Button, Typography, message } from 'antd';
import { RightOutlined, CheckSquareOutlined } from '@ant-design/icons';
import ProgressCheckTable from './ProgressCheckTable';
import IssueReportModal from './IssueReportModal';
import IssueManagementModal from './IssueManagementModal';
import {
  getTasksByProjectAndMethod,
  updateTaskStatus,
  projectsData
} from '@/data/projectsData';
import type { Task, Method, ProjectStatus, Issue, IssueStatus } from '@/types/experimentWorker';

const { Title } = Typography;

interface ProgressCheckTabProps {
  selectedProject: string | null;
  onProjectChange: (projectId: string) => void;
  selectedMethodId: string | null;
  onSelectMethod: (methodId: string) => void;
  onTabChange?: (tabKey: string) => void;
  onSelectTaskAndTab?: (taskId: string, tabKey: string) => void;
}

/**
 * 進捗確認タブ - メインコンテナ
 * プロジェクト選択に連動してサブタスク一覧を表示
 */
export default function ProgressCheckTab({
  selectedProject,
  onProjectChange,
  selectedMethodId,
  onSelectMethod,
  onTabChange,
  onSelectTaskAndTab
}: ProgressCheckTabProps) {
  // タスクデータの取得
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // プロジェクトの状態を取得
  const projectStatus: ProjectStatus | null = selectedProject 
    ? projectsData[selectedProject]?.status ?? null
    : null;
  
  // 問題報告モーダルの状態管理
  const [issueReportModalVisible, setIssueReportModalVisible] = useState<boolean>(false);
  const [selectedTaskForIssue, setSelectedTaskForIssue] = useState<Task | null>(null);
  
  // 問題確認モーダルの状態管理
  const [issueCheckModalVisible, setIssueCheckModalVisible] = useState<boolean>(false);
  const [selectedTaskForIssueCheck, setSelectedTaskForIssueCheck] = useState<Task | null>(null);

  // プロジェクトが選択されたらタスク一覧を更新（メソッド選択不要）
  useEffect(() => {
    if (selectedProject) {
      // プロジェクト内の全メソッドのタスクを取得
      const allTasks: Task[] = [];
      const projectData = projectsData[selectedProject];
      
      if (projectData?.methods) {
        projectData.methods.forEach((method: Method) => {
          if (method.tasks) {
            // プロジェクトIDとメソッドIDを各タスクに付与
            const tasksWithIds = method.tasks.map((task: Task) => ({
              ...task,
              projectId: selectedProject,
              methodId: method.methodId,
            }));
            allTasks.push(...tasksWithIds);
          }
        });
      }
      
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setTasks(allTasks);
      console.log(`タスク取得: プロジェクト=${selectedProject}, タスク数=${allTasks.length}`);
    } else {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setTasks([]);
    }
  }, [selectedProject]);

  // タスクアクション処理
  const handleTaskAction = useCallback((taskId: string, action: string) => {
    if (!selectedProject) {
      message.warning('プロジェクトを選択してください');
      return;
    }

    // タスクからmethodIdを取得
    const task = tasks.find(t => t.taskId === taskId);
    if (!task || !task.methodId) {
      message.error('タスク情報が見つかりません');
      return;
    }

    try {
      switch (action) {
        case 'start':
          // 開始処理（今後実装予定）
          message.info('タスク開始機能は今後実装予定です');
          break;

        case 'instruction':
          // 指示確認タブへ遷移（メソッドとタスクを選択状態にする）
          if (onSelectTaskAndTab) {
            onSelectTaskAndTab(taskId, '2'); // 指示確認タブ
            message.info('指示確認タブに移動します');
          } else {
            // フォールバック: メソッドのみ選択
            if (task.methodId && onSelectMethod) {
              onSelectMethod(task.methodId);
            }
            if (onTabChange) {
              onTabChange('2'); // 指示確認タブ
              message.info('指示確認タブに移動します');
            }
          }
          break;

        case 'record':
          // 実験記録タブへ遷移（タスクを選択状態にする）
          if (onSelectTaskAndTab) {
            onSelectTaskAndTab(taskId, '3'); // 実験記録タブ
            message.info('実験記録タブに移動します');
          } else if (onTabChange) {
            onTabChange('3'); // フォールバック
            message.info('実験記録タブに移動します');
          }
          break;

        case 'issue':
          // 問題報告モーダルを開く
          handleOpenIssueReport(task);
          break;
        
        case 'issueCheck':
          // 問題確認モーダルを開く（参照専用）
          handleOpenIssueCheck(task);
          break;

        case 'forceTerminate':
          // 強制終了（今後実装予定）
          message.info('強制終了機能は今後実装予定です');
          break;

        default:
          message.warning('不明なアクションです');
      }
    } catch (error) {
      console.error('タスクアクション処理エラー:', error);
      message.error('タスクの更新に失敗しました');
    }
  }, [selectedProject, tasks, onTabChange, onSelectTaskAndTab, onSelectMethod]);

  // 承認依頼ボタン
  const handleApprovalRequest = useCallback(() => {
    message.info('承認依頼機能は今後実装予定です');
  }, []);

  // 問題報告モーダルを開く
  const handleOpenIssueReport = useCallback((task: Task) => {
    setSelectedTaskForIssue(task);
    setIssueReportModalVisible(true);
  }, []);

  // 問題報告モーダルを閉じる
  const handleCloseIssueReport = useCallback(() => {
    setIssueReportModalVisible(false);
    setSelectedTaskForIssue(null);
  }, []);

  // コメント送信処理
  const handleCommentSubmit = useCallback((taskId: string, comment: string) => {
    console.log('コメント送信:', { taskId, comment });
    // TODO: バックエンドAPIへの送信処理を実装
    message.success('コメントを送信しました');
  }, []);

  // ステータス変更処理
  const handleStatusChange = useCallback((taskId: string, newStatus: IssueStatus) => {
    console.log('ステータス変更:', { taskId, newStatus });
    // TODO: バックエンドAPIへの送信処理を実装
    message.success(`ステータスを「${newStatus === 'unresolved' ? '未解決' : '解決済'}」に変更しました`);
  }, []);

  // 問題確認モーダルを開く（参照専用）
  const handleOpenIssueCheck = useCallback((task: Task) => {
    setSelectedTaskForIssueCheck(task);
    setIssueCheckModalVisible(true);
  }, []);

  // 問題確認モーダルを閉じる
  const handleCloseIssueCheck = useCallback(() => {
    setIssueCheckModalVisible(false);
    setSelectedTaskForIssueCheck(null);
  }, []);

  // モックの問題データ（プロジェクト全体の問題を想定）
  const mockIssues = useMemo<Issue[]>(() => {
    if (!selectedProject) return [];
    
    // TODO: 実際にはバックエンドから取得
    return [
      {
        issueId: 'issue_001',
        projectId: selectedProject,
        projectName: projectsData[selectedProject]?.projectName || '',
        taskId: tasks[0]?.taskId || '',
        taskName: tasks[0]?.taskName || '',
        transitionId: 'trans_001',
        transitionName: 'サンプル調製',
        targetType: 'task',
        title: '材料が不足しています',
        content: '実験に必要な試薬Aが不足しており、実験を進められません。',
        status: 'unresolved',
        reportedBy: {
          userId: 'user_001',
          userName: '実験作業者A'
        },
        reportedAt: new Date().toISOString(),
        comments: [
          {
            commentId: 'comment_001',
            issueId: 'issue_001',
            content: '試薬を追加発注しました。明日到着予定です。',
            createdBy: {
              userId: 'user_002',
              userName: '実験管理者B'
            },
            createdAt: new Date(Date.now() - 3600000).toISOString()
          }
        ]
      }
    ];
  }, [selectedProject, tasks]);

  return (
    <div style={{ padding: 0 }}>
      <Card
        style={{
          borderRadius: 0,
          boxShadow: 'none',
          border: 'none'
        }}
      >
        {/* サブタスク一覧タイトルとアクションボタン */}
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px'
          }}
        >
          {/* サブタスク一覧タイトル */}
          <Typography.Title
            level={5}
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 600,
              color: '#212121'
            }}
          >
            <CheckSquareOutlined style={{ marginRight: 8 }} />
            タスク一覧
          </Typography.Title>

          {/* 承認依頼ボタン */}
          <Button
            type="default"
            size="middle"
            onClick={handleApprovalRequest}
            aria-label="承認依頼"
          >
            承認依頼
          </Button>
        </div>

        {/* サブタスク一覧テーブル */}
        {selectedProject && tasks.length > 0 ? (
          <ProgressCheckTable
            tasks={tasks}
            projectStatus={projectStatus}
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
            {!selectedProject
              ? 'プロジェクトを選択してください'
              : 'タスクが見つかりません'}
          </div>
        )}

      </Card>

      {/* 問題報告モーダル */}
      <IssueReportModal
        visible={issueReportModalVisible}
        task={selectedTaskForIssue}
        initialStatus="unresolved"
        onClose={handleCloseIssueReport}
        onCommentSubmit={handleCommentSubmit}
        onStatusChange={handleStatusChange}
      />

      {/* 問題確認モーダル（参照専用） */}
      {selectedTaskForIssueCheck && (
        <IssueManagementModal
          visible={issueCheckModalVisible}
          transitionId={selectedTaskForIssueCheck.taskId}
          transitionName={selectedTaskForIssueCheck.taskName}
          issues={mockIssues}
          onClose={handleCloseIssueCheck}
          viewMode={true}
          filterTaskId={selectedTaskForIssueCheck.taskId}
        />
      )}
    </div>
  );
}
