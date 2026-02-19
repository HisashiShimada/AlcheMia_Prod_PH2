'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Card, Typography, Space, theme, Divider, Button, message } from 'antd';
import { FileTextOutlined, DownOutlined, RightOutlined, FileOutlined, AimOutlined, CheckCircleOutlined, NodeIndexOutlined, CheckSquareOutlined } from '@ant-design/icons';
import MethodTaskSelectionModal from './MethodTaskSelectionModal';
import MethodTaskSelector from './MethodTaskSelector';
import InstructionStats from './InstructionStats';
import InstructionGroup from './InstructionGroup';
import InstructionFlowDialog from './InstructionFlowDialog';
import SubNetViewer from '@/components/viewer/dialogs/SubNetViewer';
import type { FileData, SubnetData } from './InstructionFlowDialog';
import { Stats, Instruction, ProjectStatus, isEditableStatus, Method, Task } from '@/types/experimentWorker';
import { getWorkerTasks } from '@/api/projectApiService';
import type { WorkerMethod, WorkerTask } from '@/api/projectApiService';

const { Title, Text } = Typography;

/**
 * 空状態アイコンのサイズ（UIポリシー準拠）
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
}


/**
 * 指示確認タブのコンテンツ
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
}: InstructionConfirmationTabProps) {
  // テーマトークンを取得（UIポリシー準拠）
  const { token } = theme.useToken();

  // API連携の状態管理
  const [loading, setLoading] = useState<boolean>(false);
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
  
  // SubNetViewerの管理
  const [subnetData, setSubnetData] = useState<SubnetData | null>(null);
  
  // メソッド・タスク選択モーダルの表示状態
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  // プロジェクトの状態を取得（暫定: APIから取得できるまでnull）
  const projectStatus: ProjectStatus | null = null;

  // プロジェクト選択時にAPI呼び出し
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
        console.log('[DEBUG] InstructionConfirmationTab - Fetching worker tasks', { selectedProject });
        
        const result = await getWorkerTasks(selectedProject);
        
        if (result.success && result.data) {
          const apiData = result.data;
          
          console.log('[DEBUG] InstructionConfirmationTab - API response', {
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
              taskNo: task.task_no,
              taskName: task.task_no.toString(),
              methodId: method.method_id,
              methodName: method.method_name,
              status: task.status as Task['status'],
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
        } else {
          console.error('[DEBUG] InstructionConfirmationTab - API returned unsuccessful', result);
          message.error('タスク一覧の取得に失敗しました');
          setMethods([]);
          setTasks([]);
        }
      } catch (error) {
        console.error('[DEBUG] InstructionConfirmationTab - Error fetching tasks', error);
        message.error('タスク一覧の取得中にエラーが発生しました');
        setMethods([]);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkerTasks();
  }, [selectedProject]);

  // 選択されたメソッドに紐づくタスクをフィルタリング
  const filteredTasks = useMemo(() => {
    if (!selectedMethodId) return tasks;
    return tasks.filter(task => task.methodId === selectedMethodId);
  }, [tasks, selectedMethodId]);


  // タスクIDに紐づく指示のみをフィルタリング
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
        // タスク未選択の場合（空文字列または'new'）は選択されたメソッドの全てのタスクの作業指示を表示
        if (!selectedTaskId || selectedTaskId === '' || selectedTaskId === 'new') {
          return true;
        }
        // タスク選択済みの場合は選択されたタスクに紐づくもののみ表示
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
      method: taskInstructions.length, // 後方互換性のためmethodキーを残すがtaskInstructionsを使用
      transition: transitionInstructions.length,
      unread: unreadInstructions.length,
    };
  }, [filteredInstructions]);

  // フロー図ダイアログを開く
  const handleOpenFlowDiagram = () => {
    const fileData: FileData = {
      id: 'test_omori11',
      name: 'test_omori11.maiml',
      path: '/data/mock/test_omori11.maiml',
      size: 0,
      lastModified: new Date().toISOString(),
      type: 'maiml',
    };

    const newDialog = {
      id: `flow-diagram-${Date.now()}`,
      file: fileData,
      zIndex: nextZIndex,
    };

    setViewerDialogs([...viewerDialogs, newDialog]);
    setNextZIndex(nextZIndex + 1);
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

  // 全ての指示の確認完了ハンドラ
  const handleConfirmAllInstructions = () => {
    // 未読の指示数を確認（フィルタ済みの統計を使用）
    const unreadCount = filteredStats.unread;
    
    if (unreadCount === 0) {
      alert('全ての指示は既に確認済みです');
      return;
    }
    
    // モック実装：実際にはAPIを呼び出して全指示を確認済みに更新
    const confirmed = window.confirm(
      `全ての指示（${filteredStats.total}件中${unreadCount}件未読）を確認完了にしますか？`
    );
    
    if (confirmed) {
      alert(`全ての指示の確認完了処理を実行しました（モック）`);
      // TODO: 実際のAPI実装時には、ここで全指示を確認済みにする処理を呼び出す
    }
  };

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      {!selectedProject ? (
        <Card
          style={{
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          }}
        >
          <Space direction="vertical" align="center" style={{ width: '100%', padding: `${token.marginXXL}px 0` }}>
            <FileTextOutlined style={{ fontSize: EMPTY_ICON_SIZE, color: token.colorTextDisabled }} />
            <Title level={3} type="secondary">
              <FileTextOutlined style={{ marginRight: token.marginXS }} />
              指示確認
            </Title>
            <Text type="secondary">
              プロジェクトを選択してください
            </Text>
          </Space>
        </Card>
      ) : (
        <>
          {/* 選択メソッド・タスクエリア（共通コンポーネント使用） */}
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

          {/* 指示詳細カード */}
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileTextOutlined style={{ fontSize: 18, color: token.colorPrimary }} />
                  <span>指示詳細</span>
                </div>
                <Button
                  type="default"
                  icon={<NodeIndexOutlined />}
                  onClick={handleOpenFlowDiagram}
                  style={{
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  フロー図
                </Button>
              </div>
            }
            style={{
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            }}
            bodyStyle={{
              paddingTop: '8px',
              paddingBottom: '8px',
            }}
          >
            {/* 全体指示グループ */}
            <div style={{ marginBottom: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                {/* タイトル部分（クリック可能） */}
                <div
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
                    プロジェクト指示 (
                    {filteredInstructions.filter((i) => i.targetType === 'file').length}
                    件)
                  </Title>
                </div>
                
                {/* 確認完了ボタン（展開時のみ表示） */}
                {expandedGroups['file'] && filteredInstructions.filter((i) => i.targetType === 'file').length > 0 && (
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      alert('全体指示の確認完了（モック）');
                    }}
                    style={{ 
                      backgroundColor: token.colorSuccess, 
                      borderColor: token.colorSuccess 
                    }}
                  >
                    確認完了
                  </Button>
                )}
              </div>
              {expandedGroups['file'] && (
                <div style={{ marginTop: token.margin }}>
                  <InstructionGroup
                    title="プロジェクト指示"
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

            {/* タスク単位指示グループ */}
            <div style={{ marginBottom: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
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
                  タスク指示 (
                  {
                    filteredInstructions.filter((i) => i.targetType === 'task')
                      .length
                  }
                  件)
                </Title>
              </div>
              {expandedGroups['task'] && (
                <div style={{ marginTop: token.margin }}>
                  <InstructionGroup
                    title="タスク指示"
                    emoji="checkSquare"
                    instructions={filteredInstructions.filter(
                      (i) => i.targetType === 'task'
                    )}
                    projectStatus={projectStatus}
                    isClient={isClient}
                  />
                </div>
              )}
            </div>

            {/* トランジション単位指示グループ */}
            <div style={{ marginBottom: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
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
                  トランジション指示 (
                  {
                    filteredInstructions.filter(
                      (i) => i.targetType === 'transition'
                    ).length
                  }
                  件)
                </Title>
              </div>
              {expandedGroups['transition'] && (
                <div style={{ marginTop: token.margin }}>
                  <InstructionGroup
                    title="トランジション単位指示"
                    emoji="aim"
                    instructions={filteredInstructions.filter(
                      (i) => i.targetType === 'transition'
                    )}
                    projectStatus={projectStatus}
                    isClient={isClient}
                  />
                </div>
              )}
            </div>

            {/* 全ての指示の確認完了ボタン */}
            <Divider style={{ margin: `${token.marginXL}px 0` }} />
            <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: token.marginLG }}>
              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={handleConfirmAllInstructions}
                disabled={filteredStats.total === 0}
                style={{
                  minWidth: 300,
                  height: 48,
                  fontSize: 16,
                  fontWeight: 600,
                  backgroundColor: filteredStats.total === 0 ? undefined : token.colorSuccess,
                  borderColor: filteredStats.total === 0 ? undefined : token.colorSuccess,
                }}
              >
                全ての指示の確認完了
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
          />
        </>
      )}
    </div>
  );
}
