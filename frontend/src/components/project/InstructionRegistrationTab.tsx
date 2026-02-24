/**
 * InstructionRegistrationTab.tsx
 * 指示登録タブコンポーネント（一覧表示）
 * 指示の一覧表示と管理を行うコンポーネント
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Button,
  Table,
  Space,
  Tag,
  Typography,
  message,
  theme,
  Tooltip,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SendOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import InstructionEditDialog from './InstructionEditDialog';
import type {
  InstructionData,
  TransitionInfo,
  InstructionRegistrationData,
} from '@/types/instructionRegistration';
import type { TaskDetail, MethodInfo } from '@/types/taskRegistration';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getTaskRegistrationStatus,
  sendInstructions,
  getInstructions,
  saveInstruction,
  updateInstruction,
  deleteInstruction,
} from '@/services/projectApiService';
import type { TaskInput } from '@/types/api';

const { Text } = Typography;
const { useToken } = theme;

/**
 * 指示登録タブのプロパティ
 */
interface InstructionRegistrationTabProps {
  projectId: string;
  projectName: string;
  tasks: TaskDetail[];
  onInstructionsSubmit?: (instructions: InstructionData[]) => void;
}

/**
 * 指示登録タブコンポーネント
 */
const InstructionRegistrationTab: React.FC<InstructionRegistrationTabProps> = ({
  projectId,
  projectName,
  tasks,
  onInstructionsSubmit,
}) => {
  const { token } = useToken();
  const { t } = useLanguage();

  // 状態管理
  const [instructions, setInstructions] = useState<InstructionData[]>([]);
  const [availableMethods, setAvailableMethods] = useState<MethodInfo[]>([]);
  const [availableTransitions, setAvailableTransitions] = useState<TransitionInfo[]>([]);
  const [loadingTransitions, setLoadingTransitions] = useState<boolean>(false);
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');
  const [editingInstruction, setEditingInstruction] = useState<InstructionData | undefined>(undefined);
  const [isSending, setIsSending] = useState<boolean>(false);

  /**
   * 初期表示時に指示一覧を取得
   */
  useEffect(() => {
    const fetchInstructions = async () => {
      if (!projectName) return;

      try {
        const instructionList = await getInstructions(projectName);
        setInstructions(instructionList);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : '指示一覧の取得に失敗しました';
        message.error(errorMessage);
      }
    };

    fetchInstructions();
  }, [projectName]);

  /**
   * MAIMLファイルからメソッド情報とトランジション情報を取得
   */
  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) return;

      setLoadingTransitions(true);

      try {
        // TODO: 実際のAPI実装時に置き換え
        await new Promise((resolve) => setTimeout(resolve, 500));

        // モックのメソッド情報
        const mockMethods: MethodInfo[] = [
          {
            id: 'method_001',
            name: 'sample_preparation',
            displayName: 'サンプル準備',
            description: '実験サンプルの準備プロセス',
          },
          {
            id: 'method_002',
            name: 'measurement',
            displayName: '測定実行',
            description: '測定機器による測定プロセス',
          },
          {
            id: 'method_003',
            name: 'data_analysis',
            displayName: 'データ分析',
            description: 'データの分析プロセス',
          },
        ];

        // モックのトランジション情報
        const mockTransitions: TransitionInfo[] = [
          {
            id: 'transition_001',
            displayName: 'サンプル準備',
            category: 'preparation',
            description: '実験サンプルの準備プロセス',
            isExperimentRelevant: true,
          },
          {
            id: 'transition_002',
            displayName: '測定実行',
            category: 'measurement',
            description: '測定機器による測定プロセス',
            isExperimentRelevant: true,
          },
          {
            id: 'transition_003',
            displayName: 'データ分析',
            category: 'analysis',
            description: 'データの分析プロセス',
            isExperimentRelevant: true,
          },
        ];

        setAvailableMethods(mockMethods);
        setAvailableTransitions(mockTransitions);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'データ取得エラー';
        message.error(errorMessage);
      } finally {
        setLoadingTransitions(false);
      }
    };

    fetchData();
  }, [projectId, t]);

  /**
   * 新規指示追加ダイアログを開く
   */
  const handleOpenCreateDialog = useCallback(() => {
    setEditMode('create');
    setEditingInstruction(undefined);
    setEditDialogOpen(true);
  }, []);

  /**
   * 指示編集ダイアログを開く
   */
  const handleOpenEditDialog = useCallback((instruction: InstructionData) => {
    setEditMode('edit');
    setEditingInstruction(instruction);
    setEditDialogOpen(true);
  }, []);

  /**
   * ダイアログを閉じる
   */
  const handleCloseDialog = useCallback(() => {
    setEditDialogOpen(false);
    setEditingInstruction(undefined);
  }, []);

  /**
   * 指示を保存
   */
  const handleSaveInstruction = useCallback(async (instruction: InstructionData, keepDialogOpen: boolean = false) => {
    try {
      if (editMode === 'create') {
        // 新規作成：API呼び出し
        const result = await saveInstruction(projectName, {
          methodId: instruction.methodId,
          transitionId: instruction.transitionId || null,
          taskNumber: instruction.taskNumber,
          priority: instruction.priority,
          type: instruction.type,
          content: instruction.content,
        });
        
        // APIから返されたIDで新しい指示を追加
        const newInstruction: InstructionData = {
          ...instruction,
          id: result.instructionId,
          isSent: false,
        };
        
        setInstructions((prev) => [...prev, newInstruction]);
        message.success(t('instructionRegistration.messages.added'));
      } else {
        // 編集：API呼び出し
        await updateInstruction(projectName, String(instruction.id), {
          methodId: instruction.methodId,
          transitionId: instruction.transitionId || null,
          taskNumber: instruction.taskNumber,
          priority: instruction.priority,
          type: instruction.type,
          content: instruction.content,
        });
        
        // ローカル状態を更新
        setInstructions((prev) =>
          prev.map((inst) => (inst.id === instruction.id ? instruction : inst))
        );
        message.success(t('instructionRegistration.messages.updated'));
      }

      // 連続指示の場合はダイアログを閉じない
      if (!keepDialogOpen) {
        handleCloseDialog();
      } else {
        // 連続指示モード：新規作成モードに切り替え
        setEditMode('create');
        setEditingInstruction(undefined);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '指示の保存に失敗しました';
      message.error(errorMessage);
    }
  }, [editMode, projectName, handleCloseDialog, t]);

  /**
   * 指示を削除
   */
  const handleDeleteInstruction = useCallback(async (id: string | number) => {
    try {
      // API呼び出し
      const result = await deleteInstruction(projectName, String(id));
      
      if (result.deleted) {
        // ローカル状態を更新
        setInstructions((prev) => prev.filter((inst) => inst.id !== id));
        message.success('指示を削除しました');
      } else {
        message.error('指示の削除に失敗しました（送信済の可能性があります）');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '指示の削除に失敗しました';
      message.error(errorMessage);
    }
  }, [projectName]);

  /**
   * 指示を一括送信
   */
  const handleSubmitInstructions = useCallback(async () => {
    if (instructions.length === 0) {
      message.warning(t('instructionRegistration.messages.noInstructions'));
      return;
    }

    if (tasks.length === 0) {
      message.error('タスクが登録されていません。タスク登録タブでタスクを登録してください。');
      return;
    }

    try {
      setIsSending(true);

      // タスク登録情報をTaskInput形式に変換
      const taskInputs: TaskInput[] = tasks.map(task => ({
        methodId: task.methodId,
        experimentOrder: task.experimentOrder,
        experimentCondition: task.experimentCondition,
        attemptsCount: task.trialCount, // TaskDetailのtrialCountをattemptsCountにマッピング
      }));

      // 指示を一括送信
      const result = await sendInstructions(projectName, {
        tasks: taskInputs,
      });

      // 送信済フラグを立てる
      const sentInstructions = instructions.map(inst => ({
        ...inst,
        isSent: true,
      }));

      // 親コンポーネントに通知
      onInstructionsSubmit?.(sentInstructions);

      message.success(
        `${result.sentInstructionsCount}件の指示を送信し、${result.createdTasksCount}件のタスクを作成しました`
      );

      // 送信後、送信済フラグを立てて表示を継続
      setInstructions(sentInstructions);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '指示送信エラー';
      message.error(errorMessage);
    } finally {
      setIsSending(false);
    }
  }, [instructions, tasks, projectName, onInstructionsSubmit, t]);

  /**
   * 優先度のタグカラー（code_valueベース）
   */
  const getPriorityColor = (priority: number): string => {
    switch (priority) {
      case 3: // 高
        return 'red';
      case 2: // 中
        return 'orange';
      case 1: // 通常
        return 'blue';
      case 0: // 低
        return 'default';
      default:
        return 'default';
    }
  };

  /**
   * 優先度のラベル（code_value → code_name）
   */
  const PRIORITY_LABELS: Record<number, string> = {
    0: '低',
    1: '通常',
    2: '中',
    3: '高',
  };

  const getPriorityLabel = useCallback((priority: number): string => {
    return PRIORITY_LABELS[priority] || String(priority);
  }, []);

  /**
   * タイプのラベル（code_value → code_name）
   */
  const TYPE_LABELS: Record<number, string> = {
    0: '一般',
    1: 'セットアップ',
    2: '測定',
    3: '安全',
    4: '清掃',
  };

  const getTypeLabel = useCallback((type: number): string => {
    return TYPE_LABELS[type] || String(type);
  }, []);

  /**
   * 指示対象のラベル
   */
  const getTargetLabel = useCallback((instruction: InstructionData): string => {
    const method = availableMethods.find(m => m.id === instruction.methodId);
    
    if (instruction.transitionId) {
      const transition = availableTransitions.find(t => t.id === instruction.transitionId);
      return `${method?.displayName || 'メソッド'} > ${transition?.displayName || 'トランジション'}`;
    } else if (instruction.taskNumber !== undefined) {
      return `${method?.displayName || 'メソッド'} > タスク ${instruction.taskNumber}`;
    } else if (instruction.methodId) {
      return method?.displayName || 'メソッド';
    } else {
      return 'ファイル全体';
    }
  }, [availableMethods, availableTransitions]);

  /**
   * テーブルのカラム定義
   */
  const columns: ColumnsType<InstructionData> = [
    {
      title: t('instructionRegistration.columns.target'),
      dataIndex: 'targetType',
      key: 'target',
      width: 200,
      render: (_, record) => (
        <Text>{getTargetLabel(record)}</Text>
      ),
    },
    {
      title: t('instructionRegistration.columns.priority'),
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: number) => (
        <Tag color={getPriorityColor(priority)}>{getPriorityLabel(priority)}</Tag>
      ),
    },
    {
      title: t('instructionRegistration.columns.type'),
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: number) => <Text>{getTypeLabel(type)}</Text>,
    },
    {
      title: t('instructionRegistration.columns.content'),
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (content: string) => (
        <Tooltip title={content}>
          <Text ellipsis>{content}</Text>
        </Tooltip>
      ),
    },
    {
      title: t('instructionRegistration.columns.action'),
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          {record.isSent ? (
            // 送信済：詳細ボタンのみ
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleOpenEditDialog(record)}
            >
              {t('instructionRegistration.detailButton')}
            </Button>
          ) : (
            // 未送信：編集・削除ボタン
            <>
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleOpenEditDialog(record)}
                disabled={isSending}
              >
                {t('instructionRegistration.editButton')}
              </Button>
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteInstruction(record.id)}
                disabled={isSending}
              >
                {t('instructionRegistration.deleteButton')}
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ツールバー */}
      <div style={{ marginBottom: token.marginMD, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `0 ${token.paddingLG}px` }}>
        <Text type="secondary">{t('instructionRegistration.listTitle').replace('{count}', instructions.length.toString())}</Text>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreateDialog}
            disabled={loadingTransitions || isSending}
          >
            {t('instructionRegistration.addButton')}
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSubmitInstructions}
            disabled={instructions.length === 0 || isSending}
            loading={isSending}
            style={{
              backgroundColor: instructions.length > 0 ? token.colorSuccess : undefined,
              borderColor: instructions.length > 0 ? token.colorSuccess : undefined,
            }}
          >
            {t('instructionRegistration.sendButton')}
          </Button>
        </Space>
      </div>

      {/* 指示一覧テーブル */}
      <Table
        columns={columns}
        dataSource={instructions}
        rowKey="id"
        size="small"
        pagination={false}
        loading={loadingTransitions}
        locale={{
          emptyText: (
            <Empty
              description={t('instructionRegistration.emptyState')}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ),
        }}
      />

      {/* 指示編集ダイアログ */}
      <InstructionEditDialog
        open={editDialogOpen}
        mode={editMode}
        instruction={editingInstruction}
        tasks={tasks}
        availableMethods={availableMethods}
        availableTransitions={availableTransitions}
        onClose={handleCloseDialog}
        onSave={handleSaveInstruction}
      />
    </div>
  );
};

export default InstructionRegistrationTab;
