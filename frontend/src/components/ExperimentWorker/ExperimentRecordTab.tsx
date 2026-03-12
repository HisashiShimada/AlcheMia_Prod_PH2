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
import { Method, ProjectStatus, ProgressStatus, Transition, Issue, IssueReportFormData, Task, ExperimentDataValue, isRecordViewableStatus } from '@/types/experimentWorker';
import { getWorkerTasks } from '@/services/projectApiService';
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
  /** 選択中プロジェクトのステータス（数値）: 0=計画中, 1=タスク実行待ち, 2=タスク実行中, 3=承認待ち, 4=完了, 5=異常終了 */
  selectedProjectStatus: number | null;
  /** みなし進捗使用フラグ（organization.use_deemed_progress）: false の場合はチェックボックスを非表示にしてステータス更新を常時表示 */
  useDeemedProgress?: boolean;
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
  selectedProjectStatus,
  useDeemedProgress = true,
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
  
  /**
   * worker-accessible APIの数値ステータスをフロントエンドの ProjectStatus 型にマッピング
   * 0=計画中, 1=タスク実行待ち, 2=タスク実行中, 3=承認待ち, 4=完了, 5=異常終了
   */
  const mapNumericStatusToProjectStatus = (status: number | null): ProjectStatus | null => {
    switch (status) {
      case 1:
        return 'waiting_task';
      case 2:
        return 'executing_task';
      case 3:
        return 'waiting_approval';
      case 4:
        return 'completed';
      default:
        return null;
    }
  };

  // prop から受け取った数値ステータスを ProjectStatus 型に変換
  const projectStatus: ProjectStatus | null = mapNumericStatusToProjectStatus(selectedProjectStatus);

  /**
   * APIレスポンスの数値トランジションステータスをフロントエンドの ProgressStatus 文字列に変換
   *
   * バックエンド TransitionStatusEnum との対応:
   *   0: INITIAL     → 'not_started'
   *   1: PREPARING   → 'in_progress'
   *   2: READY       → 'in_progress'
   *   3: IN_PROGRESS → 'in_progress'
   *   4: PAUSED      → 'on_hold'
   *   5: COMPLETED   → 'completed'
   *   6: ERROR       → 'issue'
   */
  const mapTransitionStatusToProgressStatus = (status: unknown): ProgressStatus => {
    const num = Number(status);
    switch (num) {
      case 0:  return 'not_started';
      case 1:  return 'in_progress';
      case 2:  return 'in_progress';
      case 3:  return 'in_progress';
      case 4:  return 'on_hold';
      case 5:  return 'completed';
      case 6:  return 'issue';
      default: return 'not_started';
    }
  };

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
              taskName: task.task_no.toString(), // task_nameカラム削除のため、task_noを代用
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
    // projectId は UUID（ハイフン含む）のため末尾要素を取得する
    const parts = selectedTaskId.split('-');
    const taskNo = parts.length > 0 ? parseInt(parts[parts.length - 1], 10) : null;

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

  // プロジェクトの状態が記録を参照・操作可能かどうか
  // waiting_task / executing_task / waiting_approval の場合に活性
  // projectStatus が null（取得前/エラー）の場合は安全側に倒して true（活性）とする
  const isProjectRecordable = projectStatus === null || isRecordViewableStatus(projectStatus);

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

  // 進捗APIから取得したデータをトランジション一覧に変換
  // selectedMethod.transitions は常に空配列のため、progressData を起点にマッピングする
  // APIレスポンスフィールド対応:
  //   material_count       → totalMaterialsCount  (MAIMLから取得した材料の定義数)
  //   material_actual_count → inputMaterialsCount  (DBから取得した材料の実績数)
  //   condition_count      → totalIngredientsCount (MAIMLから取得した条件の定義数)
  //   condition_actual_count → inputIngredientsCount (DBから取得した条件の実績数)
  //   result_count         → totalResultsCount    (MAIMLから取得した結果の定義数)
  //   result_actual_count  → inputResultsCount    (DBから取得した結果の実績数)
  const transitionsWithProgress = useMemo(() => {
    if (!progressData || progressData.length === 0) {
      return [];
    }

    return progressData.map(progress => ({
      transitionId: progress.transition_id as string,
      transitionName: (progress.transition_name as string) ?? '',
      status: mapTransitionStatusToProgressStatus(progress.status),
      progressRate: (progress.progress as number) ?? 0,
      inputMaterialsCount: (progress.material_actual_count as number) ?? 0,
      totalMaterialsCount: (progress.material_count as number) ?? 0,
      inputIngredientsCount: (progress.condition_actual_count as number) ?? 0,
      totalIngredientsCount: (progress.condition_count as number) ?? 0,
      inputResultsCount: (progress.result_actual_count as number) ?? 0,
      totalResultsCount: (progress.result_count as number) ?? 0,
    }));
  }, [progressData]);

  // フロー図に切り替え
  const handleSwitchToFlow = () => {
    setViewMode('flow');
  };

  // 一覧表示に切り替え
  const handleSwitchToList = () => {
    setViewMode('list');
  };

  return (
    <div
      data-testid="experiment-record-tab"
      style={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
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
      {selectedProject && selectedMethodId && (
        <div style={{ marginBottom: 8, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
          <Space size="middle">
            {viewMode === 'list' ? (
              <Button
                data-testid="switch-to-flow-button"
                type="default"
                icon={<PartitionOutlined />}
                onClick={handleSwitchToFlow}
                size="large"
              >
                フロー図に切り替え
              </Button>
            ) : (
              <Button
                data-testid="switch-to-list-button"
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
          <Card data-testid="empty-project-card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
        ) : !selectedMethodId ? (
          <Card data-testid="empty-method-card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          <Card data-testid="empty-task-card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          <Card data-testid="transition-content-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {viewMode === 'list' ? (
              /* トランジション一覧表示 - タスク選択後のみ表示 */
              <div data-testid="transition-list-area" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
                    useDeemedProgress={useDeemedProgress}
                  />
                </div>
              </div>
            ) : (
              /* フロー図表示 */
              <div data-testid="transition-flow-area" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
        data-testid="method-task-selection-modal"
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
        useDeemedProgress={useDeemedProgress}
      />

      {/* 問題報告モーダル */}
      <IssueManagementModal
        visible={issueModalOpen}
        targetName={selectedTransition?.transitionName || ''}
        projectId={projectId || ''}
        projectName={selectedProjectName || ''}
        methodId={selectedMethodId || undefined}
        taskNo={(() => { const p = (selectedTaskId ?? '').split('-'); const n = parseInt(p[p.length - 1], 10); return isNaN(n) ? undefined : n; })()}
        transitionId={selectedTransition?.transitionId || undefined}
        onClose={handleIssueModalClose}
        projectStatus={projectStatus}
      />
    </div>
  );
}
