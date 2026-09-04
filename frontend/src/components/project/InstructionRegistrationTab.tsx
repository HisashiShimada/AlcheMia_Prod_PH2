/**
 * InstructionRegistrationTab.tsx
 * 指示登録タブコンポーネント（一覧表示）
 * 指示の一覧表示と管理を行うコンポーネント
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Button,
  Table,
  Space,
  Typography,
  message,
  theme,
  Tooltip,
  Empty,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import InstructionEditDialog from './InstructionEditDialog';
import type {
  InstructionData,
  TransitionInfo,
} from '@/types/instructionRegistration';
import { INSTRUCTION_KEY, INSTRUCTION_KEY_LABELS } from '@/types/instructionRegistration';
import type { TaskDetail, MethodInfo } from '@/types/taskRegistration';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProjectMaiml } from '@/contexts/ProjectMaimlContext';
import {
  getInstructions,
  saveInstruction,
  updateInstruction,
  deleteInstruction,
  getTaskRegistration,
} from '@/services/projectApiService';

const { Text } = Typography;
const { useToken } = theme;

/**
 * 指示登録タブのプロパティ
 */
interface InstructionRegistrationTabProps {
  projectId: string;
  projectName: string;
  isActive: boolean;
  isCheckoutLocked?: boolean;
  /** 編集権限フラグ。false の場合は変更系ボタンを非活性にする */
  isEditable?: boolean;
  /** プロジェクト完了フラグ。true の場合は変更系ボタンを非活性にする */
  isProjectCompleted?: boolean;
}

/**
 * 指示登録タブコンポーネント
 */
const InstructionRegistrationTab: React.FC<InstructionRegistrationTabProps> = ({
  projectId,
  projectName,
  isActive,
  isCheckoutLocked,
  isEditable = true,
  isProjectCompleted = false,
}) => {
  const { token } = useToken();
  const { t } = useLanguage();
  const { maimlRoot, isLoading: isMaimlLoading } = useProjectMaiml();

  // 状態管理
  const [instructions, setInstructions] = useState<InstructionData[]>([]);
  const [registeredTasks, setRegisteredTasks] = useState<TaskDetail[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');
  const [editingInstruction, setEditingInstruction] = useState<InstructionData | undefined>(undefined);

  /**
   * タブがアクティブになった時にタスク登録情報を再取得
   */
  useEffect(() => {
    const fetchTaskRegistration = async () => {
      if (!projectName || !isActive) return;

      try {
        const data = await getTaskRegistration(projectId);

        // タスク情報をUI用の形式に変換
        if (data.tasks && data.tasks.length > 0) {
          const uiTasks: TaskDetail[] = data.tasks.map((task, index) => ({
            id: index + 1,
            methodId: task.methodId,
            experimentCondition: Number(task.experimentCondition),
            trialCount: task.trialCount,
            experimentOrder: task.experimentOrder,
            taskNumberOptions: Array.from({ length: task.trialCount }, (_, i) => i + 1),
            workerLinkedFlg: task.workerLinkedFlg || false,
          }));

          setRegisteredTasks(uiTasks);
        } else {
          setRegisteredTasks([]);
        }
      } catch (error) {
        console.error('Failed to fetch task registration:', error);
        message.error(t('instructionRegistration.messages.taskFetchFailed'));
        setRegisteredTasks([]);
      }
    };

    fetchTaskRegistration();
  }, [projectName, isActive]);

  /**
   * タブがアクティブになった時に指示一覧を再取得
   */
  useEffect(() => {
    const fetchInstructions = async () => {
      if (!projectName || !isActive) return;

      try {
        const instructionList = await getInstructions(projectId);
        setInstructions(instructionList);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : t('instructionRegistration.messages.fetchFailed');
        message.error(errorMessage);
      }
    };

    fetchInstructions();
  }, [projectName, isActive]);

  /**
   * MAIMLコンテキストからメソッド一覧を取得
   */
  const availableMethods = useMemo((): MethodInfo[] => {
    if (!maimlRoot?.protocol?.methods) return [];
    
    return maimlRoot.protocol.methods.map((method) => ({
      id: method.id,
      name: method.name || method.id,
      displayName: method.name || method.id,
      description: method.description,
    }));
  }, [maimlRoot]);

  /**
   * MAIMLコンテキストから全トランジション一覧を取得（表示用）
   * 各トランジションに所属メソッドIDを付与してフィルタリングに対応
   */
  const availableTransitions = useMemo((): TransitionInfo[] => {
    if (!maimlRoot?.protocol?.methods) return [];
    
    // 全メソッドのトランジションを集約（methodIdを付与）
    const allTransitions: TransitionInfo[] = [];
    maimlRoot.protocol.methods.forEach((method) => {
      if (method.pnml?.transitions) {
        method.pnml.transitions.forEach((transition) => {
          allTransitions.push({
            id: transition.id,
            displayName: transition.name || transition.id,
            category: 'other',
            description: transition.description,
            isExperimentRelevant: true,
            methodId: method.id,
          });
        });
      }
    });
    
    return allTransitions;
  }, [maimlRoot]);

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
        const result = await saveInstruction(projectId, {
          methodId: instruction.methodId || null,
          transitionId: instruction.transitionId || null,
          taskNumber: instruction.taskNumber,
          content: instruction.content,
          instructionKey: instruction.instructionKey || INSTRUCTION_KEY.GENERAL,
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
        await updateInstruction(projectId, String(instruction.id), {
          methodId: instruction.methodId,
          transitionId: instruction.transitionId || null,
          taskNumber: instruction.taskNumber,
          content: instruction.content,
          instructionKey: instruction.instructionKey,
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
        error instanceof Error ? error.message : t('instructionRegistration.messages.saveFailed');
      message.error(errorMessage);
    }
  }, [editMode, projectName, handleCloseDialog, t]);

  /**
   * 指示を削除
   */
  const handleDeleteInstruction = useCallback(async (id: string | number) => {
    try {
      // API呼び出し
      const result = await deleteInstruction(projectId, String(id));
      
      if (result.deleted) {
        // ローカル状態を更新
        setInstructions((prev) => prev.filter((inst) => inst.id !== id));
        message.success(t('instructionRegistration.messages.deleted'));
      } else {
        message.error(t('instructionRegistration.messages.deleteFailed'));
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t('instructionRegistration.messages.deleteError');
      message.error(errorMessage);
    }
  }, [projectName]);

  /**
   * 指示対象のラベル
   */
  const getTargetLabel = useCallback((instruction: InstructionData): string => {
    const method = availableMethods.find(m => m.id === instruction.methodId);
    
    if (instruction.transitionId) {
      const transition = availableTransitions.find(t => t.id === instruction.transitionId);
      return `${method?.displayName || t('instructionRegistration.target.method')} > ${transition?.displayName || t('instructionRegistration.target.transition')}`;
    } else if (instruction.taskNumber !== undefined) {
      return `${method?.displayName || t('instructionRegistration.target.method')} > ${t('instructionRegistration.target.task')} ${instruction.taskNumber}`;
    } else if (instruction.methodId) {
      return method?.displayName || t('instructionRegistration.target.method');
    } else {
      return t('instructionRegistration.target.project');
    }
  }, [availableMethods, availableTransitions, t]);

  /**
   * 指示対象のラベル（メソッド名またはプロジェクト全体）
   * 優先順位: APIから返されたmethodName > MAIMLコンテキストのdisplayName > methodId > プロジェクト全体
   */
  const getTargetBaseLabel = useCallback((instruction: InstructionData): string => {
    if (instruction.methodId) {
      // APIから返されたmethodNameを最優先で使用
      if (instruction.methodName) {
        return instruction.methodName;
      }
      // フォールバック: MAIMLコンテキストから取得
      const method = availableMethods.find(m => m.id === instruction.methodId);
      return method?.displayName || instruction.methodId;
    }
    return t('instructionRegistration.target.project');
  }, [availableMethods, t]);

  /**
   * テーブルのカラム定義
   */
  const columns: ColumnsType<InstructionData> = [
    {
      title: t('instructionRegistration.columns.target'),
      dataIndex: 'methodId',
      key: 'target',
      width: 240,
      ellipsis: true,
      render: (_, record) => (
        <Tooltip title={getTargetBaseLabel(record)}>
          <Text ellipsis>{getTargetBaseLabel(record)}</Text>
        </Tooltip>
      ),
    },
    {
      title: t('instructionRegistration.columns.taskNumber'),
      dataIndex: 'taskNumber',
      key: 'taskNumber',
      width: 90,
      align: 'center' as const,
      render: (taskNumber: number | undefined) => (
        <Text>{taskNumber !== undefined ? taskNumber : '-'}</Text>
      ),
    },
    {
      title: t('instructionRegistration.columns.transitionId'),
      dataIndex: 'transitionId',
      key: 'transitionId',
      width: 180,
      ellipsis: true,
      render: (transitionId: string | undefined) => {
        if (!transitionId) return <Text>-</Text>;
        const transition = availableTransitions.find(tr => tr.id === transitionId);
        const label = transition?.displayName || transitionId;
        return (
          <Tooltip title={transitionId}>
            <Text ellipsis>{label}</Text>
          </Tooltip>
        );
      },
    },
    {
      title: t('instructionRegistration.columns.instructionKey'),
      dataIndex: 'instructionKey',
      key: 'instructionKey',
      width: 180,
      ellipsis: true,
      render: (instructionKey: string) => {
        const label = INSTRUCTION_KEY_LABELS[instructionKey as keyof typeof INSTRUCTION_KEY_LABELS] || instructionKey;
        return (
          <Tooltip title={label}>
            <Text ellipsis>{label}</Text>
          </Tooltip>
        );
      },
    },
    {
      title: t('instructionRegistration.columns.content'),
      dataIndex: 'content',
      key: 'content',
      // width未指定で残り幅を自動的に使用
      ellipsis: true,
      render: (content: string) => (
        <Tooltip title={content}>
          <Text ellipsis style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{content}</Text>
        </Tooltip>
      ),
    },
    {
      title: t('instructionRegistration.columns.action'),
      key: 'action',
      width: 160,
      render: (_, record) => (
        <Space size="small">
          {record.isSent ? (
            // 送信済：詳細ボタンのみ
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleOpenEditDialog(record)}
              data-testid={`instruction-detail-button-${record.id}`}
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
                disabled={!isEditable || isProjectCompleted || isCheckoutLocked}
                data-testid={`instruction-edit-button-${record.id}`}
              >
                {t('instructionRegistration.editButton')}
              </Button>
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteInstruction(record.id)}
                disabled={!isEditable || isProjectCompleted || isCheckoutLocked}
                data-testid={`instruction-delete-button-${record.id}`}
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
        <Text
          type="secondary"
          data-testid="instruction-status-summary"
        >
          {t('instructionRegistration.listTitle').replace('{count}', instructions.length.toString())}
        </Text>
      </div>

      {/* 指示一覧テーブル */}
      <Table
        columns={columns}
        dataSource={instructions}
        rowKey="id"
        size="small"
        pagination={false}
        loading={isMaimlLoading}
        tableLayout="fixed"
        style={{ width: '100%', tableLayout: 'fixed' }}
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
        tasks={registeredTasks}
        availableMethods={availableMethods}
        availableTransitions={availableTransitions}
        onClose={handleCloseDialog}
        onSave={handleSaveInstruction}
      />
    </div>
  );
};

export default InstructionRegistrationTab;
