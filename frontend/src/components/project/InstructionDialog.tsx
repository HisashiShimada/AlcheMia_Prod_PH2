/**
 * InstructionDialog.tsx
 * プロジェクト管理画面用の作業指示送信ダイアログ
 * Ant Design v6を使用し、UIポリシーに準拠
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Radio,
  Button,
  Space,
  Alert,
  Typography,
  Divider,
  Card,
  Spin,
  Tag,
  Flex,
  message,
  theme,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SendOutlined,
  FileTextOutlined,
  AimOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  HolderOutlined,
} from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const { Text, Title } = Typography;
const { TextArea } = Input;
const { useToken } = theme;

/**
 * 指示タイプの定数
 */
const INSTRUCTION_TYPES = {
  GENERAL: 'general',
  SETUP: 'setup',
  MEASUREMENT: 'measurement',
  SAFETY: 'safety',
  CLEANUP: 'cleanup',
} as const;

/**
 * 優先度の定数
 */
const INSTRUCTION_PRIORITIES = {
  HIGH: 'high',
  MEDIUM: 'medium',
  NORMAL: 'normal',
  LOW: 'low',
} as const;

/**
 * 対象タイプの定数
 */
const TARGET_TYPES = {
  FILE: 'file',
  TASK: 'task',
  TRANSITION: 'transition',
} as const;

/**
 * トランジション情報の型
 */
interface TransitionInfo {
  id: string;
  displayName: string;
  category: string;
  description?: string;
  isExperimentRelevant: boolean;
}

/**
 * メソッド情報の型
 */
interface MethodInfo {
  id: string;
  name: string;
  displayName: string;
  description?: string;
}

/**
 * タスク詳細の型
 */
interface TaskDetail {
  id: number;
  methodId: string;
}

/**
 * 指示データの型
 */
interface InstructionData {
  id: number;
  content: string;
  priority: string;
  type: string;
  targetType: string;
  transitionId: string;
  taskNumber?: number;
}

/**
 * ファイル基本情報の型
 */
interface FileBasicInfo {
  hasProtocol: boolean;
  hasMethod: boolean;
  hasPnml: boolean;
  hasProgram: boolean;
  hasData: boolean;
}

/**
 * 作業者情報の型
 */
interface WorkerInfo {
  userId: string;
  username: string;
}

/**
 * 送信する指示データの型
 */
interface SubmitInstructionData {
  instructionId: string;
  content: string;
  priority: string;
  instructionType: string;
  type: string;
  timestamp: string;
  targetType: string;
  transitionId: string | null;
  targetTransitionId?: string;
  taskNumber?: number;
}

/**
 * プロパティ
 */
interface InstructionDialogProps {
  /** ダイアログの表示/非表示 */
  open: boolean;
  /** 閉じるハンドラ */
  onClose: () => void;
  /** 送信ハンドラ */
  onSubmit?: (data: {
    instructions: SubmitInstructionData[];
    fileKey: string;
    managerId: string;
    assignedWorkerId: string | null;
  }) => void;
  /** ファイルキー */
  fileKey: string;
  /** 管理者ID */
  managerId: string;
  /** プロジェクト名 */
  projectName: string;
  /** プロジェクト所有者 */
  projectOwner: string;
  /** プロジェクトステータス */
  projectStatus: string;
  /** 選択されたファイル（現在未使用） */
  selectedFile?: Record<string, unknown>;
  /** 利用可能な作業者リスト */
  availableWorkers?: WorkerInfo[];
}

/**
 * 作業指示送信ダイアログコンポーネント
 */
const InstructionDialog: React.FC<InstructionDialogProps> = ({
  open,
  onClose,
  onSubmit,
  fileKey,
  managerId,
  projectName,
  projectOwner,
  projectStatus,
  selectedFile,
  availableWorkers = [],
}) => {
  const { token } = useToken();
  
  // 状態管理
  const [instructions, setInstructions] = useState<InstructionData[]>([
    {
      id: 1,
      content: '',
      priority: INSTRUCTION_PRIORITIES.NORMAL,
      type: INSTRUCTION_TYPES.GENERAL,
      targetType: TARGET_TYPES.FILE,
      transitionId: '',
      taskNumber: undefined,
    },
  ]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [availableTransitions, setAvailableTransitions] = useState<TransitionInfo[]>([]);
  const [loadingTransitions, setLoadingTransitions] = useState<boolean>(false);
  const [maimlParseError, setMaimlParseError] = useState<string | null>(null);
  const [fileBasicInfo, setFileBasicInfo] = useState<FileBasicInfo | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  
  // 新規追加: メソッド情報とタスク詳細
  const [availableMethods, setAvailableMethods] = useState<MethodInfo[]>([]);
  const [loadingMethods, setLoadingMethods] = useState<boolean>(false);
  const [taskDetails, setTaskDetails] = useState<TaskDetail[]>([
    {
      id: 1,
      methodId: '',
    },
  ]);
  
  // 新規追加: 実験条件、試行回数
  const [experimentCondition, setExperimentCondition] = useState<'same' | 'different'>('same');
  const [trialCount, setTrialCount] = useState<number | ''>('');

  // ファイル名の抽出
  const fileName = useMemo(() => {
    return fileKey?.split('/').pop() || '';
  }, [fileKey]);

  /**
   * MAIMLファイルからメソッド情報を取得
   */
  useEffect(() => {
    const fetchMethods = async () => {
      if (!open || !fileKey) return;

      setLoadingMethods(true);

      try {
        // TODO: 実際のAPI実装時に置き換え
        // モックデータでの動作確認
        await new Promise((resolve) => setTimeout(resolve, 500));

        // モックのメソッド情報（必ず1つ以上存在）
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

        setAvailableMethods(mockMethods);

        // メソッドを取得した順序でタスク詳細を初期化（methodIdも自動設定）
        const initialTasks: TaskDetail[] = mockMethods.map((method, index) => ({
          id: index + 1,
          methodId: method.id, // 取得順に自動設定
        }));

        setTaskDetails(initialTasks);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'メソッド取得エラー';
        message.error(errorMessage);
      } finally {
        setLoadingMethods(false);
      }
    };

    fetchMethods();
  }, [open, fileKey]);

  /**
   * MAIMLファイルからトランジション情報を取得
   * （実際の実装ではAPIコールが必要）
   */
  useEffect(() => {
    const fetchTransitions = async () => {
      if (!open || !fileKey) return;

      setLoadingTransitions(true);
      setMaimlParseError(null);
      setAvailableTransitions([]);

      try {
        // TODO: 実際のAPI実装時に置き換え
        // モックデータでの動作確認
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        // モックのファイル基本情報
        setFileBasicInfo({
          hasProtocol: true,
          hasMethod: true,
          hasPnml: true,
          hasProgram: false,
          hasData: true,
        });

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

        setAvailableTransitions(mockTransitions);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'トランジション取得エラー';
        setMaimlParseError(errorMessage);
        message.error(errorMessage);
      } finally {
        setLoadingTransitions(false);
      }
    };

    fetchTransitions();
  }, [open, fileKey]);

  /**
   * タスク詳細を更新
   */
  const handleUpdateTaskDetail = useCallback(
    (id: number, field: keyof TaskDetail, value: string) => {
      setTaskDetails((prev) =>
        prev.map((task) => {
          if (task.id === id) {
            return { ...task, [field]: value };
          }
          return task;
        })
      );
    },
    []
  );

  /**
   * 選択可能なメソッドリストを取得（すでに選択されているメソッドを除外）
   */
  const getAvailableMethodsForTask = useCallback(
    (currentTaskId: number): MethodInfo[] => {
      const selectedMethodIds = taskDetails
        .filter((task) => task.id !== currentTaskId && task.methodId)
        .map((task) => task.methodId);

      return availableMethods.filter(
        (method) => !selectedMethodIds.includes(method.id)
      );
    },
    [taskDetails, availableMethods]
  );

  /**
   * 指示を追加
   */
  const handleAddInstruction = useCallback(() => {
    setInstructions((prev) => [
      ...prev,
      {
        id: Date.now(),
        content: '',
        priority: INSTRUCTION_PRIORITIES.NORMAL,
        type: INSTRUCTION_TYPES.GENERAL,
        targetType: TARGET_TYPES.FILE,
        transitionId: '',
        taskNumber: undefined,
      },
    ]);
  }, []);

  /**
   * 指示を削除
   */
  const handleRemoveInstruction = useCallback((id: number) => {
    setInstructions((prev) => prev.filter((inst) => inst.id !== id));
  }, []);

  /**
   * 指示を更新
   */
  const handleUpdateInstruction = useCallback(
    (id: number, field: keyof InstructionData, value: string | number | undefined) => {
      setInstructions((prev) =>
        prev.map((inst) => {
          if (inst.id === id) {
            const updated = { ...inst, [field]: value };

            // 対象タイプが変更された場合、トランジションIDとタスク番号をリセット
            if (field === 'targetType') {
              if (value === TARGET_TYPES.FILE) {
                updated.transitionId = '';
                updated.taskNumber = undefined;
              } else if (value === TARGET_TYPES.TASK) {
                updated.transitionId = '';
                updated.taskNumber = undefined;
              } else if (value === TARGET_TYPES.TRANSITION) {
                updated.taskNumber = undefined;
              }
            }

            return updated;
          }
          return inst;
        })
      );
    },
    []
  );

  /**
   * 送信処理
   */
  const handleSubmit = useCallback(async () => {
    try {
      // メソッド選択のバリデーション（必須）
      const emptyMethod = taskDetails.find((task) => !task.methodId);
      if (emptyMethod) {
        message.warning('すべてのメソッドを選択してください');
        return;
      }

      // 試行回数のバリデーション（入力されている場合のみ）
      if (trialCount !== '' && (trialCount < 1 || trialCount > 999)) {
        message.warning('試行回数は1〜999の範囲で入力してください');
        return;
      }

      // バリデーション
      const validInstructions = instructions.filter((inst) => inst.content.trim());

      if (validInstructions.length === 0) {
        message.warning('少なくとも1つの指示を入力してください');
        return;
      }

      // トランジション指示のバリデーション
      const invalidTransitionInstruction = validInstructions.find(
        (inst) => inst.targetType === TARGET_TYPES.TRANSITION && !inst.transitionId
      );

      if (invalidTransitionInstruction) {
        message.warning('トランジション指示には対象トランジションを選択してください');
        return;
      }

      // タスク指示のバリデーション
      const invalidTaskInstruction = validInstructions.find(
        (inst) => inst.targetType === TARGET_TYPES.TASK && !inst.taskNumber
      );

      if (invalidTaskInstruction) {
        message.warning('タスク指示には対象タスクを選択してください');
        return;
      }

      setSubmitting(true);

      // 指示データの構築
      const instructionData = validInstructions.map((inst) => {
        const baseData = {
          instructionId: `instruction_${Date.now()}_${inst.id}`,
          content: inst.content.trim(),
          priority: inst.priority,
          instructionType: inst.type,
          type: inst.type,
          timestamp: new Date().toISOString(),
          targetType: inst.targetType,
        };

        // トランジション別指示の場合のみtransition_idを設定
        if (inst.targetType === TARGET_TYPES.TRANSITION && inst.transitionId) {
          return {
            ...baseData,
            transitionId: inst.transitionId,
            targetTransitionId: inst.transitionId,
          };
        }

        // タスク別指示の場合のみtaskNumberを設定
        if (inst.targetType === TARGET_TYPES.TASK && inst.taskNumber) {
          return {
            ...baseData,
            transitionId: null,
            taskNumber: inst.taskNumber,
          };
        }

        return {
          ...baseData,
          transitionId: null,
        };
      });

      // 送信処理
      if (onSubmit) {
        onSubmit({
          instructions: instructionData,
          fileKey: fileKey,
          managerId: managerId,
          assignedWorkerId: selectedWorkerId || null,
        });
      }

      message.success('指示データを準備しました');

      // ダイアログを閉じる
      onClose();

      // 状態をリセット
      setTimeout(() => {
        setInstructions([
          {
            id: 1,
            content: '',
            priority: INSTRUCTION_PRIORITIES.NORMAL,
            type: INSTRUCTION_TYPES.GENERAL,
            targetType: TARGET_TYPES.FILE,
            transitionId: '',
            taskNumber: undefined,
          },
        ]);
        setSelectedWorkerId('');
        setAvailableTransitions([]);
        setMaimlParseError(null);
        setFileBasicInfo(null);
        // 新規追加項目のリセット
        setExperimentCondition('same');
        setTrialCount('');
        setTaskDetails([
          {
            id: 1,
            methodId: '',
          },
        ]);
      }, 300);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '指示データ準備エラー';
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [instructions, fileKey, managerId, selectedWorkerId, experimentCondition, trialCount, onSubmit, onClose]);

  /**
   * ダイアログを閉じる
   */
  const handleClose = useCallback(() => {
    if (submitting) {
      Modal.confirm({
        title: '送信中',
        content: '指示データの準備が進行中です。キャンセルしますか？',
        okText: 'はい',
        cancelText: 'いいえ',
        onOk: onClose,
      });
    } else {
      onClose();
    }
  }, [submitting, onClose]);

  /**
   * 選択されたトランジション情報を取得
   */
  const getSelectedTransition = useCallback(
    (transitionId: string): TransitionInfo | undefined => {
      return availableTransitions.find((t) => t.id === transitionId);
    },
    [availableTransitions]
  );

  /**
   * ドラッグ&ドロップセンサーの設定
   */
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px移動したらドラッグ開始
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /**
   * タスク詳細の順序変更ハンドラ
   */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTaskDetails((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  /**
   * ドラッグ可能な行コンポーネント
   */
  interface DraggableRowProps {
    task: TaskDetail;
    index: number;
    selectedMethod?: MethodInfo;
  }

  const DraggableRow: React.FC<DraggableRowProps> = ({
    task,
    index,
    selectedMethod,
  }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: task.id,
      disabled: submitting,
    });

    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      cursor: submitting ? 'default' : 'grab',
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
      >
        <Flex gap="middle" align="center" style={{ width: '100%' }}>
          {/* ドラッグハンドル */}
          <div
            {...listeners}
            style={{
              cursor: submitting ? 'not-allowed' : 'grab',
              padding: `${token.paddingXXS}px ${token.paddingXS}px`,
              color: submitting ? token.colorTextDisabled : token.colorTextSecondary,
            }}
          >
            <HolderOutlined />
          </div>

          {/* 作業順序 */}
          <div style={{ minWidth: 80 }}>
            <Text strong>作業順序 {index + 1}</Text>
          </div>

          {/* メソッド名（ラベル表示） */}
          <div style={{ flex: 1 }}>
            <Text>{selectedMethod?.displayName || 'メソッド未設定'}</Text>
            {selectedMethod?.description && (
              <Text type="secondary" style={{ marginLeft: token.marginXS, fontSize: '12px' }}>
                - {selectedMethod.description}
              </Text>
            )}
          </div>
        </Flex>
      </div>
    );
  };

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined style={{ color: token.colorPrimary }} />
          <span>作業指示入力</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={handleClose} disabled={submitting}>
          キャンセル
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleSubmit}
          disabled={submitting}
          icon={submitting ? <LoadingOutlined /> : <SendOutlined />}
        >
          {submitting ? '準備中...' : '指示準備完了'}
        </Button>,
      ]}
      styles={{
        body: { maxHeight: '70vh', overflowY: 'auto' },
      }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* プロジェクト情報 */}
        <Alert
          message="プロジェクト情報"
          description={
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text>
                <Text strong>プロジェクト名:</Text> {projectName}
              </Text>
              <Text>
                <Text strong>所有者:</Text> {projectOwner}
              </Text>
              <Text>
                <Text strong>プロジェクトステータス:</Text> <Tag color="blue">{projectStatus}</Tag>
              </Text>
            </Space>
          }
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: token.marginLG }}
        />

        {/* 作業者選択 */}
        {availableWorkers.length > 0 && (
          <Card size="small" style={{ backgroundColor: token.colorWarningBg }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text strong>👷 作業者を割り当て（任意）</Text>
              <Select
                value={selectedWorkerId || undefined}
                onChange={setSelectedWorkerId}
                placeholder="割り当てなし（チェックアウトのみ）"
                disabled={submitting}
                style={{ width: '100%' }}
                allowClear
              >
                {availableWorkers.map((worker) => (
                  <Select.Option key={worker.userId} value={worker.userId}>
                    {worker.username} ({worker.userId})
                  </Select.Option>
                ))}
              </Select>
              {selectedWorkerId && (
                <Alert
                  message="この作業者に作業IDを自動発行して割り当てます"
                  type="success"
                  showIcon
                  icon={<CheckCircleOutlined />}
                />
              )}
            </Space>
          </Card>
        )}

        <Divider style={{ margin: `${token.marginSM}px 0` }}>指示内容</Divider>

        {/* タスク詳細カード */}
        {loadingMethods ? (
          <Card size="small">
            <Spin tip="メソッド情報を読み込み中..." />
          </Card>
        ) : availableMethods.length > 0 ? (
          <Card
            size="small"
            title={
              <Flex justify="space-between" align="center">
                <Text strong>📝 タスク詳細</Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {taskDetails.length > 1 && '🔀 ドラッグで順序変更可能'}
                </Text>
              </Flex>
            }
            style={{ backgroundColor: token.colorBgContainer }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {/* ドラッグ&ドロップ対応のメソッド順序設定 */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={taskDetails.map((task) => task.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    {taskDetails.map((task, index) => {
                      const selectedMethod = availableMethods.find((m) => m.id === task.methodId);

                      return (
                        <DraggableRow
                          key={task.id}
                          task={task}
                          index={index}
                          selectedMethod={selectedMethod}
                        />
                      );
                    })}
                  </Space>
                </SortableContext>
              </DndContext>

              {/* 条件指定と試行回数 */}
              <Divider style={{ margin: `${token.marginXS}px 0` }} />
              
              <Flex gap="middle" wrap="wrap">
                {/* 条件指定 */}
                <div style={{ flex: 1, minWidth: 300 }}>
                  <Text strong style={{ display: 'block', marginBottom: token.marginXS }}>
                    🔬 条件指定
                  </Text>
                  <Radio.Group
                    value={experimentCondition}
                    onChange={(e) => setExperimentCondition(e.target.value)}
                    disabled={submitting}
                    style={{ display: 'flex', flexDirection: 'column', gap: token.marginXS }}
                  >
                    <Radio value="same">全て同一条件で実施</Radio>
                    <Radio value="different">実験ごとに条件を変更</Radio>
                  </Radio.Group>
                </div>

                {/* 試行回数 */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <Text strong style={{ display: 'block', marginBottom: token.marginXS }}>
                    🔢 試行回数
                  </Text>
                  <Input
                    type="number"
                    value={trialCount}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        setTrialCount('');
                      } else {
                        const num = parseInt(value, 10);
                        if (!isNaN(num) && num >= 1 && num <= 999) {
                          setTrialCount(num);
                        }
                      }
                    }}
                    placeholder="試行回数を入力"
                    disabled={submitting}
                    min={1}
                    max={999}
                    style={{ width: '100%' }}
                  />
                </div>
              </Flex>
            </Space>
          </Card>
        ) : null}

        {/* 指示入力フォーム */}
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {instructions.map((instruction, index) => (
            <Card
              key={instruction.id}
              size="small"
              title={
                <Flex justify="space-between" align="center">
                  <Text strong>指示 {index + 1}</Text>
                  {instructions.length > 1 && (
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveInstruction(instruction.id)}
                      disabled={submitting}
                    >
                      削除
                    </Button>
                  )}
                </Flex>
              }
              style={{ backgroundColor: token.colorBgContainer }}
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {/* 指示対象選択 */}
                <div>
                  <Text strong style={{ display: 'block', marginBottom: token.marginXS }}>
                    🎯 指示対象 <Text type="danger">*</Text>
                  </Text>
                  <Radio.Group
                    value={instruction.targetType}
                    onChange={(e) =>
                      handleUpdateInstruction(instruction.id, 'targetType', e.target.value)
                    }
                    disabled={submitting}
                  >
                    <Radio value={TARGET_TYPES.FILE}>
                      <FileTextOutlined /> ファイル全体
                    </Radio>
                    <Radio
                      value={TARGET_TYPES.TASK}
                      disabled={!trialCount}
                    >
                      <AimOutlined /> 特定タスク
                    </Radio>
                    <Radio
                      value={TARGET_TYPES.TRANSITION}
                      disabled={availableTransitions.length === 0}
                    >
                      <AimOutlined /> 特定トランジション
                    </Radio>
                  </Radio.Group>
                  {!trialCount && (
                    <Text type="secondary" style={{ display: 'block', marginTop: token.marginXXS, fontSize: '12px' }}>
                      ※ 特定タスクを選択するには、試行回数を入力してください
                    </Text>
                  )}
                </div>

                {/* 優先度・タイプ・トランジション選択 */}
                <Flex gap="middle" wrap="wrap">
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <Text strong style={{ display: 'block', marginBottom: token.marginXS }}>
                      優先度
                    </Text>
                    <Select
                      value={instruction.priority}
                      onChange={(value) =>
                        handleUpdateInstruction(instruction.id, 'priority', value)
                      }
                      disabled={submitting}
                      style={{ width: '100%' }}
                    >
                      <Select.Option value={INSTRUCTION_PRIORITIES.HIGH}>高</Select.Option>
                      <Select.Option value={INSTRUCTION_PRIORITIES.MEDIUM}>中</Select.Option>
                      <Select.Option value={INSTRUCTION_PRIORITIES.NORMAL}>
                        通常
                      </Select.Option>
                      <Select.Option value={INSTRUCTION_PRIORITIES.LOW}>低</Select.Option>
                    </Select>
                  </div>

                  <div style={{ flex: 1, minWidth: 150 }}>
                    <Text strong style={{ display: 'block', marginBottom: token.marginXS }}>
                      タイプ
                    </Text>
                    <Select
                      value={instruction.type}
                      onChange={(value) =>
                        handleUpdateInstruction(instruction.id, 'type', value)
                      }
                      disabled={submitting}
                      style={{ width: '100%' }}
                    >
                      <Select.Option value={INSTRUCTION_TYPES.GENERAL}>一般</Select.Option>
                      <Select.Option value={INSTRUCTION_TYPES.SETUP}>
                        セットアップ
                      </Select.Option>
                      <Select.Option value={INSTRUCTION_TYPES.MEASUREMENT}>
                        測定
                      </Select.Option>
                      <Select.Option value={INSTRUCTION_TYPES.SAFETY}>安全</Select.Option>
                      <Select.Option value={INSTRUCTION_TYPES.CLEANUP}>清掃</Select.Option>
                    </Select>
                  </div>

                  <div style={{ flex: 1, minWidth: 200 }}>
                    <Text strong style={{ display: 'block', marginBottom: token.marginXS }}>
                      {instruction.targetType === TARGET_TYPES.TRANSITION ? (
                        <>
                          🎯 対象トランジション <Text type="danger">*</Text>
                        </>
                      ) : instruction.targetType === TARGET_TYPES.TASK ? (
                        <>
                          🎯 対象タスク <Text type="danger">*</Text>
                        </>
                      ) : (
                        '対象範囲'
                      )}
                    </Text>
                    {instruction.targetType === TARGET_TYPES.TRANSITION ? (
                      <Select
                        value={instruction.transitionId || undefined}
                        onChange={(value) =>
                          handleUpdateInstruction(instruction.id, 'transitionId', value)
                        }
                        disabled={
                          submitting ||
                          loadingTransitions ||
                          availableTransitions.length === 0
                        }
                        placeholder="トランジションを選択..."
                        style={{ width: '100%' }}
                        loading={loadingTransitions}
                      >
                        {availableTransitions.map((transition) => (
                          <Select.Option key={transition.id} value={transition.id}>
                            {transition.isExperimentRelevant && '⭐ '}
                            {transition.displayName}
                            {transition.category !== 'other' && ` [${transition.category}]`}
                          </Select.Option>
                        ))}
                      </Select>
                    ) : instruction.targetType === TARGET_TYPES.TASK ? (
                      <Select
                        value={instruction.taskNumber || undefined}
                        onChange={(value) =>
                          handleUpdateInstruction(instruction.id, 'taskNumber', value)
                        }
                        disabled={!trialCount || submitting}
                        placeholder="タスク番号を選択..."
                        style={{ width: '100%' }}
                      >
                        {trialCount && Array.from({ length: trialCount as number }, (_, i) => (
                          <Select.Option key={i + 1} value={i + 1}>
                            タスク {i + 1}
                          </Select.Option>
                        ))}
                      </Select>
                    ) : (
                      <Input value="実験全体への指示" disabled style={{ width: '100%' }} />
                    )}
                  </div>
                </Flex>

                {/* 選択されたトランジションの詳細 */}
                {instruction.targetType === TARGET_TYPES.TRANSITION &&
                  instruction.transitionId && (
                    <Alert
                      message={
                        <Space direction="vertical" size="small">
                          {(() => {
                            const selected = getSelectedTransition(instruction.transitionId);
                            if (selected) {
                              return (
                                <>
                                  <Text>
                                    <Text strong>選択中:</Text> {selected.displayName}
                                  </Text>
                                  <Text>
                                    <Text strong>カテゴリ:</Text> {selected.category}
                                    {selected.isExperimentRelevant && (
                                      <Tag color="success" style={{ marginLeft: 8 }}>
                                        実験関連
                                      </Tag>
                                    )}
                                  </Text>
                                  {selected.description && (
                                    <Text>
                                      <Text strong>説明:</Text> {selected.description}
                                    </Text>
                                  )}
                                </>
                              );
                            }
                            return null;
                          })()}
                        </Space>
                      }
                      type="success"
                      showIcon
                    />
                  )}

                {/* 選択されたタスクの詳細 */}
                {instruction.targetType === TARGET_TYPES.TASK &&
                  instruction.taskNumber && (
                    <Alert
                      message={
                        <Text>
                          <Text strong>選択中:</Text> タスク {instruction.taskNumber} への指示
                        </Text>
                      }
                      type="success"
                      showIcon
                    />
                  )}

                {/* 指示内容 */}
                <div>
                  <Text strong style={{ display: 'block', marginBottom: token.marginXS }}>
                    指示内容 <Text type="danger">*</Text>
                  </Text>
                  <TextArea
                    value={instruction.content}
                    onChange={(e) =>
                      handleUpdateInstruction(instruction.id, 'content', e.target.value)
                    }
                    placeholder={
                      instruction.targetType === TARGET_TYPES.TRANSITION &&
                      instruction.transitionId
                        ? `選択されたトランジション「${
                            getSelectedTransition(instruction.transitionId)?.displayName ||
                            instruction.transitionId
                          }」に対する具体的な指示を入力してください...`
                        : instruction.targetType === TARGET_TYPES.TASK &&
                          instruction.taskNumber
                        ? `タスク ${instruction.taskNumber} に対する具体的な指示を入力してください...`
                        : '作業者への具体的な指示を入力してください...'
                    }
                    disabled={submitting}
                    rows={4}
                    showCount
                    maxLength={1000}
                  />
                </div>
              </Space>
            </Card>
          ))}
        </Space>

        {/* 指示追加ボタン */}
        <Button
          type="dashed"
          onClick={handleAddInstruction}
          icon={<PlusOutlined />}
          disabled={submitting}
          block
        >
          指示を追加
        </Button>
      </Space>
    </Modal>
  );
};

export default InstructionDialog;
