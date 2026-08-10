'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Card, Typography, Space, theme, Divider, Button, message, Modal } from 'antd';
import { FileTextOutlined, DownOutlined, RightOutlined, FileOutlined, AimOutlined, CheckCircleOutlined, NodeIndexOutlined, CheckSquareOutlined, BranchesOutlined } from '@ant-design/icons';
import MethodTaskSelectionModal from './MethodTaskSelectionModal';
import MethodTaskSelector from './MethodTaskSelector';
import InstructionStats from './InstructionStats';
import InstructionGroup from './InstructionGroup';
import InstructionFlowDialog from './InstructionFlowDialog';
import SubNetViewer from '@/components/viewer/dialogs/SubNetViewer';
import type { FileData, SubnetData } from '@/types/editor';
import { Stats, Instruction, ProjectStatus, isEditableStatus, Method, Task } from '@/types/experimentWorker';
import { ProjectStatus as ProjectStatusCode, TaskStatus, TASK_STATUS_STRING_TO_NUMBER } from '@/constants/codeMaster';
import { getWorkerTasks, confirmInstruction, getProjectMaiml } from '@/services/projectApiService';
import type { WorkerMethod, WorkerTask } from '@/types/project';
import { useLanguage } from '@/contexts/LanguageContext';
import { extractErrorMessage } from '@/utils/errorUtils';
import { mapErrorToMessage } from '@/utils/errorUtils';

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
  const isTaskExecuting = projectStatusCode === ProjectStatusCode.TASK_IN_PROGRESS;

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
              status: TASK_STATUS_STRING_TO_NUMBER[task.task_status] ?? TaskStatus.PENDING,
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
              status: TASK_STATUS_STRING_TO_NUMBER[task.task_status] ?? TaskStatus.PENDING,
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
          
          // 重複 taskId を排除（APIから同一 taskId が複数返された場合の重複表示を防止）
          const uniqueTasksMap = new Map<string, Task>();
          allTasks.forEach(task => uniqueTasksMap.set(task.taskId, task));
          const uniqueTasks = Array.from(uniqueTasksMap.values());

          console.log('[DEBUG] InstructionConfirmationTab - Converted data', {
            methodCount: methodsData.length,
            taskCount: allTasks.length,
            uniqueTaskCount: uniqueTasks.length
          });
          
          setMethods(methodsData);
          setTasks(uniqueTasks);
        } else if (!result.success) {
          console.error('[DEBUG] InstructionConfirmationTab - API returned unsuccessful', result);
          message.error(mapErrorToMessage(result.error?.code ?? '') || extractErrorMessage(null));
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
  // メソッド未選択時は空配列を返す（全メソッドのタスクが混在して重複表示されるのを防ぐ）
  const filteredTasks = useMemo(() => {
    if (!selectedMethodId) return [];
    return tasks.filter(task => task.methodId === selectedMethodId);
  }, [tasks, selectedMethodId]);


  // タスクIDに絞った指示のみをフィルタリング
  const filteredInstructions = useMemo(() => {
    return sortedInstructions.filter((instruction) => {
      // 全体指示（methodId も transitionId もない）はそのまま表示
      if (!instruction.methodId && !instruction.transitionId) {
        return true;
      }
      // トランジション単位指示（methodId あり・transitionId あり・taskId なし）
      if (!!instruction.methodId && !!instruction.transitionId && !instruction.taskId) {
        // メソッド指定あり かつ 選択メソッドと不一致 → 非表示
        if (selectedMethodId && instruction.methodId && instruction.methodId !== selectedMethodId) {
          return false;
        }
        // タスク指定あり かつ タスク未選択 → 全件表示
        if (!selectedTaskId || selectedTaskId === '' || selectedTaskId === 'new') return true;
        // タスク選択済み → 選択タスクと一致するもののみ表示
        return instruction.taskId === selectedTaskId;
      }
      // メソッド単位指示（methodId あり・transitionId なし）
      if (!!instruction.methodId && !instruction.transitionId) {
        // メソッド選択済みの場合、選択されたメソッドに属するものに限定
        if (selectedMethodId && instruction.methodId !== selectedMethodId) {
          return false;
        }
        return true;
      }
      // タスク単位指示（methodId あり・taskId あり、transitionId は問わない）
      if (!!instruction.methodId && !!instruction.taskId) {
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
    const fileInstructions = filteredInstructions.filter((i) => !i.methodId && !i.transitionId);
    const methodInstructions = filteredInstructions.filter((i) => !!i.methodId && !i.transitionId);
    const taskInstructions = filteredInstructions.filter((i) => !!i.methodId && !!i.taskId);
    const transitionInstructions = filteredInstructions.filter((i) => !!i.methodId && !!i.transitionId && !i.taskId);
    const unreadInstructions = filteredInstructions.filter((i) => !i.isRead);

    return {
      total: filteredInstructions.length,
      file: fileInstructions.length,
      method: methodInstructions.length,
      task: taskInstructions.length,
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
    // プロジェクト指示（methodId も transitionId もない）の未確認のみフィルタ
    const projectInstructions = filteredInstructions.filter(
      (i) => !i.methodId && !i.transitionId && !i.isAcknowledged
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
   * メソッド単位指示の確認完了ハンドラ
   */
  const handleConfirmMethodInstructions = () => {
    const methodInstructions = filteredInstructions.filter(
      (i) => !!i.methodId && !i.transitionId && !i.isAcknowledged
    );

    if (methodInstructions.length === 0) {
      message.info(t('instructionConfirmation.noInstructionsToConfirm'));
      return;
    }

    Modal.confirm({
      title: t('instructionConfirmation.confirmComplete'),
      content: `${t('instructionConfirmation.methodInstructionGroup')}${t('instructionConfirmation.confirmDialogContentSuffix')}${methodInstructions.length}${t('instructionConfirmation.confirmDialogCountSuffix')}`,
      okText: t('instructionConfirmation.okText'),
      cancelText: t('instructionConfirmation.cancelText'),
      onOk: async () => {
        await confirmInstructions(methodInstructions, t('instructionConfirmation.methodInstructionGroup'));
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
                    e.currentTarget.style.backgroundColor = token.colorFillSecondary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Title level={4} style={{ margin: 0 }}>
                    {expandedGroups['file'] ? <DownOutlined /> : <RightOutlined />}{' '}
                    <FileOutlined style={{ marginRight: token.marginXS }} />
                    {t('instructionConfirmation.projectInstructionGroup')} (
                    {filteredInstructions.filter((i) => !i.methodId && !i.transitionId).length}
                    {t('instructionConfirmation.countSuffix')})
                  </Title>
                </div>
                
                {/* 確認完了ボタン（展開時のみ表示）*/}
                {expandedGroups['file'] && filteredInstructions.filter((i) => !i.methodId && !i.transitionId).length > 0 && (
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
                        .filter((i) => !i.methodId && !i.transitionId)
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
                      (i) => !i.methodId && !i.transitionId
                    )}
                    projectStatus={projectStatus}
                    isClient={isClient}
                  />
                </div>
              )}
            </div>

            {/* メソッド単位指示グループ*/}
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
                  data-testid="instruction-group-method-toggle"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    padding: token.marginXS,
                    cursor: 'pointer',
                    borderRadius: token.borderRadiusSM,
                  }}
                  onClick={() => toggleGroup('method')}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = token.colorFillSecondary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Title level={4} style={{ margin: 0 }}>
                    {expandedGroups['method'] ? <DownOutlined /> : <RightOutlined />}{' '}
                    <BranchesOutlined style={{ marginRight: token.marginXS }} />
                    {t('instructionConfirmation.methodInstructionGroup')} (
                    {filteredInstructions.filter((i) => !!i.methodId && !i.transitionId).length}
                    {t('instructionConfirmation.countSuffix')})
                  </Title>
                </div>

                {/* 確認完了ボタン（展開時のみ表示）*/}
                {expandedGroups['method'] && filteredInstructions.filter((i) => !!i.methodId && !i.transitionId).length > 0 && (
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmMethodInstructions();
                    }}
                    loading={confirmLoading}
                    disabled={
                      readOnly ||
                      !isTaskExecuting ||
                      confirmLoading ||
                      filteredInstructions
                        .filter((i) => !!i.methodId && !i.transitionId)
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
              {expandedGroups['method'] && (
                <div style={{ marginTop: token.margin }}>
                  <InstructionGroup
                    title={t('instructionConfirmation.methodInstructionGroup')}
                    emoji="branches"
                    instructions={filteredInstructions.filter(
                      (i) => !!i.methodId && !i.transitionId
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
                    e.currentTarget.style.backgroundColor = token.colorFillSecondary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Title level={4} style={{ margin: 0 }}>
                    {expandedGroups['task'] ? <DownOutlined /> : <RightOutlined />}{' '}
                    <CheckSquareOutlined style={{ marginRight: token.marginXS }} />
                    {t('instructionConfirmation.taskInstructionGroup')} (
                    {filteredInstructions.filter((i) => !!i.methodId && !!i.taskId).length}
                    {t('instructionConfirmation.countSuffix')})
                  </Title>
                </div>

                {/* 確認完了ボタン（展開時のみ表示）*/}
                {expandedGroups['task'] && filteredInstructions.filter((i) => !!i.methodId && !!i.taskId).length > 0 && (
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmTaskInstructions(
                        filteredInstructions.filter((i) => !!i.methodId && !!i.taskId)
                      );
                    }}
                    loading={confirmLoading}
                    disabled={
                      readOnly ||
                      !isTaskExecuting ||
                      confirmLoading ||
                      filteredInstructions
                        .filter((i) => !!i.methodId && !!i.taskId)
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
                      (i) => !!i.methodId && !!i.taskId
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
                    e.currentTarget.style.backgroundColor = token.colorFillSecondary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Title level={4} style={{ margin: 0 }}>
                    {expandedGroups['transition'] ? <DownOutlined /> : <RightOutlined />}{' '}
                    <AimOutlined style={{ marginRight: token.marginXS }} />
                    {t('instructionConfirmation.transitionInstructionGroup')} (
                    {filteredInstructions.filter((i) => !!i.methodId && !!i.transitionId && !i.taskId).length}
                    {t('instructionConfirmation.countSuffix')})
                  </Title>
                </div>

                {/* 確認完了ボタン（展開時のみ表示）*/}
                {expandedGroups['transition'] && filteredInstructions.filter((i) => !!i.methodId && !!i.transitionId && !i.taskId).length > 0 && (
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmTransitionInstructions(
                        filteredInstructions.filter((i) => !!i.methodId && !!i.transitionId && !i.taskId)
                      );
                    }}
                    loading={confirmLoading}
                    disabled={
                      readOnly ||
                      !isTaskExecuting ||
                      confirmLoading ||
                      filteredInstructions
                        .filter((i) => !!i.methodId && !!i.transitionId && !i.taskId)
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
                      (i) => !!i.methodId && !!i.transitionId && !i.taskId
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
                  !isTaskExecuting ||
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
                     !isTaskExecuting ||
                     filteredStats.total === 0 || 
                     filteredInstructions.every((i) => i.isAcknowledged)) 
                      ? undefined 
                      : token.colorSuccess,
                  borderColor: 
                    (readOnly ||
                     !isTaskExecuting ||
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
