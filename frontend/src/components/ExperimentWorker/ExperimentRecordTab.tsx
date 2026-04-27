'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Space, Typography, theme, Button, message } from 'antd';
import { useLanguage } from '@/contexts/LanguageContext';
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
import { extractErrorMessage } from '@/utils/errorUtils';

const { Title, Text } = Typography;

/**
 * 空状態アイコンのサイズ定数
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
  /** 選択中プロジェクトのプロジェクト名（S3パス構築・UI表示用） */
  selectedProjectName?: string;
  onProjectChange: (value: string) => void;
  selectedMethodId: string | null;
  onSelectMethod: (methodId: string | null) => void;
  selectedTaskId: string;
  onSelectTask: (taskId: string) => void;
  onTaskCreated: (newTaskId: string) => void;
  selectedMethod: Method | null;
  /** 選択中プロジェクトのステータス数値: 0=計画中, 1=タスク実行待ち, 2=タスク実行中, 3=承認待ち, 4=完了, 5=異常終了 */
  selectedProjectStatus: number | null;
  /** みなし進捗使用フラグ: organization.use_deemed_progress。false の場合はチェックボックスを非表示にしてステータス更新を常時表示 */
  useDeemedProgress?: boolean;
}

/**
 * 実験記録タブのコンポーネント
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
  const { token } = theme.useToken();
  const { t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  const [dataRecordModalOpen, setDataRecordModalOpen] = useState(false);
  const [selectedTransition, setSelectedTransition] = useState<Transition | null>(null);
  
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issueLoading, setIssueLoading] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [methods, setMethods] = useState<Method[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<Record<string, unknown>[]>([]);
  
  /**
   * worker-accessible APIの数値ステータスを ProjectStatus 型にマッピング
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

  const projectStatus: ProjectStatus | null = mapNumericStatusToProjectStatus(selectedProjectStatus);

  /**
   * APIレスポンスの数値トランジションステータスを ProgressStatus 文字列型に変換
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

  // プロジェクト選択時にAPIを呼び出す
  useEffect(() => {
    const fetchWorkerTasks = async () => {
      if (!selectedProject) {
        setMethods([]);
        setTasks([]);
        setProjectId(null);
        return;
      }

      setLoading(true);
      try {
        console.log('[DEBUG] ExperimentRecordTab - Fetching worker tasks', { 
          selectedProject
        });
        
        const result = await getWorkerTasks(selectedProject);
        
        if (result.success && result.data) {
          const apiData = result.data;
          
          console.log('[DEBUG] ExperimentRecordTab - API response', {
            project_id: apiData.project_id,
            methodCount: apiData.methods.length
          });
          
          setProjectId(apiData.project_id);
          
          const methodsData: Method[] = apiData.methods.map((method: WorkerMethod) => ({
            methodId: method.method_id,
            methodName: method.method_name,
            experimentOrder: method.experiment_order,
            description: '',
            category: 'experiment',
            transitions: [],
            tasks: method.tasks.map((task: WorkerTask) => ({
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
              projectId: apiData.project_id,
              sampleNumber: '',
              notes: '',
              progressRate: parseFloat(task.progress_rate),
              transitionStatuses: [],
              progressReport: '',
              recordNumber: '',
            })),
          }));
          
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

          // 重複 taskId を排除（同一 task_no が複数返された場合の React key 衝突を防止）
          const uniqueTasksMap = new Map<string, Task>();
          allTasks.forEach(task => uniqueTasksMap.set(task.taskId, task));
          const uniqueTasks = Array.from(uniqueTasksMap.values());

          // methodsData の tasks も同様に重複排除
          const deduplicatedMethods = methodsData.map(method => {
            const methodTasksMap = new Map<string, Task>();
            (method.tasks ?? []).forEach((task: Task) => methodTasksMap.set(task.taskId, task));
            return { ...method, tasks: Array.from(methodTasksMap.values()) };
          });

          setMethods(deduplicatedMethods);
          setTasks(uniqueTasks);
        } else {
          console.error('[DEBUG] ExperimentRecordTab - API returned unsuccessful', result);
          message.error(extractErrorMessage(null));
          setMethods([]);
          setTasks([]);
        }
      } catch (error) {
        console.error('[DEBUG] ExperimentRecordTab - Error fetching tasks', error);
        message.error(extractErrorMessage(error));
        setMethods([]);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkerTasks();
  }, [selectedProject]);

  const filteredTasks = useMemo(() => {
    if (!selectedMethodId) return tasks;
    return tasks.filter(task => task.methodId === selectedMethodId);
  }, [tasks, selectedMethodId]);

  /**
   * 進捗データを取得してstateを更新する
   */
  const fetchProgress = useCallback(async () => {
    if (!selectedProject || !selectedMethodId || !selectedTaskId) {
      setProgressData([]);
      return;
    }

    const parts = selectedTaskId.split('-');
    const taskNo = parts.length > 0 ? parseInt(parts[parts.length - 1], 10) : null;

    if (taskNo === null || isNaN(taskNo)) {
      console.error('[DEBUG] ExperimentRecordTab - Invalid taskNo', { selectedTaskId });
      setProgressData([]);
      return;
    }

    try {
      console.log('[DEBUG] ExperimentRecordTab - Fetching progress data', {
        selectedProject,
        selectedMethodId,
        taskNo,
      });

      const client = createApiClient();
      const response = await client.get(
        `/progress/projects/${encodeURIComponent(selectedProject)}/methods/${encodeURIComponent(selectedMethodId)}/tasks/${taskNo}/transitions`
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
      setProgressData([]);
    }
  }, [selectedProject, selectedMethodId, selectedTaskId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const isProjectRecordable = projectStatus === null || isRecordViewableStatus(projectStatus);

  const handleRecordClick = (transition: Transition) => {
    setSelectedTransition(transition);
    setDataRecordModalOpen(true);
  };
  
  const handleIssueClick = async (transition: Transition) => {
    setSelectedTransition(transition);
    setIssues([]);
    setIssueModalOpen(true);

    const parts = selectedTaskId.split('-');
    const taskNo = parts.length > 0 ? parseInt(parts[parts.length - 1], 10) : null;

    if (!projectId || !selectedMethodId || taskNo === null || isNaN(taskNo)) {
      console.warn('[handleIssueClick] 必須なパラメータが不足しています', {
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
      message.error(extractErrorMessage(error));
    } finally {
      setIssueLoading(false);
    }
  };

  const handleDataRecordModalClose = () => {
    setDataRecordModalOpen(false);
    setSelectedTransition(null);
  };
  
  const handleIssueModalClose = () => {
    setIssueModalOpen(false);
    setSelectedTransition(null);
  };

  const handleDataSave = (_data: ExperimentDataValue[]) => {
    setDataRecordModalOpen(false);
    setSelectedTransition(null);
    fetchProgress();
  };
  
  const handleSubmitIssue = async (issue: IssueReportFormData) => {
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
        } finally {
          setIssueLoading(false);
        }
      }
    } catch (error) {
      console.error('[handleSubmitIssue] 問題報告エラー', error);
      message.error(extractErrorMessage(error));
    }
  };
  
  const handleSubmitComment = async (issueId: string, comment: string) => {
    const parts = selectedTaskId.split('-');
    const taskNo = parts.length > 0 ? parseInt(parts[parts.length - 1], 10) : null;

    try {
      await addComment({
        projectName: selectedProject,
        issueId,
        comment,
      });

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
        } finally {
          setIssueLoading(false);
        }
      }
    } catch (error) {
      console.error('[handleSubmitComment] コメント投稿エラー', error);
      message.error(extractErrorMessage(error));
    }
  };

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

  const handleSwitchToFlow = () => {
    setViewMode('flow');
  };

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

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {!selectedProject ? (
          <Card data-testid="empty-project-card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Space orientation="vertical" align="center" style={{ width: '100%', padding: `${token.marginXXL}px 0` }}>
              <ExperimentOutlined style={{ fontSize: EMPTY_ICON_SIZE, color: token.colorTextDisabled }} />
          <Title level={3} type="secondary">
                🧪 {t('menu.experiment_worker.tabs.experimentRecord')}
              </Title>
              <Text type="secondary">
                {t('experimentWork.projectSelection.title')}
              </Text>
            </Space>
          </Card>
        ) : !selectedMethodId ? (
          <Card data-testid="empty-method-card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Space orientation="vertical" align="center" style={{ width: '100%', padding: `${token.marginXXL}px 0` }}>
              <ExperimentOutlined style={{ fontSize: EMPTY_ICON_SIZE, color: token.colorTextDisabled }} />
              <Title level={3} type="secondary">
                📋 トランジション一覧
              </Title>
              <Text type="secondary">
                {t('experimentWork.labels.methodPlaceholder')}
              </Text>
            </Space>
          </Card>
        ) : !selectedTaskId ? (
          <Card data-testid="empty-task-card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Space orientation="vertical" align="center" style={{ width: '100%', padding: `${token.marginXXL}px 0` }}>
              <CheckSquareOutlined style={{ fontSize: EMPTY_ICON_SIZE, color: token.colorTextDisabled }} />
              <Title level={3} type="secondary">
                📋 トランジション一覧
              </Title>
              <Text type="secondary">
                {t('experimentWork.labels.taskPlaceholder')}
              </Text>
            </Space>
          </Card>
        ) : (
          <Card data-testid="transition-content-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {viewMode === 'list' ? (
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
                    projectName={selectedProjectName || selectedProject}
                    onDataSaveComplete={fetchProgress}
                    useDeemedProgress={useDeemedProgress}
                  />
                </div>
              </div>
            ) : (
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

      {dataRecordModalOpen && (
        <DataRecordDialog
          open={dataRecordModalOpen}
          transition={selectedTransition}
          projectStatus={projectStatus}
          onClose={handleDataRecordModalClose}
          onSave={handleDataSave}
          projectId={selectedProject}
          projectName={selectedProjectName || selectedProject || undefined}
          methodId={selectedMethodId || undefined}
          taskNo={(() => { const p = (selectedTaskId ?? '').split('-'); const n = parseInt(p[p.length - 1], 10); return isNaN(n) ? undefined : n; })()}
          useDeemedProgress={useDeemedProgress}
        />
      )}

      {issueModalOpen && (
        <IssueManagementModal
          open={issueModalOpen}
          targetName={selectedTransition?.transitionName || ''}
          projectId={projectId || ''}
          projectName={selectedProject || ''}
          methodId={selectedMethodId || undefined}
          taskNo={(() => { const p = (selectedTaskId ?? '').split('-'); const n = parseInt(p[p.length - 1], 10); return isNaN(n) ? undefined : n; })()}
          transitionId={selectedTransition?.transitionId || undefined}
          onClose={handleIssueModalClose}
          projectStatus={projectStatus}
        />
      )}
    </div>
  );
}
