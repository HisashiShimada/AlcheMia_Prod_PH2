'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Card, Typography, Space, theme, Divider, Button, message, Modal } from 'antd';
import { FileTextOutlined, DownOutlined, RightOutlined, FileOutlined, AimOutlined, CheckCircleOutlined, NodeIndexOutlined, CheckSquareOutlined } from '@ant-design/icons';
import MethodTaskSelectionModal from './MethodTaskSelectionModal';
import MethodTaskSelector from './MethodTaskSelector';
import InstructionStats from './InstructionStats';
import InstructionGroup from './InstructionGroup';
import InstructionFlowDialog from './InstructionFlowDialog';
import SubNetViewer from '@/components/viewer/dialogs/SubNetViewer';
import type { FileData, SubnetData } from './InstructionFlowDialog';
import { Stats, Instruction, ProjectStatus, isEditableStatus, Method, Task } from '@/types/experimentWorker';
import { getWorkerTasks, confirmInstruction, getProjectMaiml } from '@/services/projectApiService';
import type { WorkerMethod, WorkerTask } from '@/services/projectApiService';
import { useLanguage } from '@/contexts/LanguageContext';
import { extractErrorMessage } from '@/utils/errorUtils';

const { Title, Text } = Typography;

/**
 * 空状態アイコンのサイズ（UIポリシー基準）
 */
const EMPTY_ICON_SIZE = 48;

/**
 * 指示確認タブのProps
 */
interface InstructionConfirmationTabProps {
  selectedProject: string;
  onProjectChange: (value: string) => void;
  selectedMethodId: string | null;
  onSelectMethod: (methodId: string | null) => void;
  selectedTaskId: string;
  onSelectTask: (taskId: string) => void;
  sortedInstructions: Instruction[];
  stats: Stats;
  isClient: boolean;
  expandedGroups: Record<string, boolean>;
  toggleGroup: (groupKey: string) => void;
  onInstructionsUpdated: () => Promise<void>;
  /** trueのとき確認完了ボタンを無効化（リードオンレイ閲覧モード用）*/
  readOnly?: boolean;
  /**
   * プロジェクトステータスコード（数値）
   * 2 = executing_task（タスク実行中）のときのみ確認完了ボタンを活性化
   * null = 未選択または取得前（非活性のまま）
   */
  projectStatusCode?: number | null;
}


/**
 * 指示確認タブのコンポーネント
 */
export default function InstructionConfirmationTab({
  selectedProject,
  onProjectChange,
  selectedMethodId,
  onSelectMethod,
  selectedTaskId,
  onSelectTask,
  sortedInstructions,
  stats,
  isClient,
  expandedGroups,
  toggleGroup,
  onInstructionsUpdated,
  readOnly = false,
  projectStatusCode = null,
}: InstructionConfirmationTabProps) {
  // デザイントークンを取得（UIポリシー基準）
  const { token } = theme.useToken();
  const { t } = useLanguage();

  // API連携の状態管理
  const [loading, setLoading] = useState<boolean>(false);
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);
  const [methods, setMethods] = useState<Method[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  
  // ViewRendererDialogの管理
  const [viewerDialogs, setViewerDialogs] = useState<Array<{
    id: string;
    file: FileData;
    zIndex: number;
  }>>([]);
  const [nextZIndex, setNextZIndex] = useState(999999);
  const [flowDiagramLoading, setFlowDiagramLoading] = useState(false);
  
  // SubNetViewerの管理
  const [subnetData, setSubnetData] = useState<SubnetData | null>(null);
  
  // メソッド・タスク選択モーダルの表示状態
  const [isModalVisible, setIsModalVisible] = useState(false);

  /**
   * タスク実行中（executing_task = コード値 2）のみ確認完了ボタンを活性化
   * projectStatusCode が null（未選択・取得前）の場合も非活性
   */
  const isTaskExecuting = projectStatusCode === 2;

  // InstructionGroup へ渡す projectStatus（表示用）は常に null のまま維持
  const projectStatus: ProjectStatus | null = null;

  console.log
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
        console.log('[DEBUG] InstructionConfirmationTab - Fetching worker tasks', { 
          selectedProject
        });
        
        const result = await getWorkerTasks(selectedProject);
        
        if (result.success && result.data) {
          const apiData = result.data;
          
          console.log('[DEBUG] InstructionConfirmationTab - API response', {
            project_id: apiData.project_id,
            methodCount: apiData.methods.length
          });
          
          // プロジェクトIDを保存
          setProjectId(apiData.project_id);
          
          // メソッド一覧を変換（タスクを含める）
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
              taskName: task.task_no.toString(), // task_nameカラム削除のためtask_noを代用
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
              assignedUserId: task.experiment_user_id,
              assignedUserName: task.experiment_user_name,
              createdAt: task.created_at,
              updatedAt: task.updated_at,
              progress: task.progress,
              projectId: apiData.project_id,
              sampleNumber: '',
              notes: '',
              progressRate: task.progress,
              transitionStatuses: [],
              progressReport: '',
              recordNumber: '',
            }))
          );
          
          console.log('[DEBUG] InstructionConfirmationTab - Converted data', {
            methodCount: methodsData.length,
            taskCount: allTasks.length
          });
          
          setMethods(methodsData);
          setTasks(allTasks);
        } else if (!result.success) {
          console.error('[DEBUG] InstructionConfirmationTab - API returned unsuccessful', result);
          message.error(result.error?.message || extractErrorMessage(null));
          setMethods([]);
          setTasks([]);
        } else {
          // success: true だがdata がない場合
          setMethods([]);
          setTasks([]);
        }
      } catch (error) {
        console.error('[DEBUG] InstructionConfirmationTab - Error fetching tasks', error);
        message.error(extractErrorMessage(error));
        setMethods([]);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkerTasks();
  }, [selectedProject]);

  // 選択されたメソッドに絞ったタスクをフィルタリング
  const filteredTasks = useMemo(() => {
    if (!selectedMethodId) return tasks;
    return tasks.filter(task => task.methodId === selectedMethodId);
  }, [tasks, selectedMethodId]);


  // タスクIDに絞った指示のみをフィルタリング
  const filteredInstructions = useMemo(() => {
    return sortedInstructions.filter((instruction) => {
      // 全体指示とトランジション単位指示はそのまま表示
      if (instruction.targetType === 'file' || instruction.targetType === 'transition') {
        return true;
      }
      // タスク単位指示の場合
      if (instruction.targetType === 'task') {
        // メソッド選択済みの場合、選択されたメソッドに属するタスクのみに限定
        if (selectedMethodId && instruction.methodId !== selectedMethodId) {
          return false;
        }
        // タスク未選択の場合（空文字列またはnew）は選択されたメソッドの全てのタスクの作業指示を表示
        if (!selectedTaskId || selectedTaskId === '' || selectedTaskId === 'new') {
          return true;
        }
        // タスク選択済みの場合、選択されたタスクに絞ったもののみ表示
        return instruction.taskId === selectedTaskId;
      }
      return false;
    });
  }, [sortedInstructions, selectedMethodId, selectedTaskId]);

  // 選択されたタスクに合わせた統計情報を再計算
  const filteredStats = useMemo(() => {
    const fileInstructions = filteredInstructions.filter((i) => i.targetType === 'file');
    const taskInstructions = filteredInstructions.filter((i) => i.targetType === 'task');
    const transitionInstructions = filteredInstructions.filter((i) => i.targetType === 'transition');
    const unreadInstructions = filteredInstructions.filter((i) => !i.isRead);

    return {
      total: filteredInstructions.length,
      file: fileInstructions.length,
      method: taskInstructions.length, // 後方互換性のためmethodキーを残してtaskInstructionsを使用
      transition: transitionInstructions.length,
      unread: unreadInstructions.length,
    };
  }, [filteredInstructions]);

  // フロー図ダイアログを開く（APIからMAIMLコンテンツを取得）
  const handleOpenFlowDiagram = async () => {
    if (!selectedProject) {
      message.warning(t('instructionConfirmation.noProject'));
      return;
    }

    setFlowDiagramLoading(true);
    try {
      console.log('[DEBUG] handleOpenFlowDiagram - MAIML取得開始', { selectedProject });

      const result = await getProjectMaiml(selectedProject);

      if (!result.success || !result.data?.maimlContent) {
        console.error('[DEBUG] handleOpenFlowDiagram - MAIML取得失敗', result);
        message.error(result.error?.message || extractErrorMessage(null));
        return;
      }

      const { maimlContent, projectName, lastModified } = result.data;

      console.log('[DEBUG] handleOpenFlowDiagram - MAIML取得成功', {
        projectName,
        contentLength: maimlContent.length,
        lastModified,
      });

      const fileData: FileData = {
        id: selectedProject,
        name: `${projectName}.maiml`,
        path: `projects/${projectName}/${projectName}.maiml`,
        size: maimlContent.length,
        lastModified: lastModified || new Date().toISOString(),
        type: 'maiml',
        content: maimlContent,
      };

      const newDialog = {
        id: `flow-diagram-${Date.now()}`,
        file: fileData,
        zIndex: nextZIndex,
      };

      setViewerDialogs([...viewerDialogs, newDialog]);
      setNextZIndex(nextZIndex + 1);
    } catch (error) {
      console.error('[DEBUG] handleOpenFlowDiagram - エラー', error);
      message.error(extractErrorMessage(error));
    } finally {
      setFlowDiagramLoading(false);
    }
  };

  // ダイアログを閉じる
  const handleCloseDialog = (id: string) => {
    setViewerDialogs(viewerDialogs.filter((d) => d.id !== id));
  };

  // ダイアログにフォーカス
  const handleFocusDialog = (id: string) => {
    const dialog = viewerDialogs.find((d) => d.id === id);
    if (dialog && dialog.zIndex !== nextZIndex - 1) {
      setViewerDialogs(
        viewerDialogs.map((d) =>
          d.id === id ? { ...d, zIndex: nextZIndex } : d
        )
      );
      setNextZIndex(nextZIndex + 1);
    }
  };

  // SubNetViewerを開く
  const handleOpenSubNetViewer = (data: SubnetData) => {
    setSubnetData(data);
  };

  // SubNetViewerを閉じる
  const handleCloseSubNetViewer = () => {
    setSubnetData(null);
  };

  /**
   * 指示を確認完了にする共通関数
   * @param instructions 確認完了にする指示一覧
   * @param groupName グループ名（メッセージ表示用）
   */
  const confirmInstructions = async (instructions: Instruction[], groupName: string) => {
    if (!selectedProject) {
      message.error(t('instructionConfirmation.noProject'));
      return;
    }

    if (instructions.length === 0) {
      message.warning(t('instructionConfirmation.noInstructionsToConfirm'));
      return;
    }

    setConfirmLoading(true);
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    try {
      // 各指示を順番にAPIを呼び出す
      for (const instruction of instructions) {
        try {
          const result = await confirmInstruction(
            selectedProject,
            instruction.instructionId
          );

          if (result.success) {
            successCount++;
          } else {
            failCount++;
            errors.push(
              `ID ${instruction.instructionId}: ${result.error?.message || 'unknown error'}`
            );
          }
        } catch (error) {
          failCount++;
          errors.push(`ID ${instruction.instructionId}: API call error`);
          console.error('confirm instruction error:', error);
        }
      }

      // 結果メッセージ表示
      if (failCount === 0) {
        message.success(`${groupName}${t('instructionConfirmation.confirmSuccess')}${successCount}${t('instructionConfirmation.confirmSuccessSuffix')}`);
      } else if (successCount === 0) {
        message.error(`${groupName}${t('instructionConfirmation.confirmFailed')}${failCount}${t('instructionConfirmation.confirmFailedSuffix')}`);
        if (errors.length > 0) {
          console.error('confirm failure details:', errors);
        }
      } else {
        message.warning(
          `${groupName}${t('instructionConfirmation.confirmPartialSuccess')}${successCount}${t('instructionConfirmation.confirmPartialFail')}${failCount}${t('instructionConfirmation.confirmPartialSuffix')}`
        );
        if (errors.length > 0) {
          console.error('confirm failure details:', errors);
        }
      }

      // 指示一覧を再取得
      if (successCount > 0) {
        await onInstructionsUpdated();
      }
    } catch (error) {
      console.error('指示確認処理エラー:', error);
      message.error(extractErrorMessage(error));
    } finally {
      setConfirmLoading(false);
    }
  };

  /**
   * プロジェクト指示グループの確認完了ハンドラ
   */
  const handleConfirmProjectInstructions = () => {
    // プロジェクト指示（targetType === 'file'）の未確認のみフィルタ
    const projectInstructions = filteredInstructions.filter(
      (i) => i.targetType === 'file' && !i.isAcknowledged
    );

    if (projectInstructions.length === 0) {
      message.info(t('instructionConfirmation.noProjectInstructions'));
      return;
    }

    // 確認ダイアログを表示
    Modal.confirm({
      title: t('instructionConfirmation.confirmProjectDialogTitle'),
      content: `${t('instructionConfirmation.confirmProjectDialogContent')}${projectInstructions.length}${t('instructionConfirmation.confirmProjectDialogContentSuffix')}`,
      okText: t('instructionConfirmation.okText'),
      cancelText: t('instructionConfirmation.cancelText'),
      onOk: async () => {
        await confirmInstructions(projectInstructions, t('instructionConfirmation.projectInstructionGroup'));
      },
    });
  };

  /**
   * タスク単位指示の確認完了ハンドラ
   */
  const handleConfirmTaskInstructions = (taskInstructions: Instruction[]) => {
    const unreadInstructions = taskInstructions.filter((i) => !i.isAcknowledged);
    
    if (unreadInstructions.length === 0) {
      message.info(t('instructionConfirmation.noInstructionsToConfirm'));
      return;
    }

    const taskName = taskInstructions[0]?.taskName || t('instructionConfirmation.taskInstructionGroup');
    
    // 確認ダイアログを表示
    Modal.confirm({
      title: t('instructionConfirmation.confirmComplete'),
      content: `${taskName}${t('instructionConfirmation.confirmDialogContentSuffix')}${unreadInstructions.length}${t('instructionConfirmation.confirmDialogCountSuffix')}`,
      okText: t('instructionConfirmation.okText'),
      cancelText: t('instructionConfirmation.cancelText'),
      onOk: async () => {
        await confirmInstructions(unreadInstructions, `${taskName}`);
      },
    });
  };

  /**
   * トランジション単位指示の確認完了ハンドラ
   */
  const handleConfirmTransitionInstructions = (transitionInstructions: Instruction[]) => {
    const unreadInstructions = transitionInstructions.filter((i) => !i.isAcknowledged);
    
    if (unreadInstructions.length === 0) {
      message.info(t('instructionConfirmation.noInstructionsToConfirm'));
      return;
    }

    const transitionName = transitionInstructions[0]?.transitionName || t('instructionConfirmation.transitionInstructionGroup');
    
    // 確認ダイアログを表示
    Modal.confirm({
      title: t('instructionConfirmation.confirmComplete'),
      content: `${transitionName}${t('instructionConfirmation.confirmDialogContentSuffix')}${unreadInstructions.length}${t('instructionConfirmation.confirmDialogCountSuffix')}`,
      okText: t('instructionConfirmation.okText'),
      cancelText: t('instructionConfirmation.cancelText'),
      onOk: async () => {
        await confirmInstructions(unreadInstructions, `${transitionName}`);
      },
    });
  };

  /**
   * 全ての指示の確認完了ハンドラ
   */
  const handleConfirmAllInstructions = () => {
    // 未確認の指示をフィルタ
    const unreadInstructions = filteredInstructions.filter((i) => !i.isAcknowledged);

    if (unreadInstructions.length === 0) {
      message.info(t('instructionConfirmation.noInstructionsToConfirm'));
      return;
    }

    // 確認ダイアログを表示
    Modal.confirm({
      title: t('instructionConfirmation.confirmAllDialogTitle'),
      content: `${t('instructionConfirmation.confirmAllDialogContent1')}${filteredStats.total}${t('instructionConfirmation.confirmAllDialogContent2')}${unreadInstructions.length}${t('instructionConfirmation.confirmAllDialogContent3')}`,
      okText: t('instructionConfirmation.okText'),
      cancelText: t('instructionConfirmation.cancelText'),
      onOk: async () => {
        await confirmInstructions(unreadInstructions, t('instructionConfirmation.confirmAllInstructions'));
      },
    });
  };

  return (
    <div data-testid="instruction-confirmation-tab" style={{ height: '100%', overflow: 'auto' }}>
      {!selectedProject ? (
        <Card
          data-testid="instruction-confirmation-empty-state"
          style={{
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          }}
        >
          <Space orientation="vertical" align="center" style={{ width: '100%', padding: `${token.marginXXL}px 0` }}>
            <FileTextOutlined style={{ fontSize: EMPTY_ICON_SIZE, color: token.colorTextDisabled }} />
            <Title level={3} type="secondary">
              <FileTextOutlined style={{ marginRight: token.marginXS }} />
              {t('menu.experiment_worker.tabs.workInstruction')}
            </Title>
            <Text type="secondary">
              {t('experimentWork.projectSelection.title')}
            </Text>
          </Space>
        </Card>
      ) : (
        <>
          {/* 選択メソッド・タスクエリアのコンポーネント使用*/}
          <MethodTaskSelector
            selectedProject={selectedProject}
            selectedMethodId={selectedMethodId}
            onSelectMethod={onSelectMethod}
            methods={methods}
            selectedTaskId={selectedTaskId}
            onSelectTask={onSelectTask}
            tasks={filteredTasks}
            onOpenModal={() => setIsModalVisible(true)}
            methodDisabled={!selectedProject || loading}
            taskDisabled={!selectedMethodId || loading}
          />

          {/* 作業指示サマリー */}
          <div style={{ marginBottom: 0 }}>
            <InstructionStats stats={filteredStats} />
          </div>

          {/* 指示詳細カード*/}
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileTextOutlined style={{ fontSize: 18, color: token.colorPrimary }} />
                  <span>{t('instructionConfirmation.instructionDetail')}</span>
                </div>
                <Button
                  data-testid="instruction-flow-diagram-button"
                  type="default"
                  icon={<NodeIndexOutlined />}
                  onClick={handleOpenFlowDiagram}
                  loading={flowDiagramLoading}
                  disabled={flowDiagramLoading || !selectedProject}
                  style={{
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {t('instructionConfirmation.flowDiagram')}
                </Button>
              </div>
            }
            style={{
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            }}
            styles={{
              body: {
                paddingTop: '8px',
                paddingBottom: '8px',
              },
            }}
          >
            {/* 全体指示グループ*/}
            <div style={{ marginBottom: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                {/* タイトル部分（クリック可能）*/}
                <div
                  data-testid="instruction-group-file-toggle"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    padding: token.marginXS,
                    cursor: 'pointer',
                    borderRadius: token.borderRadiusSM,
                  }}
                  onClick={() => toggleGroup('file')}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = token.colorBgSpotlight;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Title level={4} style={{ margin: 0 }}>
                    {expandedGroups['file'] ? <DownOutlined /> : <RightOutlined />}{' '}
                    <FileOutlined style={{ marginRight: token.marginXS }} />
                    {t('instructionConfirmation.projectInstructionGroup')} (
                    {filteredInstructions.filter((i) => i.targetType === 'file').length}
                    {t('instructionConfirmation.countSuffix')})
                  </Title>
                </div>
                
                {/* 確認完了ボタン（展開時のみ表示）*/}
                {expandedGroups['file'] && filteredInstructions.filter((i) => i.targetType === 'file').length > 0 && (
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmProjectInstructions();
                    }}
                    loading={confirmLoading}
                    disabled={
                      readOnly ||
                      !isTaskExecuting ||
                      confirmLoading || 
                      filteredInstructions
                        .filter((i) => i.targetType === 'file')
                        .every((i) => i.isAcknowledged)
                    }
                    style={{ 
                      backgroundColor: token.colorSuccess, 
                      borderColor: token.colorSuccess 
                    }}
                  >
                    {t('instructionConfirmation.confirmComplete')}
                  </Button>
                )}
              </div>
              {expandedGroups['file'] && (
                <div style={{ marginTop: token.margin }}>
                  <InstructionGroup
                    title={t('instructionConfirmation.projectInstructionGroup')}
                    emoji="file"
                    instructions={filteredInstructions.filter(
                      (i) => i.targetType === 'file'
                    )}
                    projectStatus={projectStatus}
                    isClient={isClient}
                  />
                </div>
              )}
            </div>

            {/* タスク単位指示グループ*/}
            <div style={{ marginBottom: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                {/* タイトル部分（クリック可能）*/}
                <div
                  data-testid="instruction-group-task-toggle"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    padding: token.marginXS,
                    cursor: 'pointer',
                    borderRadius: token.borderRadiusSM,
                  }}
                  onClick={() => toggleGroup('task')}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = token.colorBgSpotlight;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Title level={4} style={{ margin: 0 }}>
                    {expandedGroups['task'] ? <DownOutlined /> : <RightOutlined />}{' '}
                    <CheckSquareOutlined style={{ marginRight: token.marginXS }} />
                    {t('instructionConfirmation.taskInstructionGroup')} (
                    {filteredInstructions.filter((i) => i.targetType === 'task').length}
                    {t('instructionConfirmation.countSuffix')})
                  </Title>
                </div>

                {/* 確認完了ボタン（展開時のみ表示）*/}
                {expandedGroups['task'] && filteredInstructions.filter((i) => i.targetType === 'task').length > 0 && (
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmTaskInstructions(
                        filteredInstructions.filter((i) => i.targetType === 'task')
                      );
                    }}
                    loading={confirmLoading}
                    disabled={
                      readOnly ||
                      !isTaskExecuting ||
                      confirmLoading ||
                      filteredInstructions
                        .filter((i) => i.targetType === 'task')
                        .every((i) => i.isAcknowledged)
                    }
                    style={{
                      backgroundColor: token.colorSuccess,
                      borderColor: token.colorSuccess,
                    }}
                  >
                    {t('instructionConfirmation.confirmComplete')}
                  </Button>
                )}
              </div>
              {expandedGroups['task'] && (
                <div style={{ marginTop: token.margin }}>
                  <InstructionGroup
                    title={t('instructionConfirmation.taskInstructionGroup')}
                    emoji="checkSquare"
                    instructions={filteredInstructions.filter(
                      (i) => i.targetType === 'task'
                    )}
                    projectStatus={projectStatus}
                    isClient={isClient}
                    onConfirmInstructions={handleConfirmTaskInstructions}
                    confirmLoading={confirmLoading}
                    readOnly={readOnly || !isTaskExecuting}
                  />
                </div>
              )}
            </div>

            {/* トランジション単位指示グループ*/}
            <div style={{ marginBottom: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                {/* タイトル部分（クリック可能）*/}
                <div
                  data-testid="instruction-group-transition-toggle"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    padding: token.marginXS,
                    cursor: 'pointer',
                    borderRadius: token.borderRadiusSM,
                  }}
                  onClick={() => toggleGroup('transition')}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = token.colorBgSpotlight;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Title level={4} style={{ margin: 0 }}>
                    {expandedGroups['transition'] ? <DownOutlined /> : <RightOutlined />}{' '}
                    <AimOutlined style={{ marginRight: token.marginXS }} />
                    {t('instructionConfirmation.transitionInstructionGroup')} (
                    {filteredInstructions.filter((i) => i.targetType === 'transition').length}
                    {t('instructionConfirmation.countSuffix')})
                  </Title>
                </div>

                {/* 確認完了ボタン（展開時のみ表示）*/}
                {expandedGroups['transition'] && filteredInstructions.filter((i) => i.targetType === 'transition').length > 0 && (
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmTransitionInstructions(
                        filteredInstructions.filter((i) => i.targetType === 'transition')
                      );
                    }}
                    loading={confirmLoading}
                    disabled={
                      readOnly ||
                      !isTaskExecuting ||
                      confirmLoading ||
                      filteredInstructions
                        .filter((i) => i.targetType === 'transition')
                        .every((i) => i.isAcknowledged)
                    }
                    style={{
                      backgroundColor: token.colorSuccess,
                      borderColor: token.colorSuccess,
                    }}
                  >
                    {t('instructionConfirmation.confirmComplete')}
                  </Button>
                )}
              </div>
              {expandedGroups['transition'] && (
                <div style={{ marginTop: token.margin }}>
                  <InstructionGroup
                    title={t('instructionConfirmation.transitionInstructionGroup')}
                    emoji="aim"
                    instructions={filteredInstructions.filter(
                      (i) => i.targetType === 'transition'
                    )}
                    projectStatus={projectStatus}
                    isClient={isClient}
                    onConfirmInstructions={handleConfirmTransitionInstructions}
                    confirmLoading={confirmLoading}
                    readOnly={readOnly || !isTaskExecuting}
                  />
                </div>
              )}
            </div>

            {/* 全ての指示の確認完了ボタン */}
            <Divider style={{ margin: `${token.marginXL}px 0` }} />
            <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: token.marginLG }}>
              <Button
                data-testid="instruction-confirm-all-button"
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={handleConfirmAllInstructions}
                loading={confirmLoading}
                disabled={
                  readOnly ||
                  filteredStats.total === 0 || 
                  confirmLoading || 
                  filteredInstructions.every((i) => i.isAcknowledged)
                }
                style={{
                  minWidth: 300,
                  height: 48,
                  fontSize: 16,
                  fontWeight: 600,
                  backgroundColor: 
                    (readOnly ||
                     filteredStats.total === 0 || 
                     filteredInstructions.every((i) => i.isAcknowledged)) 
                      ? undefined 
                      : token.colorSuccess,
                  borderColor: 
                    (readOnly ||
                     filteredStats.total === 0 || 
                     filteredInstructions.every((i) => i.isAcknowledged)) 
                      ? undefined 
                      : token.colorSuccess,
                }}
               >
                {t('instructionConfirmation.confirmAllInstructions')}
              </Button>
            </div>
          </Card>

          {/* InstructionFlowDialog群 */}
          {viewerDialogs.map((dialog) => (
            <InstructionFlowDialog
              key={dialog.id}
              id={dialog.id}
              file={dialog.file}
              selectedMethodId={selectedMethodId}
              zIndex={dialog.zIndex}
              initialPosition={{ x: 100, y: 100 }}
              initialSize={{ width: 1200, height: 800 }}
              onClose={handleCloseDialog}
              onFocus={handleFocusDialog}
              onOpenSubNetViewer={handleOpenSubNetViewer}
            />
          ))}

          {/* SubNetViewer */}
          {subnetData && (
            <SubNetViewer
              open={true}
              nodeName={subnetData.transitionName}
              maimlData={subnetData.maimlData}
              templateMap={subnetData.templateMap}
              petriNetData={subnetData.petriNetData}
              onClose={handleCloseSubNetViewer}
            />
          )}

          {/* メソッド・タスク選択モーダル */}
          <MethodTaskSelectionModal
            open={isModalVisible}
            onClose={() => setIsModalVisible(false)}
            selectedProject={selectedProject}
            selectedMethodId={selectedMethodId}
            selectedTaskId={selectedTaskId}
            onSelect={(methodId: string, taskId: string) => {
              onSelectMethod(methodId);
              onSelectTask(taskId);
            }}
            methods={methods}
          />
        </>
      )}
    </div>
  );
}
