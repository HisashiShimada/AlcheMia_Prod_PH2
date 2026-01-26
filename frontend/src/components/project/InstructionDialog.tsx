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
  Checkbox,
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
  experimentCondition: 0 | 1;  // 0: 全て同一条件, 1: 実験ごとに条件変更
  trialCount: number;
  taskNumberOptions: number[];  // 指示入力部用のタスク番号リスト
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
  methodId: string;
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
      methodId: '',
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
      experimentCondition: 0,  // 0: 全て同一条件
      trialCount: 1,  // デフォルトを1に変更
      taskNumberOptions: [1],  // 初期値: trialCount=1なので[1]
    },
  ]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [activeInstructionId, setActiveInstructionId] = useState<number>(1);
  const [continuousInstruction, setContinuousInstruction] = useState<boolean>(true);

  // ファイル名の抽出
  const fileName = useMemo(() => {
    return fileKey?.split('/').pop() || '';
  }, [fileKey]);

  /**
   * ダイアログが閉じられた際にstateをリセット
   */
  useEffect(() => {
    if (!open) {
      // ダイアログが閉じられた時にstateをリセット
      setInstructions([
        {
          id: 1,
          content: '',
          priority: INSTRUCTION_PRIORITIES.NORMAL,
          type: INSTRUCTION_TYPES.GENERAL,
          targetType: TARGET_TYPES.FILE,
          transitionId: '',
          taskNumber: undefined,
          methodId: '',
        },
      ]);
      setSelectedWorkerId('');
      setAvailableTransitions([]);
      setMaimlParseError(null);
      setFileBasicInfo(null);
      setAvailableMethods([]);
      setLoadingMethods(false);
      setTaskDetails([
        {
          id: 1,
          methodId: '',
          experimentCondition: 0,
          trialCount: 1,
          taskNumberOptions: [1],
        },
      ]);
      setSelectedTaskId(null);
      setActiveInstructionId(1);
      setContinuousInstruction(true);
      setLoadingTransitions(false);
      setSubmitting(false);
    }
  }, [open]);

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
          experimentCondition: 0,  // 0: 全て同一条件
          trialCount: 1,
          taskNumberOptions: [1],  // 初期値: trialCount=1なので[1]
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
    (id: number, field: keyof TaskDetail, value: string | number) => {
      setTaskDetails((prev) =>
        prev.map((task) => {
          if (task.id === id) {
            // experimentConditionの場合は数値型に変換
            if (field === 'experimentCondition') {
              return { ...task, [field]: Number(value) as 0 | 1 };
            }
            
            // trialCountの場合、taskNumberOptionsも更新
            if (field === 'trialCount') {
              const newTrialCount = typeof value === 'number' ? value : parseInt(value.toString(), 10);
              if (!isNaN(newTrialCount) && newTrialCount > 0) {
                const newOptions = Array.from({ length: newTrialCount }, (_, i) => i + 1);
                return { ...task, trialCount: newTrialCount, taskNumberOptions: newOptions };
              }
            }
            
            return { ...task, [field]: value };
          }
          return task;
        })
      );

      // 試行回数が変更された場合、影響を受ける指示のタスク番号をリセット
      if (field === 'trialCount') {
        const newTrialCount = typeof value === 'number' ? value : parseInt(value.toString(), 10);
        if (!isNaN(newTrialCount)) {
          setInstructions((prevInstructions) =>
            prevInstructions.map((inst) => {
              // タスク番号が新しい試行回数を超えている場合はリセット
              if (inst.taskNumber && inst.taskNumber > newTrialCount) {
                return { ...inst, taskNumber: undefined };
              }
              return inst;
            })
          );
        }
      }
    },
    []
  );

  /**
   * タスクの選択/解除ハンドラ（単一選択のトグル）
   */
  const handleToggleTaskSelection = useCallback((taskId: number) => {
    const newSelectedId = selectedTaskId === taskId ? null : taskId;
    setSelectedTaskId(newSelectedId);
    
    // アクティブな指示のmethodIdを更新
    if (newSelectedId !== null) {
      const selectedTask = taskDetails.find((t) => t.id === newSelectedId);
      if (selectedTask) {
        setInstructions((prev) =>
          prev.map((inst) =>
            inst.id === activeInstructionId
              ? { ...inst, methodId: selectedTask.methodId }
              : inst
          )
        );
      }
    } else {
      // 選択解除時はmethodIdをクリア
      setInstructions((prev) =>
        prev.map((inst) =>
          inst.id === activeInstructionId
            ? { ...inst, methodId: '' }
            : inst
        )
      );
    }
  }, [selectedTaskId, taskDetails, activeInstructionId]);

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
   * 選択中のタスクからメソッド名を取得
   */
  const getSelectedTaskMethodName = useCallback((): string | null => {
    if (!selectedTaskId) return null;
    
    const selectedTask = taskDetails.find((task) => task.id === selectedTaskId);
    if (!selectedTask || !selectedTask.methodId) return null;
    
    const method = availableMethods.find((m) => m.id === selectedTask.methodId);
    return method ? method.displayName : null;
  }, [selectedTaskId, taskDetails, availableMethods]);

  /**
   * タスク選択状態を復元
   */
  const restoreTaskSelection = useCallback((instructionId: number) => {
    const targetInstruction = instructions.find(inst => inst.id === instructionId);
    if (targetInstruction) {
      if (targetInstruction.methodId) {
        // methodIdがある場合、対応するタスクを選択
        const matchingTask = taskDetails.find((t) => t.methodId === targetInstruction.methodId);
        if (matchingTask) {
          setSelectedTaskId(matchingTask.id);
        } else {
          // 対応するタスクが見つからない場合は選択解除
          setSelectedTaskId(null);
        }
      } else {
        // methodIdがない場合は選択解除
        setSelectedTaskId(null);
      }
    }
  }, [instructions, taskDetails]);

  /**
   * 指示を追加
   */
  const handleAddInstruction = useCallback(() => {
    setInstructions((prev) => {
      const newId = prev.length + 1;
      
      // 連続指示がONの場合、選択中のタスクのmethodIdを設定
      let defaultMethodId = '';
      if (continuousInstruction && selectedTaskId) {
        const selectedTask = taskDetails.find((t) => t.id === selectedTaskId);
        if (selectedTask) {
          defaultMethodId = selectedTask.methodId;
        }
      }
      
      const newInstruction: InstructionData = {
        id: newId,
        content: '',
        priority: INSTRUCTION_PRIORITIES.NORMAL,
        type: INSTRUCTION_TYPES.GENERAL,
        targetType: TARGET_TYPES.FILE,
        transitionId: '',
        taskNumber: undefined,
        methodId: defaultMethodId,
      };
      
      setActiveInstructionId(newId);
      // 次のレンダリングサイクルでrestoreTaskSelectionを呼ぶ
      setTimeout(() => restoreTaskSelection(newId), 0);
      
      return [...prev, newInstruction];
    });
  }, [continuousInstruction, selectedTaskId, taskDetails, restoreTaskSelection]);

  /**
   * 指示を削除
   */
  const handleRemoveInstruction = useCallback((id: number) => {
    setInstructions((prev) => {
      const filtered = prev.filter((inst) => inst.id !== id);
      
      // 削除後、アクティブな指示の処理
      if (filtered.length > 0 && activeInstructionId === id) {
        // 削除した指示がアクティブだった場合、残っている最初の指示をアクティブ化
        const newActiveId = filtered[0].id;
        setActiveInstructionId(newActiveId);
        // タスク選択状態を復元
        setTimeout(() => restoreTaskSelection(newActiveId), 0);
      }
      
      return filtered;
    });
  }, [activeInstructionId, restoreTaskSelection]);

  /**
   * 指示カードをクリックしてアクティブ化
   */
  const handleActivateInstruction = useCallback((id: number) => {
    if (activeInstructionId !== id) {
      setActiveInstructionId(id);
      restoreTaskSelection(id);
    }
  }, [activeInstructionId, restoreTaskSelection]);

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
   * 各タスクの試行回数の合計を計算
   */
  const totalTrialCount = useMemo(() => {
    return taskDetails.reduce((sum, task) => {
      const count = typeof task.trialCount === 'number' ? task.trialCount : 0;
      return sum + count;
    }, 0);
  }, [taskDetails]);

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

      // 各タスクの試行回数のバリデーション（入力されている場合のみ）
      const invalidTrialCount = taskDetails.find(
        (task) => (task.trialCount < 1 || task.trialCount > 999)
      );
      if (invalidTrialCount) {
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

      // ダイアログを閉じる（リセットはuseEffectで自動実行される）
      onClose();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '指示データ準備エラー';
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [instructions, fileKey, managerId, selectedWorkerId, taskDetails, onSubmit, onClose]);

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

    const isSelected = selectedTaskId === task.id;

    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      cursor: submitting ? 'default' : 'grab',
      backgroundColor: isSelected ? token.colorPrimaryBg : 'transparent',
      padding: token.paddingSM,
      borderRadius: token.borderRadius,
      border: isSelected ? `1px solid ${token.colorPrimary}` : '1px solid transparent',
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
      >
        <Flex gap="middle" align="center" style={{ width: '100%' }}>
          {/* チェックボックス */}
          <Checkbox
            checked={isSelected}
            onChange={() => handleToggleTaskSelection(task.id)}
            disabled={submitting}
          />

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

          {/* 実験条件 */}
          <div style={{ minWidth: 180 }}>
            <Select
              value={task.experimentCondition}
              onChange={(value) =>
                handleUpdateTaskDetail(task.id, 'experimentCondition', value.toString())
              }
              disabled={submitting || !isSelected}
              size="small"
              style={{ width: '100%' }}
            >
              <Select.Option value={0}>全て同一条件</Select.Option>
              <Select.Option value={1}>条件を変更</Select.Option>
            </Select>
          </div>

          {/* 試行回数 */}
          <div style={{ minWidth: 100 }}>
            <Input
              type="number"
              value={task.trialCount}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  handleUpdateTaskDetail(task.id, 'trialCount', '');
                } else {
                  const num = parseInt(value, 10);
                  if (!isNaN(num) && num >= 1 && num <= 999) {
                    handleUpdateTaskDetail(task.id, 'trialCount', num.toString());
                  }
                }
              }}
              onBlur={() => {
                // フォーカスアウト時にタスク番号の選択肢を再生成（試行回数変更を反映）
                // 実際の再生成はinstructionsのuseEffectで自動的に行われる
              }}
              placeholder="試行回数"
              disabled={submitting || !isSelected}
              size="small"
              min={1}
              max={999}
              style={{ width: '100%' }}
            />
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
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        {/* プロジェクト情報 */}
        <Alert
          title="プロジェクト情報"
          description={
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
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
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
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
            <Spin>
              <div style={{ minHeight: 100 }} />
            </Spin>
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
            <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
              {/* ヘッダー行（ラベル） */}
              <Flex gap="middle" align="center" style={{ 
                padding: `${token.paddingXS}px ${token.paddingSM}px`,
                backgroundColor: token.colorBgContainerDisabled,
                borderRadius: token.borderRadius,
                marginBottom: token.marginXS,
              }}>
                {/* チェックボックス列 */}
                <div style={{ width: 24 }} />
                
                {/* ドラッグハンドル列 */}
                <div style={{ width: 24 }} />

                {/* 作業順序列 */}
                <div style={{ minWidth: 80 }}>
                  <Text strong type="secondary">作業順序</Text>
                </div>

                {/* メソッド名列 */}
                <div style={{ flex: 1 }}>
                  <Text strong type="secondary">メソッド名</Text>
                </div>

                {/* 実験条件列 */}
                <div style={{ minWidth: 180 }}>
                  <Text strong type="secondary">実験条件</Text>
                </div>

                {/* 試行回数列 */}
                <div style={{ minWidth: 100 }}>
                  <Text strong type="secondary">試行回数</Text>
                </div>
              </Flex>

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
                  <Space orientation="vertical" size="small" style={{ width: '100%' }}>
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

            </Space>
          </Card>
        ) : null}

        {/* 連続指示チェックボックス */}
        <Card size="small" style={{ backgroundColor: token.colorBgContainer }}>
          <Checkbox
            checked={continuousInstruction}
            onChange={(e) => setContinuousInstruction(e.target.checked)}
            disabled={submitting}
          >
            <Text strong>🔄 連続指示モード</Text>
            <Text type="secondary" style={{ marginLeft: token.marginXS, fontSize: '12px' }}>
              （タスク選択を維持したまま複数の指示を追加）
            </Text>
          </Checkbox>
        </Card>

        {/* 指示入力フォーム */}
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          {instructions.map((instruction, index) => {
            const isActive = activeInstructionId === instruction.id;
            
            return (
              <Card
                key={instruction.id}
                size="small"
                title={
                  <Flex justify="space-between" align="center">
                    <Space>
                      <Text strong>指示 {index + 1}</Text>
                      {isActive && (
                        <Tag color="blue" style={{ margin: 0 }}>
                          アクティブ
                        </Tag>
                      )}
                    </Space>
                    {instructions.length > 1 && (
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveInstruction(instruction.id);
                        }}
                        disabled={submitting}
                      >
                        削除
                      </Button>
                    )}
                  </Flex>
                }
                onClick={() => handleActivateInstruction(instruction.id)}
                style={{
                  backgroundColor: isActive ? token.colorPrimaryBg : token.colorBgContainer,
                  border: isActive ? `2px solid ${token.colorPrimary}` : `1px solid ${token.colorBorder}`,
                  cursor: instructions.length > 1 ? 'pointer' : 'default',
                }}
                hoverable={instructions.length > 1}
              >
                <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                {/* 指示対象（ラベル表示） */}
                <div>
                  <Text strong style={{ display: 'block', marginBottom: token.marginXS }}>
                    🎯 指示対象
                  </Text>
                  <Card size="small" style={{ backgroundColor: token.colorPrimaryBg }}>
                    {instruction.methodId ? (
                      <Text>
                        <AimOutlined />{' '}
                        {(() => {
                          const method = availableMethods.find((m) => m.id === instruction.methodId);
                          return method ? method.displayName : 'メソッド未設定';
                        })()}
                      </Text>
                    ) : (
                      <Text>
                        <FileTextOutlined /> ファイル全体
                      </Text>
                    )}
                  </Card>
                </div>

                {/* 1行目: 優先度・タイプ */}
                <Flex gap="middle">
                  <div style={{ flex: 1 }}>
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

                  <div style={{ flex: 1 }}>
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
                </Flex>

                {/* 2行目: タスク番号・トランジションID */}
                <Flex gap="middle">
                  <div style={{ flex: 1 }}>
                    <Text strong style={{ display: 'block', marginBottom: token.marginXS }}>
                      🎯 対象タスク
                    </Text>
                    <Select
                      value={instruction.taskNumber || undefined}
                      onChange={(value) =>
                        handleUpdateInstruction(instruction.id, 'taskNumber', value)
                      }
                      disabled={
                        submitting ||
                        !isActive ||
                        !selectedTaskId ||
                        (() => {
                          const selectedTask = taskDetails.find((t) => t.id === selectedTaskId);
                          return !selectedTask || selectedTask.experimentCondition !== 1;
                        })()
                      }
                      placeholder="タスク番号を選択..."
                      style={{ width: '100%' }}
                    >
                      {isActive && selectedTaskId && (() => {
                        const selectedTask = taskDetails.find((t) => t.id === selectedTaskId);
                        if (selectedTask && selectedTask.experimentCondition === 1) {
                          // taskNumberOptionsから選択肢を生成
                          return selectedTask.taskNumberOptions.map((taskNum) => (
                            <Select.Option key={taskNum} value={taskNum}>
                              タスク {taskNum}
                            </Select.Option>
                          ));
                        }
                        return null;
                      })()}
                    </Select>
                  </div>

                  <div style={{ flex: 1 }}>
                    <Text strong style={{ display: 'block', marginBottom: token.marginXS }}>
                      🔗 トランジションID
                    </Text>
                    <Select
                      value={instruction.transitionId || undefined}
                      onChange={(value) =>
                        handleUpdateInstruction(instruction.id, 'transitionId', value)
                      }
                      disabled={
                        submitting ||
                        loadingTransitions ||
                        !isActive ||
                        !selectedTaskId
                      }
                      placeholder="トランジションを選択..."
                      style={{ width: '100%' }}
                      loading={loadingTransitions}
                    >
                      {isActive && selectedTaskId && (() => {
                        const selectedTask = taskDetails.find((t) => t.id === selectedTaskId);
                        if (selectedTask && selectedTask.methodId) {
                          // 選択したメソッドに含まれるトランジションのみ表示（モック実装）
                          // TODO: 実際のAPI実装時に、メソッドIDに紐づくトランジションを取得
                          return availableTransitions.map((transition) => (
                            <Select.Option key={transition.id} value={transition.id}>
                              {transition.isExperimentRelevant && '⭐ '}
                              {transition.displayName}
                              {transition.category !== 'other' && ` [${transition.category}]`}
                            </Select.Option>
                          ));
                        }
                        return null;
                      })()}
                    </Select>
                  </div>
                </Flex>

                {/* 選択されたトランジションの詳細 */}
                {instruction.targetType === TARGET_TYPES.TRANSITION &&
                  instruction.transitionId && (
                    <Alert
                      message={
                        <Space orientation="vertical" size="small">
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
          );
        })}
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
