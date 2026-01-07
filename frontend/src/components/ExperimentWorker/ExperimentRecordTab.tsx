'use client';

import React, { useState } from 'react';
import { Card, Space, Typography, theme, Button, Empty } from 'antd';
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
import { projectsData, getIssuesByTransitionId } from '@/data/projectsData';
import { Method, ProjectStatus, Transition, Issue, IssueReportFormData } from '@/types/experimentWorker';

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

  // 選択中のプロジェクト情報を取得
  const selectedProjectData = selectedProject ? projectsData[selectedProject] : null;
  
  // プロジェクトの状態を取得
  const projectStatus: ProjectStatus | null = selectedProjectData?.status ?? null;
  
  // プロジェクトの状態が記録可能かどうか
  // waiting_approval（承認待ち）とwaiting_task（タスク待ち）は記録不可
  const isProjectRecordable = projectStatus 
    ? ['active', 'in_progress', 'executing_task'].includes(projectStatus) 
    : true;

  // 記録ボタンクリックハンドラ
  const handleRecordClick = (transition: Transition) => {
    setSelectedTransition(transition);
    setDataRecordModalOpen(true);
  };
  
  // 問題報告ボタンクリックハンドラ
  const handleIssueClick = (transition: Transition) => {
    setSelectedTransition(transition);
    const transitionIssues = getIssuesByTransitionId(transition.transitionId);
    setIssues(transitionIssues);
    setIssueModalOpen(true);
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

  // データ保存ハンドラ
  const handleDataSave = (data: unknown) => {
    console.log('保存されたデータ:', data);
    // TODO: バックエンドAPIへの保存処理を実装
    setDataRecordModalOpen(false);
    setSelectedTransition(null);
  };
  
  // 新規問題報告送信ハンドラ
  const handleSubmitIssue = (issue: IssueReportFormData) => {
    console.log('新規問題報告:', issue);
    // TODO: バックエンドAPIへの送信処理を実装
  };
  
  // コメント送信ハンドラ
  const handleSubmitComment = (issueId: string, comment: string) => {
    console.log('コメント投稿:', { issueId, comment });
    // TODO: バックエンドAPIへの送信処理を実装
  };

  // タスクデータ: 選択されたプロジェクトとメソッドに紐づくタスクを取得
  const tasks = selectedProject && selectedMethod
    ? selectedMethod.tasks || []
    : [];

  // 進捗データをトランジションにマージ
  const transitionsWithProgress = React.useMemo(() => {
    if (!selectedMethod || !selectedTaskId || !selectedProjectData?.progressData) {
      return selectedMethod?.transitions || [];
    }

    // 選択されたタスク名を取得
    const selectedTask = tasks.find(t => t.taskId === selectedTaskId);
    const selectedTaskName = selectedTask?.taskName;

    return selectedMethod.transitions.map(transition => {
      // 該当するトランジションの進捗データを検索
      const progress = selectedProjectData.progressData?.find(
        p => p.transitionId === transition.transitionId && 
             p.taskName === selectedTaskName
      );
      
      if (progress) {
        // 進捗データが見つかった場合、マージする
        return {
          ...transition,
          status: progress.status,
          progressRate: progress.progressRate,
          inputMaterialsCount: progress.inputMaterialsCount || 0,
          inputIngredientsCount: progress.inputIngredientsCount || 0,
          inputResultsCount: progress.inputResultsCount || 0
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
  }, [selectedMethod, selectedTaskId, selectedProjectData, tasks]);

  // Selectコンポーネント用のオプションを生成
  const taskOptions = [
    { label: '-', value: '' }, // 未選択状態を表す
    ...tasks.map((task) => ({
      label: task.taskName,
      value: task.taskId,
    })),
  ];

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
        methods={selectedProjectData?.methods || []}
        selectedTaskId={selectedTaskId}
        onSelectTask={onSelectTask}
        tasks={tasks}
        onOpenModal={() => setModalOpen(true)}
        methodDisabled={!selectedProject}
        taskDisabled={!selectedMethod}
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
      />

      {/* データ記録モーダル */}
      <DataRecordDialog
        open={dataRecordModalOpen}
        transition={selectedTransition}
        projectStatus={projectStatus}
        onClose={handleDataRecordModalClose}
        onSave={handleDataSave}
        projectId={selectedProject}
        methodId={selectedMethodId || undefined}
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
      />
    </div>
  );
}
