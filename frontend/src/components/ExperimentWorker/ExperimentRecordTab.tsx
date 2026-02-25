'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Space, Typography, theme, Button, Empty, message } from 'antd';
import { 
  ExperimentOutlined, 
  CheckSquareOutlined, 
  PartitionOutlined,
  UnorderedListOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import TransitionList from './TransitionList';
import TransitionFlowDiagram from './TransitionFlowDiagram';
import DataRecordDialog from './DataRecordDialog';
import IssueManagementModal from './IssueManagementModal';
import MethodTaskSelectionModal from './MethodTaskSelectionModal';
import MethodTaskSelector from './MethodTaskSelector';
import { getIssues, createIssue, addComment } from '@/services/issueApiService';
import { Method, ProjectStatus, ProgressStatus, Transition, Issue, IssueReportFormData, Task, ExperimentDataValue } from '@/types/experimentWorker';
import { getWorkerTasks, getProjectDetail } from '@/services/projectApiService';
import type { WorkerMethod, WorkerTask } from '@/services/projectApiService';
import { createApiClient } from '@/utils/authUtils';

const { Title, Text } = Typography;

/**
 * 空状態アイコンのサイズ（UIポリシー準拠）
 */
const EMPTY_ICON_SIZE = 48;

/**
 * 表示モード
 */
type ViewMode = 'list' | 'flow';

/**
 * 実験記録タブのProps
 */
interface ExperimentRecordTabProps {
  selectedProject: string;
  selectedProjectName: string;
  onProjectChange: (value: string) => void;
  selectedMethodId: string | null;
  onSelectMethod: (methodId: string | null) => void;
  selectedTaskId: string;
  onSelectTask: (taskId: string) => void;
  onTaskCreated: (newTaskId: string) => void;
  selectedMethod: Method | null;
}

/**
 * 実験記録タブのコンテンツ
 */
export default function ExperimentRecordTab({
  selectedProject,
  selectedProjectName,
  onProjectChange,
  selectedMethodId,
  onSelectMethod,
  selectedTaskId,
  onSelectTask,
  onTaskCreated,
  selectedMethod,
}: ExperimentRecordTabProps) {
  // テーマトークンを取得（UIポリシー準拠）
  const { token } = theme.useToken();
  const [modalOpen, setModalOpen] = useState(false);
  // 表示モードの状態管理
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  // データ記録モーダルの状態管理
  const [dataRecordModalOpen, setDataRecordModalOpen] = useState(false);
  const [selectedTransition, setSelectedTransition] = useState<Transition | null>(null);
  
  // 問題報告モーダルの状態管理
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issueLoading, setIssueLoading] = useState<boolean>(false);

  // API連携の状態管理
  const [loading, setLoading] = useState<boolean>(false);
  const [methods, setMethods] = useState<Method[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<Record<string, unknown>[]>([]);
  
  // プロジェクトのステータス（APIから取得）
  const [projectStatus, setProjectStatus] = useState<ProjectStatus | null>(null);
  
  /**
   * バックエンドの project_status 値をフロントエンドの ProjectStatus 型にマッピング
   */
  const mapBackendStatusToProjectStatus = (backendStatus: string): ProjectStatus | null => {
    switch (backendStatus) {
      case 'active':
      case 'in_progress':
        return 'executing_task';
      case 'created':
      case 'checked_in':
        return 'waiting_task';
      case 'waiting_approval':
        return 'waiting_approval';
      case 'approved':
        return 'completed';
      default:
        console.warn('[mapBackendStatusToProjectStatus] 未知のステータス:', backendStatus);
        return null;
    }
  };

  // projectId が確定したらプロジェクトステータスを取得
  useEffect(() => {
    const fetchProjectStatus = async () => {
      if (!projectId) {
        setProjectStatus(null);
        return;
      }

      try {
        console.log('[DEBUG] ExperimentRecordTab - Fetching project status', { projectId });

        const result = await getProjectDetail(projectId);

        if (result.success && result.data) {
          const mappedStatus = mapBackendStatusToProjectStatus(result.data.project_status);
          console.log('[DEBUG] ExperimentRecordTab - Project status fetched', {
            backendStatus: result.data.project_status,
            mappedStatus,
          });
          setProjectStatus(mappedStatus);
        } else {
          console.warn('[DEBUG] ExperimentRecordTab - getProjectDetail returned unsuccessful');
          setProjectStatus(null);
        }
      } catch (error) {
        console.error('[DEBUG] ExperimentRecordTab - Error fetching project status', error);
        // エラー時は null のまま（isProjectRecordable = true で安全側に倒す）
        setProjectStatus(null);
      }
    };

    fetchProjectStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // プロジェクト選択時にAPI呼び出し
  useEffect(() => {
    const fetchWorkerTasks = async () => {
      if (!selectedProjectName) {
        setMethods([]);
        setTasks([]);
        setProjectId(null);
        return;
      }

      setLoading(true);
      try {
        console.log('[DEBUG] ExperimentRecordTab - Fetching worker tasks', { 
          selectedProject, 
          selectedProjectName 
        });
        
        const result = await getWorkerTasks(selectedProjectName);
        
        if (result.success && result.data) {
          const apiData = result.data;
          
          console.log('[DEBUG] ExperimentRecordTab - API response', {
            project_id: apiData.project_id,
            methodCount: apiData.methods.length
          });
          
          // プロジェクトIDを保存
          setProjectId(apiData.project_id);
          
          // メソッド一覧を変換
          const methodsData: Method[] = apiData.methods.map((method: WorkerMethod) => ({
            methodId: method.method_id,
            methodName: method.method_name,
            experimentOrder: method.experiment_order,
            description: '',
            category: 'experiment',
            transitions: [],
          }));
          
          // 全タスクを変換
          const allTasks: Task[] = apiData.methods.flatMap((method: WorkerMethod) =>
            method.tasks.map((task: WorkerTask) => ({
              taskId: `${apiData.project_id}-${method.method_id}-${task.task_no}`,
              taskNo: task.task_no.toString(),
              taskName: task.task_no.toString(),
              methodId: method.method_id,
              methodName: method.method_name,
              status: task.task_status as Task['status'],
              assignedUserId: task.experiment_user_id || undefined,
              assignedUserName: task.experiment_user_name || undefined,
              createdAt: task.created_at,
              updatedAt: task.updated_at,
              progress: parseFloat(task.progress_rate),
              projectId: apiData.project_id,
              sampleNumber: '',
              notes: '',
              progressRate: parseFloat(task.progress_rate),
              transitionStatuses: [],
              progressReport: '',
              recordNumber: '',
            }))
          );
          
          console.log('[DEBUG] ExperimentRecordTab - Converted data', {
            methodCount: methodsData.length,
            taskCount: allTasks.length
          });
          
          setMethods(methodsData);
          setTasks(allTasks);
        } else {
          console.error('[DEBUG] ExperimentRecordTab - API returned unsuccessful', result);
          message.error('タスク一覧の取得に失敗しました');
          setMethods([]);
          setTasks([]);
        }
      } catch (error) {
        console.error('[DEBUG] ExperimentRecordTab - Error fetching tasks', error);
        message.error('タスク一覧の取得中にエラーが発生しました');
        setMethods([]);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkerTasks();
  }, [selectedProject, selectedProjectName]);

  // 選択されたメソッドに紐づくタスクをフィルタリング
  const filteredTasks = useMemo(() => {
    if (!selectedMethodId) return tasks;
    return tasks.filter(task => task.methodId === selectedMethodId);
  }, [tasks, selectedMethodId]);

  /**
   * 進捗データを取得してstateを更新する
   * handleDataSave からも呼び出せるよう useCallback で定義
   */
  const fetchProgress = useCallback(async () => {
    if (!selectedProjectName || !selectedMethodId || !selectedTaskId) {
      setProgressData([]);
      return;
    }

    // selectedTaskIdからtaskNoを抽出（形式: projectId-methodId-taskNo）
    const parts = selectedTaskId.split('-');
    const taskNo = parts.length > 2 ? parseInt(parts[2], 10) : null;

    if (taskNo === null || isNaN(taskNo)) {
      console.error('[DEBUG] ExperimentRecordTab - Invalid taskNo', { selectedTaskId });
      setProgressData([]);
      return;
    }

    try {
      console.log('[DEBUG] ExperimentRecordTab - Fetching progress data', {
        selectedProjectName,
        selectedMethodId,
        taskNo,
      });

      // GET /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/transitions
      const client = createApiClient();
      const response = await client.get(
        `/progress/projects/${encodeURIComponent(selectedProjectName)}/methods/${encodeURIComponent(selectedMethodId)}/tasks/${taskNo}/transitions`
      );

      if (response.data.success && response.data.data && response.data.data.transitions) {
        console.log('[DEBUG] ExperimentRecordTab - Progress data fetched', {
          count: response.data.data.transitions.length,
        });
        setProgressData(response.data.data.transitions);
      } else {
        console.warn('[DEBUG] ExperimentRecordTab - Invalid response structure', response.data);
        setProgressData([]);
      }
    } catch (error) {
      console.error('[DEBUG] ExperimentRecordTab - Error fetching progress', error);
      // エラー時は空配列を設定（デフォルト値で表示）
      setProgressData([]);
    }
  }, [selectedProjectName, selectedMethodId, selectedTaskId]);

  // タスク選択時に進捗データを取得
  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // プロジェクトの状態が記録可能かどうか
  // executing_task（作業中）のみ記録可能
  // waiting_approval（承認待ち）、waiting_task（タスク待ち）、completed（完了）は記録不可
  // projectStatus が null（取得前/エラー）の場合は安全側に倒して true（記録可能）とする
  const isProjectRecordable = projectStatus === null || projectStatus === 'executing_task';

  // 記録ボタンクリックハンドラ
  const handleRecordClick = (transition: Transition) => {
    setSelectedTransition(transition);
    setDataRecordModalOpen(true);
  };
  
  // 問題報告ボタンクリックハンドラ
  const handleIssueClick = async (transition: Transition) => {
    // まずモーダルを開き、ローディング状態で待機させる
    setSelectedTransition(transition);
    setIssues([]);
    setIssueModalOpen(true);

    // selectedTaskId から taskNo を抽出（形式: {projectId}-{methodId}-{taskNo}）
    // projectId は UUID（ハイフン含む）のため末尾要素を取得する
    const parts = selectedTaskId.split('-');
    const taskNo = parts.length > 0 ? parseInt(parts[parts.length - 1], 10) : null;

    if (!projectId || !selectedMethodId || taskNo === null || isNaN(taskNo)) {
      console.warn('[handleIssueClick] 必要なパラメータが不足しています', {
        projectId,
        selectedMethodId,
        selectedTaskId,
        taskNo,
      });
      return;
    }

    setIssueLoading(true);
    try {
      const fetchedIssues = await getIssues({
        projectId,
        methodId: selectedMethodId,
        taskNo,
        transitionId: transition.transitionId,
      });
      setIssues(fetchedIssues);
    } catch (error) {
      console.error('[handleIssueClick] 問題一覧取得エラー', error);
      message.error('問題一覧の取得に失敗しました');
    } finally {
      setIssueLoading(false);
    }
  };

  // データ記録モーダルを閉じる
  const handleDataRecordModalClose = () => {
    setDataRecordModalOpen(false);
    setSelectedTransition(null);
  };
  
  // 問題報告モーダルを閉じる
  const handleIssueModalClose = () => {
    setIssueModalOpen(false);
    setSelectedTransition(null);
  };

  /**
   * データ保存コールバック（DataRecordDialog の onSave から呼ばれる）
   * ※ 実際のAPI呼び出しは DataRecordDialog.handleSaveTemplate 内で完結している
   */
  const handleDataSave = (_data: ExperimentDataValue[]) => {
    // モーダルを閉じ、選択状態をリセット
    setDataRecordModalOpen(false);
    setSelectedTransition(null);

    // 保存後に進捗データを再取得してトランジション一覧を最新状態に更新
    fetchProgress();
  };
  
  // 新規問題報告送信ハンドラ
  const handleSubmitIssue = async (issue: IssueReportFormData) => {
    // selectedTaskId から taskNo を抽出（形式: {projectId}-{methodId}-{taskNo}）
    // projectId は UUID（ハイフン含む）のため末尾要素を取得する
    const parts = selectedTaskId.split('-');
    const taskNo = parts.length > 0 ? parseInt(parts[parts.length - 1], 10) : null;

    if (!projectId) {
      console.warn('[handleSubmitIssue] projectId が未設定です');
      message.error('プロジェクトが選択されていません');
      return;
    }

    try {
      await createIssue({
        projectId,
        methodId: selectedMethodId ?? undefined,
        issueType: issue.issueType,
        targetType: issue.targetType,
        taskNo: (taskNo !== null && !isNaN(taskNo)) ? taskNo : undefined,
        transitionId: selectedTransition?.transitionId ?? undefined,
        title: issue.title,
        description: issue.content,
      });

      message.success('問題を報告しました');

      // 問題一覧を再取得して最新状態を反映
      if (projectId && selectedMethodId && taskNo !== null && !isNaN(taskNo) && selectedTransition) {
        setIssueLoading(true);
        try {
          const fetchedIssues = await getIssues({
            projectId,
            methodId: selectedMethodId,
            taskNo,
            transitionId: selectedTransition.transitionId,
          });
          setIssues(fetchedIssues);
        } catch (fetchError) {
          console.error('[handleSubmitIssue] 問題一覧再取得エラー', fetchError);
          // 再取得失敗はサイレントに処理（報告自体は成功しているため）
        } finally {
          setIssueLoading(false);
        }
      }
    } catch (error) {
      console.error('[handleSubmitIssue] 問題報告エラー', error);
      message.error('問題の報告に失敗しました');
    }
  };
  
  // コメント送信ハンドラ
  const handleSubmitComment = async (issueId: string, comment: string) => {
    // selectedTaskId から taskNo を抽出（形式: {projectId}-{methodId}-{taskNo}）
    // projectId は UUID（ハイフン含む）のため末尾要素を取得する
    const parts = selectedTaskId.split('-');
    const taskNo = parts.length > 0 ? parseInt(parts[parts.length - 1], 10) : null;

    try {
      await addComment({
        projectName: selectedProjectName,
        issueId,
        comment,
      });

      // コメント投稿成功後に問題一覧を再取得して表示に反映
      if (projectId && selectedMethodId && taskNo !== null && !isNaN(taskNo) && selectedTransition) {
        setIssueLoading(true);
        try {
          const fetchedIssues = await getIssues({
            projectId,
            methodId: selectedMethodId,
            taskNo,
            transitionId: selectedTransition.transitionId,
          });
          setIssues(fetchedIssues);
        } catch (fetchError) {
          console.error('[handleSubmitComment] 問題一覧再取得エラー', fetchError);
          // 再取得失敗はサイレントに処理（コメント投稿自体は成功しているため）
        } finally {
          setIssueLoading(false);
        }
      }
    } catch (error) {
      console.error('[handleSubmitComment] コメント投稿エラー', error);
      message.error('コメントの投稿に失敗しました');
    }
  };

  // 進捗データをトランジションにマージ
  const transitionsWithProgress = useMemo(() => {
    if (!selectedMethod) {
      return [];
    }

    return selectedMethod.transitions.map(transition => {
      // APIから取得した進捗データを検索
      const progress = progressData.find(p => p.transition_id === transition.transitionId);

      if (progress) {
        // 進捗データが見つかった場合、ステータスと進捗率をマージ
        // APIレスポンスのstatusは既に文字列（'not_started' | 'in_progress' | 'completed'）
        return {
          ...transition,
          status: ((progress.status as string) || 'not_started') as ProgressStatus,
          progressRate: (progress.progress as number) ?? 0,
          inputMaterialsCount: 0, // TODO: 将来的にAPI追加
          inputIngredientsCount: 0, // TODO: 将来的にAPI追加
          inputResultsCount: 0, // TODO: 将来的にAPI追加
        };
      }

      // 進捗データが見つからない場合、デフォルト値を設定
      return {
        ...transition,
        status: 'not_started' as const,
        progressRate: 0,
        inputMaterialsCount: 0,
        inputIngredientsCount: 0,
        inputResultsCount: 0
      };
    });
  }, [selectedMethod, progressData]);

  // フロー図に切り替え
  const handleSwitchToFlow = () => {
    setViewMode('flow');
  };

  // 一覧表示に切り替え
  const handleSwitchToList = () => {
    setViewMode('list');
  };

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* 選択メソッド・タスクエリア（共通コンポーネント使用） */}
      <MethodTaskSelector
        selectedProject={selectedProject}
        selectedMethodId={selectedMethodId}
        onSelectMethod={onSelectMethod}
        methods={methods}
        selectedTaskId={selectedTaskId}
        onSelectTask={onSelectTask}
        tasks={filteredTasks}
        onOpenModal={() => setModalOpen(true)}
        methodDisabled={!selectedProject || loading}
        taskDisabled={!selectedMethodId || loading}
      />

      {/* 表示切り替えボタン */}
      {selectedProject && selectedMethod && (
        <div style={{ marginBottom: 8, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
          <Space size="middle">
            {viewMode === 'list' ? (
              <Button
                type="default"
                icon={<PartitionOutlined />}
                onClick={handleSwitchToFlow}
                size="large"
              >
                フロー図に切り替え
              </Button>
            ) : (
              <Button
                type="default"
                icon={<UnorderedListOutlined />}
                onClick={handleSwitchToList}
                size="large"
              >
                一覧表示に切り替え
              </Button>
            )}
          </Space>
        </div>
      )}

      {/* トランジション一覧カード - タスク選択後のみ表示 */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {!selectedProject ? (
          <Card style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Space direction="vertical" align="center" style={{ width: '100%', padding: `${token.marginXXL}px 0` }}>
              <ExperimentOutlined style={{ fontSize: EMPTY_ICON_SIZE, color: token.colorTextDisabled }} />
              <Title level={3} type="secondary">
                🧪 実験記録
              </Title>
              <Text type="secondary">
                プロジェクトを選択してください
              </Text>
            </Space>
          </Card>
        ) : !selectedMethod ? (
          <Card style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Space direction="vertical" align="center" style={{ width: '100%', padding: `${token.marginXXL}px 0` }}>
              <ExperimentOutlined style={{ fontSize: EMPTY_ICON_SIZE, color: token.colorTextDisabled }} />
              <Title level={3} type="secondary">
                📋 トランジション一覧
              </Title>
              <Text type="secondary">
                メソッドを選択してください
              </Text>
            </Space>
          </Card>
        ) : !selectedTaskId ? (
          <Card style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Space direction="vertical" align="center" style={{ width: '100%', padding: `${token.marginXXL}px 0` }}>
              <CheckSquareOutlined style={{ fontSize: EMPTY_ICON_SIZE, color: token.colorTextDisabled }} />
              <Title level={3} type="secondary">
                📋 トランジション一覧
              </Title>
              <Text type="secondary">
                タスクを選択してください
              </Text>
            </Space>
          </Card>
        ) : (
          <Card style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {viewMode === 'list' ? (
              /* トランジション一覧表示 - タスク選択後のみ表示 */
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Title level={4} style={{ marginTop: 0, marginBottom: token.marginLG, flexShrink: 0, fontSize: 16 }}>
                  <BarChartOutlined style={{ marginRight: 8 }} />
                  トランジション一覧
                </Title>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <TransitionList
                    transitions={transitionsWithProgress}
                    methodName={selectedMethod?.methodName}
                    selectedTaskId={selectedTaskId}
                    projectStatus={projectStatus}
                    onTaskCreated={onTaskCreated}
                    projectId={selectedProject}
                    methodId={selectedMethodId || undefined}
                    projectName={selectedProjectName}
                    onDataSaveComplete={fetchProgress}
                  />
                </div>
              </div>
            ) : (
              /* フロー図表示 */
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Title level={4} style={{ marginTop: 0, marginBottom: token.marginLG, flexShrink: 0, fontSize: 16 }}>
                  <PartitionOutlined style={{ marginRight: 8 }} />
                  フロー図
                </Title>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <TransitionFlowDiagram
                    transitions={transitionsWithProgress}
                    onRecordClick={handleRecordClick}
                    onIssueClick={handleIssueClick}
                    isProjectRecordable={isProjectRecordable}
                    methodName={selectedMethod?.methodName}
                  />
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* メソッド・タスク選択モーダル */}
      <MethodTaskSelectionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedProject={selectedProject}
        selectedMethodId={selectedMethodId}
        selectedTaskId={selectedTaskId}
        onSelect={(methodId: string, taskId: string) => {
          onSelectMethod(methodId);
          onSelectTask(taskId);
        }}
        methods={methods}
      />

      {/* データ記録モーダル */}
      <DataRecordDialog
        open={dataRecordModalOpen}
        transition={selectedTransition}
        projectStatus={projectStatus}
        onClose={handleDataRecordModalClose}
        onSave={handleDataSave}
        projectId={selectedProject}
        projectName={selectedProjectName || undefined}
        methodId={selectedMethodId || undefined}
        taskNo={(() => { const p = (selectedTaskId ?? '').split('-'); const n = parseInt(p[p.length - 1], 10); return isNaN(n) ? undefined : n; })()}
      />

      {/* 問題報告モーダル */}
      <IssueManagementModal
        visible={issueModalOpen}
        transitionId={selectedTransition?.transitionId || ''}
        transitionName={selectedTransition?.transitionName || ''}
        issues={issues}
        onClose={handleIssueModalClose}
        onSubmitIssue={handleSubmitIssue}
        onSubmitComment={handleSubmitComment}
        projectStatus={projectStatus}
      />
    </div>
  );
}
