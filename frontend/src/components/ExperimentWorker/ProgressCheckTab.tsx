'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Card, Space, Button, Typography, message, Tabs, theme, Badge } from 'antd';
import { RightOutlined, CheckSquareOutlined } from '@ant-design/icons';
import type { BadgeProps } from 'antd';
import ProgressCheckTable from './ProgressCheckTable';
import IssueReportModal from './IssueReportModal';
import IssueManagementModal from './IssueManagementModal';
import { getWorkerTasks } from '@/services/projectApiService';
import type { WorkerTasksResponse, WorkerMethod, WorkerTask } from '@/services/projectApiService';
import type { Task, Method, ProjectStatus, Issue, IssueStatus } from '@/types/experimentWorker';

const { Title, Text } = Typography;

/**
 * 空状態アイコンのサイズ（UIポリシー準拠）
 */
const EMPTY_ICON_SIZE = 48;

interface ProgressCheckTabProps {
  selectedProject: string | null;
  selectedProjectName: string;
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
  selectedProjectName,
  onProjectChange,
  selectedMethodId,
  onSelectMethod,
  onTabChange,
  onSelectTaskAndTab
}: ProgressCheckTabProps) {
  // テーマトークンを取得（UIポリシー準拠）
  const { token } = theme.useToken();
  
  // API連携の状態管理
  const [loading, setLoading] = useState<boolean>(false);
  const [methods, setMethods] = useState<Method[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  
  // プロジェクトの状態を取得（暫定: APIから取得できるまでnull）
  const projectStatus: ProjectStatus | null = null;
  
  // プロジェクト選択時にAPI呼び出し
  useEffect(() => {
    const fetchWorkerTasks = async () => {
      if (!selectedProject || !selectedProjectName) {
        setMethods([]);
        setTasks([]);
        setProjectId(null);
        return;
      }

      setLoading(true);
      try {
        console.log('[DEBUG] ProgressCheckTab - Fetching worker tasks', { selectedProject, selectedProjectName });
        
        const result = await getWorkerTasks(selectedProjectName);
        
        if (result.success && result.data) {
          const apiData = result.data;
          
          console.log('[DEBUG] ProgressCheckTab - API response', {
            project_id: apiData.project_id,
            methodCount: apiData.methods.length
          });
          
          // プロジェクトIDを保存
          setProjectId(apiData.project_id);
          
          // メソッド一覧を変換（UI用の型に必須プロパティを補完）
          const methodsData: Method[] = apiData.methods.map((method: WorkerMethod) => ({
            methodId: method.method_id,
            methodName: method.method_name,
            experimentOrder: method.experiment_order,
            description: '', // APIには存在しないためデフォルト値
            category: 'experiment', // APIには存在しないためデフォルト値
            transitions: [], // APIには存在しないためデフォルト値
          }));
          
          // 全タスクを変換（UI用の型に必須プロパティを補完）
          const allTasks: Task[] = apiData.methods.flatMap((method: WorkerMethod) =>
            method.tasks.map((task: WorkerTask) => ({
              taskId: `${apiData.project_id}-${method.method_id}-${task.task_no}`,
              taskNo: task.task_no,
              taskName: task.task_no.toString(), // task_name = task_no
              methodId: method.method_id,
              methodName: method.method_name, // メソッド名を追加
              status: task.status as Task['status'],
              assignedUserId: task.experiment_user_id,
              assignedUserName: task.experiment_user_name,
              createdAt: task.created_at,
              updatedAt: task.updated_at,
              progress: task.progress,
              projectId: apiData.project_id,
              sampleNumber: '', // APIには存在しないためデフォルト値（string型）
              notes: '', // APIには存在しないためデフォルト値
              progressRate: task.progress, // progressと同じ値を使用
              transitionStatuses: [], // APIには存在しないためデフォルト値
              progressReport: '', // APIには存在しないためデフォルト値
              recordNumber: '', // APIには存在しないためデフォルト値（string型）
            }))
          );
          
          console.log('[DEBUG] ProgressCheckTab - Converted data', {
            methodCount: methodsData.length,
            taskCount: allTasks.length
          });
          
          setMethods(methodsData);
          setTasks(allTasks);
          
          message.success('タスク一覧を取得しました');
        } else {
          console.error('[DEBUG] ProgressCheckTab - API returned unsuccessful', result);
          message.error('タスク一覧の取得に失敗しました');
          setMethods([]);
          setTasks([]);
        }
      } catch (error) {
        console.error('[DEBUG] ProgressCheckTab - Error fetching tasks', error);
        message.error('タスク一覧の取得中にエラーが発生しました');
        setMethods([]);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkerTasks();
  }, [selectedProject, selectedProjectName]);
  
  // プロジェクト変更時に最初のメソッドを自動選択
  useEffect(() => {
    if (methods.length > 0 && !selectedMethodId) {
      onSelectMethod(methods[0].methodId);
    }
  }, [methods, selectedMethodId, onSelectMethod]);
  
  // 問題報告モーダルの状態管理
  const [issueReportModalVisible, setIssueReportModalVisible] = useState<boolean>(false);
  const [selectedTaskForIssue, setSelectedTaskForIssue] = useState<Task | null>(null);
  
  // 問題確認モーダルの状態管理
  const [issueCheckModalVisible, setIssueCheckModalVisible] = useState<boolean>(false);
  const [selectedTaskForIssueCheck, setSelectedTaskForIssueCheck] = useState<Task | null>(null);

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

  // モックの問題データ（プロジェクト全体の問題を想定）
  const mockIssues = useMemo<Issue[]>(() => {
    if (!selectedProject) return [];
    
    // TODO: 実際にはバックエンドから取得
    return [
      {
        issueId: 'issue_001',
        projectId: projectId || '',
        projectName: selectedProject,
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
            createdAt: new Date(new Date().getTime() - 3600000).toISOString()
          }
        ]
      }
    ];
  }, [selectedProject, projectId, tasks]);

  // メソッドのステータスを計算する関数
  const getMethodStatus = useCallback((methodTasks: Task[]): {
    status: BadgeProps['status'];
    label: string;
  } => {
    if (methodTasks.length === 0) {
      return { status: 'default', label: '未着手' };
    }

    // 強制終了タスクがあればエラー
    const hasForceTerminated = methodTasks.some(t => t.status === 'forced_terminated');
    if (hasForceTerminated) {
      return { status: 'error', label: 'エラー' };
    }

    // 全タスクが完了していれば完了
    const allCompleted = methodTasks.every(t => t.status === 'completed');
    if (allCompleted) {
      return { status: 'success', label: '完了' };
    }

    // 作業中・開始済みのタスクがあれば作業中
    const hasInProgress = methodTasks.some(
      t => t.status === 'in_progress' || t.status === 'started'
    );
    if (hasInProgress) {
      return { status: 'processing', label: '作業中' };
    }

    // それ以外は未着手
    return { status: 'default', label: '未着手' };
  }, []);

  // メソッドタブの生成（各メソッドに紐づくタスクのみを表示）
  const methodTabs = useMemo(() => {
    return methods.map((method) => {
      // このメソッドに紐づくタスクのみをフィルタリング
      const methodTasks = tasks.filter(task => task.methodId === method.methodId);
      
      // メソッドのステータスを取得
      const methodStatus = getMethodStatus(methodTasks);
      
      return {
        key: method.methodId,
        label: (
          <div style={{ textAlign: 'left', lineHeight: '1.3', padding: '4px 0' }}>
            <div style={{ fontSize: '14px', fontWeight: 500 }}>
              {method.methodName}
            </div>
            <div style={{ 
              fontSize: '12px', 
              color: token.colorTextSecondary,
              marginTop: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Badge status={methodStatus.status} />
              <span>{methodStatus.label}</span>
              <span style={{ margin: '0 4px' }}>|</span>
              <span>{methodTasks.length}タスク</span>
            </div>
          </div>
        ),
        children: (
          <div style={{ marginTop: token.marginLG }}>
            {methodTasks.length > 0 ? (
              <ProgressCheckTable
                tasks={methodTasks}
                projectStatus={projectStatus}
                onTaskAction={handleTaskAction}
              />
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: token.colorTextDisabled,
                  fontSize: '14px'
                }}
              >
                タスクが見つかりません
              </div>
            )}
          </div>
        ),
      };
    });
  }, [methods, tasks, projectStatus, handleTaskAction, token, getMethodStatus]);

  return (
    <div style={{ padding: 0 }}>
      {loading ? (
        <Card
          style={{
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          }}
        >
          <Space direction="vertical" align="center" style={{ width: '100%', padding: `${token.marginXXL}px 0` }}>
            <div className="ant-spin ant-spin-spinning">
              <span className="ant-spin-dot ant-spin-dot-spin">
                <i className="ant-spin-dot-item"></i>
                <i className="ant-spin-dot-item"></i>
                <i className="ant-spin-dot-item"></i>
                <i className="ant-spin-dot-item"></i>
              </span>
            </div>
            <Text type="secondary" style={{ marginTop: token.margin }}>
              タスク一覧を読み込んでいます...
            </Text>
          </Space>
        </Card>
      ) : !selectedProject ? (
        <Card
          style={{
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          }}
        >
          <Space direction="vertical" align="center" style={{ width: '100%', padding: `${token.marginXXL}px 0` }}>
            <CheckSquareOutlined style={{ fontSize: EMPTY_ICON_SIZE, color: token.colorTextDisabled }} />
            <Title level={3} type="secondary">
              <CheckSquareOutlined style={{ marginRight: token.marginXS }} />
              進捗確認
            </Title>
            <Text type="secondary">
              プロジェクトを選択してください
            </Text>
          </Space>
        </Card>
      ) : methods.length === 0 ? (
        <Card
          style={{
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          }}
        >
          <Space direction="vertical" align="center" style={{ width: '100%', padding: `${token.marginXXL}px 0` }}>
            <CheckSquareOutlined style={{ fontSize: EMPTY_ICON_SIZE, color: token.colorTextDisabled }} />
            <Title level={3} type="secondary">
              メソッドが見つかりません
            </Title>
            <Text type="secondary">
              このプロジェクトにはメソッドが登録されていません
            </Text>
          </Space>
        </Card>
      ) : (
        <Card
          style={{
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          }}
          bodyStyle={{ padding: 0 }}
        >
          {/* メソッドタブ */}
          <Tabs
            activeKey={selectedMethodId || undefined}
            onChange={onSelectMethod}
            items={methodTabs}
            size="middle"
            type="card"
            style={{
              marginBottom: 0,
            }}
            tabBarStyle={{
              marginBottom: 0,
              paddingLeft: token.padding,
              paddingRight: token.padding,
            }}
          />
        </Card>
      )}

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
