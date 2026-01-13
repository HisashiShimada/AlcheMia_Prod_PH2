'use client';

import React, { useMemo, useState } from 'react';
import { Card, Typography, Space, theme, Divider, Button } from 'antd';
import { FileTextOutlined, DownOutlined, RightOutlined, FileOutlined, AimOutlined, CheckCircleOutlined, NodeIndexOutlined, CheckSquareOutlined } from '@ant-design/icons';
import MethodTaskSelectionModal from './MethodTaskSelectionModal';
import MethodTaskSelector from './MethodTaskSelector';
import InstructionStats from './InstructionStats';
import InstructionGroup from './InstructionGroup';
import FlowDiagramModal from './FlowDiagramModal';
import { Stats, Instruction, ProjectStatus, isEditableStatus } from '@/types/experimentWorker';
import { projectsData } from '@/data/projectsData';

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

// プロジェクトの状態を取得するヘルパー関数
function getProjectStatus(projectId: string): ProjectStatus | null {
  return projectsData[projectId]?.status ?? null;
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

  // フロー図モーダルの表示状態
  const [isFlowDiagramModalVisible, setIsFlowDiagramModalVisible] = useState(false);
  
  // メソッド・タスク選択モーダルの表示状態
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  // プロジェクトの状態を取得
  const projectStatus: ProjectStatus | null = selectedProject 
    ? getProjectStatus(selectedProject)
    : null;

  // 選択されたプロジェクト・メソッドの情報を取得
  const projectInfo = useMemo(() => {
    if (!selectedProject) return null;
    return projectsData[selectedProject];
  }, [selectedProject]);

  const methodInfo = useMemo(() => {
    if (!selectedMethodId || !projectInfo) return null;
    return projectInfo.methods?.find((m) => m.methodId === selectedMethodId);
  }, [selectedMethodId, projectInfo]);

  // タスクデータ: 選択されたプロジェクトとメソッドに紐づくタスクを取得
  const tasks = selectedProject && methodInfo
    ? methodInfo.tasks || []
    : [];

  // Selectコンポーネント用のオプションを生成
  const taskOptions = [
    { label: '-', value: '' },
    ...tasks.map((task) => ({
      label: task.taskName,
      value: task.taskId,
    })),
  ];

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

  // フロー図モーダルを開く
  const handleOpenFlowDiagram = () => {
    setIsFlowDiagramModalVisible(true);
  };

  // フロー図モーダルを閉じる
  const handleCloseFlowDiagram = () => {
    setIsFlowDiagramModalVisible(false);
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
            methods={projectInfo?.methods || []}
            selectedTaskId={selectedTaskId}
            onSelectTask={onSelectTask}
            tasks={tasks}
            onOpenModal={() => setIsModalVisible(true)}
            methodDisabled={!selectedProject}
            taskDisabled={!methodInfo}
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

          {/* フロー図モーダル */}
          <FlowDiagramModal
            visible={isFlowDiagramModalVisible}
            onClose={handleCloseFlowDiagram}
            projectName={projectInfo?.projectName}
            methodName={methodInfo?.methodName}
          />

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
