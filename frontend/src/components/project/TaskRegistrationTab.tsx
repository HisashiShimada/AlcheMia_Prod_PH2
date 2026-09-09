/**
 * TaskRegistrationTab.tsx
 * タスク登録タブコンポーネント（テーブル形式）
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  Button,
  Space,
  Typography,
  Select,
  Input,
  theme,
  Spin,
  Empty,
  App,
  Alert,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SaveOutlined,
  HolderOutlined,
  PlusOutlined,
  ExclamationCircleOutlined,
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { 
  TaskDetail, 
  MethodInfo, 
  TaskRegistrationData,
  InstructionSaveItem,
} from '@/types/taskRegistration';
import type { TemplateDef, TemplateField } from '@/types/experimentPlan';
import type { RefOption } from '@/types/experimentPlanDialog';
import type {
  InstructionData,
  TransitionInfo,
} from '@/types/instructionRegistration';
import { INSTRUCTION_KEY } from '@/types/instructionRegistration';
import InstructionEditDialog from './InstructionEditDialog';
import ExperimentPlanDialog from './ExperimentPlanDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProjectMaiml } from '@/contexts/ProjectMaimlContext';
import { getTaskRegistration, saveTaskRegistration, saveInstruction, getInstructions } from '@/services/projectApiService';
import { getExperimentPlans } from '@/services/experimentPlanApiService';
import { createRangeOptions } from '@/utils/selectUtils';
import { InstructionStatus } from '@/constants/codeMaster';

const { Text } = Typography;
const { useToken } = theme;

/**
 * タスク登録タブのプロパティ
 */
interface TaskRegistrationTabProps {
  projectId: string;
  projectName: string;
  isActive: boolean;
  isCheckoutLocked?: boolean;
  /** MAIMLバリデーションエラーがある場合 true */
  maimlHasErrors?: boolean;
  /** プロジェクト完了状態（status === 4）の場合 true */
  isProjectCompleted?: boolean;
  /** 編集権限フラグ。false の場合は変更系ボタンを非活性にする */
  isEditable?: boolean;
  onTasksChange?: (tasks: TaskDetail[]) => void;
  /**
   * プロジェクトが属する組織グループCD（任意）
   * TemplateInputPanel の用語キー選択モーダルで使用する用語スコープ絞り込みに使用する。
   */
  organizationGroupCd?: string;
}

/**
 * ドラッグ可能な行コンポーネント
 */
interface DraggableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  'data-row-key': string;
}

/**
 * タスク登録タブコンポーネント
 */
const TaskRegistrationTab: React.FC<TaskRegistrationTabProps> = ({
  projectId,
  projectName,
  isActive,
  isCheckoutLocked: isCheckoutLockedProp,
  maimlHasErrors,
  isProjectCompleted,
  isEditable = true,
  onTasksChange,
  organizationGroupCd,
}) => {
  const { token } = useToken();
  const { message } = App.useApp();
  const { t } = useLanguage();
  const { maimlRoot } = useProjectMaiml();

  // 状態管理
  const [availableMethods, setAvailableMethods] = useState<MethodInfo[]>([]);
  const [loadingMethods, setLoadingMethods] = useState<boolean>(false);
  const [taskDetails, setTaskDetails] = useState<TaskDetail[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isMaimlRegistered, setIsMaimlRegistered] = useState<boolean>(false);
  
  // チェックボックス状態管理（タスクIDで管理）
  const [checkedTaskIds, setCheckedTaskIds] = useState<Set<number>>(new Set());
  
  // 指示管理のstate（統合版）
  const [instructions, setInstructions] = useState<InstructionData[]>([]);
  const [isInstructionDialogOpen, setIsInstructionDialogOpen] = useState<boolean>(false);
  const [selectedMethodIdForInstruction, setSelectedMethodIdForInstruction] = useState<string>('');

  /**
   * MAIMLコンテキストから全トランジション一覧を取得
   * 各トランジションに所属メソッドIDを付与してフィルタリングに対応
   */
  const availableTransitions = useMemo((): TransitionInfo[] => {
    if (!maimlRoot?.protocol?.methods) return [];
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
  
  // プロジェクト指示用のダイアログ状態
  const [isProjectInstructionDialogOpen, setIsProjectInstructionDialogOpen] = useState<boolean>(false);

  // 実験計画ダイアログの状態
  const [isExperimentPlanDialogOpen, setIsExperimentPlanDialogOpen] = useState<boolean>(false);
  const [selectedMethodIdForPlan, setSelectedMethodIdForPlan] = useState<string>('');
  
  // チェックアウト状態はPropsを優先し、なければAPI取得結果を使用
  const isCheckoutLocked = isCheckoutLockedProp ?? false;

  /**
   * チェックボックスの状態変更ハンドラー
   */
  const handleCheckboxChange = useCallback((taskId: number, checked: boolean) => {
    setCheckedTaskIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(taskId);
      } else {
        newSet.delete(taskId);
      }
      return newSet;
    });
  }, []);

  /**
   * 指示データのリフレッシュ（stateクリア + DB再取得）
   */
  const refreshInstructions = useCallback(async () => {
    setInstructions([]); // stateをクリア
    const instructionsData = await getInstructions(projectId).catch(err => {
      console.warn('[DEBUG] TaskRegistrationTab - Failed to refresh instructions (continuing):', err);
      return []; // エラー時は空配列を返す
    });
    setInstructions(instructionsData || []); // DB指示をセット
  }, [projectName]);

  /**
   * タブがアクティブになった時にタスク登録情報を再取得
   */
  useEffect(() => {
    const fetchTaskRegistration = async () => {
      if (!projectName || !isActive) return;

      setLoadingMethods(true);

      try {
        // タスクデータを取得
        const taskData = await getTaskRegistration(projectId);

        // MAIML登録状態を保存（チェックアウト状態はPropsから取得）
        setIsMaimlRegistered(taskData.isMaimlRegistered);
        
        // 指示データを共通関数で取得（stateクリア + DB再取得）
        await refreshInstructions();

        // タスク情報をUI用の形式に変換
        if (taskData.tasks && taskData.tasks.length > 0) {
          // DBにデータがある場合
          const uiTasks: TaskDetail[] = taskData.tasks.map((task, index) => ({
            id: index + 1,
            methodId: task.methodId,
            experimentCondition: Number(task.experimentCondition), // DBから取得した値を明示的に数値型に変換
            trialCount: task.trialCount,
            experimentOrder: task.experimentOrder,
            taskNumberOptions: Array.from({ length: task.trialCount }, (_, i) => i + 1),
            workerLinkedFlg: task.workerLinkedFlg || false, // ワーカー連携フラグを取得
          }));

          setTaskDetails(uiTasks);
          onTasksChange?.(uiTasks);

          // メソッド情報を抽出（簡易版：methodIdから生成）
          const methods: MethodInfo[] = taskData.tasks.map((task) => ({
            id: task.methodId,
            name: task.methodId,
            displayName: task.methodId,
            description: undefined,
          }));
          setAvailableMethods(methods);
          
          // DBにデータがある場合：workerLinkedFlg=falseのタスクIDでcheckedTaskIdsを初期化
          const editableTaskIds = new Set(
            uiTasks.filter(t => !t.workerLinkedFlg).map(t => t.id)
          );
          setCheckedTaskIds(editableTaskIds);
        } else if (taskData.tasks && taskData.tasks.length === 0 && maimlRoot?.protocol?.methods) {
          // DBにデータがない場合、コンテキストのMAIMLから初期値を生成
          
          const methods = maimlRoot.protocol.methods;
          const initialTasks: TaskDetail[] = methods.map((method, index) => ({
            id: index + 1,
            methodId: method.id,
            experimentCondition: 0, // デフォルト値
            trialCount: 1, // デフォルト値
            experimentOrder: index + 1,
            taskNumberOptions: [1],
            workerLinkedFlg: false, // 初期データはfalse
          }));
          
          setTaskDetails(initialTasks);
          onTasksChange?.(initialTasks);
          
          // メソッド情報も設定
          const methodInfos: MethodInfo[] = methods.map((method) => ({
            id: method.id,
            name: method.name || method.id,
            displayName: method.name || method.id,
            description: undefined,
          }));
          setAvailableMethods(methodInfos);
          
          // DBにデータがない場合（初回）：全タスクIDでcheckedTaskIdsを初期化
          const allTaskIds = new Set(initialTasks.map(t => t.id));
          setCheckedTaskIds(allTaskIds);
        } else {
          // MAIMLもない場合は空配列
          setTaskDetails([]);
          setAvailableMethods([]);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : t('taskRegistration.messages.fetchFailed') || 'Failed to fetch task registration';
        message.error(errorMessage);
        console.error('Failed to fetch task registration:', error);
      } finally {
        setLoadingMethods(false);
      }
    };

    fetchTaskRegistration();
  }, [projectName, isActive, refreshInstructions]); // refreshInstructionsを依存配列に追加

  /**
   * タスク詳細を更新
   */
  const handleUpdateTaskDetail = useCallback(
    (id: number, field: keyof TaskDetail, value: string | number) => {
      setTaskDetails((prev) =>
        prev.map((task) => {
          if (task.id === id) {
            if (field === 'experimentCondition') {
              return { ...task, [field]: Number(value) as 0 | 1 };
            }

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
    },
    []
  );

  /**
   * 指示追加ボタンのクリックハンドラ（実験計画ダイアログを開く）
   */
  const handleAddInstructionClick = useCallback((methodId: string) => {
    setSelectedMethodIdForPlan(methodId);
    setIsExperimentPlanDialogOpen(true);
  }, []);

  /**
   * 指示保存ハンドラ（ローカルstateに保存）
   */
  const handleInstructionSave = useCallback((instruction: InstructionData, keepDialogOpen?: boolean) => {
    // instruction_status=0（未送信）として追加
    const newInstruction: InstructionData = {
      ...instruction,
      instruction_status: InstructionStatus.UNSENT,
      isNewlyAdded: true // 新規追加フラグを設定
    };
    
    setInstructions(prev => [...prev, newInstruction]);
    message.success(t('instructionRegistration.messages.added'));
    
    if (!keepDialogOpen) {
      // 両方のダイアログを閉じる
      setIsInstructionDialogOpen(false);
      setIsProjectInstructionDialogOpen(false);
      setSelectedMethodIdForInstruction('');
    }
  }, []);

  /**
   * 指示ダイアログを閉じる
   */
  const handleInstructionDialogClose = useCallback(() => {
    setIsInstructionDialogOpen(false);
    setSelectedMethodIdForInstruction('');
  }, []);

  /**
   * プロジェクト指示ボタンのクリックハンドラ
   */
  const handleProjectInstructionClick = useCallback(() => {
    setIsProjectInstructionDialogOpen(true);
  }, []);

  /**
   * プロジェクト指示ダイアログを閉じる
   */
  const handleProjectInstructionDialogClose = useCallback(() => {
    setIsProjectInstructionDialogOpen(false);
  }, []);

  /**
   * タスクデータを保存
   */
  const handleSave = useCallback(async () => {
    try {
      // バリデーション: 新規追加 + DBから取得したinstruction_status=0の指示
      const unsentInstructions = instructions.filter(inst => inst.instruction_status === InstructionStatus.UNSENT);
      const hasUnsent = unsentInstructions.length > 0;

      // 指示がない場合、チェック済みメソッドに experiment_plan が存在するかを確認
      let hasExperimentPlan = false;
      if (!hasUnsent) {
        const checkedMethodIdsForValidation = taskDetails
          .filter(task => checkedTaskIds.has(task.id) && !task.workerLinkedFlg)
          .map(task => task.methodId);

        for (const methodId of checkedMethodIdsForValidation) {
          const planResult = await getExperimentPlans(projectId, methodId);
          if (planResult && planResult.plans.length > 0) {
            hasExperimentPlan = true;
            break;
          }
        }
      }

      if (!hasUnsent && !hasExperimentPlan) {
        // 指示も実験計画もない場合はエラーを表示して保存を中断する
        message.error(t('taskRegistration.messages.requireInstruction'));
        return;
      }
      
      // 送信用: 新規追加した指示のみをフィルタリング
      const newlyAddedInstructions = instructions.filter(
        inst => inst.isNewlyAdded === true
      );
      
      // チェックが1つもない場合
      if (checkedTaskIds.size === 0) {
        message.warning(t('taskRegistration.messages.selectMethods'));
        return;
      }
      
      // 初回保存かどうかを判定（API取得データを再取得して確認）
      const currentData = await getTaskRegistration(projectId);
      const isFirstSave = !currentData.tasks || currentData.tasks.length === 0;

      // MAIML登録状態チェック（最新データで判定 - stateは古い値の可能性があるため）
      if (!currentData.isMaimlRegistered) {
        message.warning(t('taskRegistration.messages.maimlNotRegistered'));
        return;
      }

      // 初回保存時は全タスクがチェックされているか確認
      if (isFirstSave) {
        const allTaskIds = taskDetails.map(t => t.id);
        const allChecked = allTaskIds.every(id => checkedTaskIds.has(id));
        
        if (!allChecked) {
          message.warning(t('taskRegistration.messages.selectAllMethodsFirst'));
          return;
        }
      }
      
      // チェックされた かつ workerLinkedFlg=false のタスクのみをフィルタリング
      const checkedTasks = taskDetails.filter(task => 
        checkedTaskIds.has(task.id) && !task.workerLinkedFlg
      );
      
      // バリデーション
      const emptyMethod = checkedTasks.find((task) => !task.methodId);
      if (emptyMethod) {
        message.warning(t('taskRegistration.messages.selectAllMethods'));
        return;
      }

      const invalidTrialCount = checkedTasks.find(
        (task) => task.trialCount < 1 || task.trialCount > 999
      );
      if (invalidTrialCount) {
        message.warning(t('taskRegistration.messages.invalidTrialCount'));
        return;
      }

      // チェックアウト状態チェック
      if (isCheckoutLocked) {
        message.warning(t('taskRegistration.messages.checkedOut'));
        return;
      }

      setIsSaving(true);

      // チェックされたタスクのメソッドIDを取得
      const checkedMethodIds = new Set(checkedTasks.map(t => t.methodId));
      
      // 新規追加した指示のみを送信対象としてフィルタリング
      // プロジェクト指示（methodId === ""）またはチェックされたメソッドの指示をフィルタリング
      const checkedInstructions = newlyAddedInstructions.filter((inst: InstructionData) =>
        inst.methodId === '' || checkedMethodIds.has(inst.methodId)
      );

      // API用の指示データを作成
      const instructionSaveItems: InstructionSaveItem[] = checkedInstructions.map((inst: InstructionData) => ({
        methodId: inst.methodId || null,
        content: inst.content,
        targetType: inst.targetType,
        transitionId: inst.transitionId || null,
        taskNumber: inst.taskNumber || null,
        instructionKey: inst.instructionKey || INSTRUCTION_KEY.GENERAL,
      }));

      // workerLinkedFlg=trueの既存タスクの最大experiment_orderを取得
      const maxExistingOrder = taskDetails
        .filter(t => t.workerLinkedFlg)
        .reduce((max, t) => Math.max(max, t.experimentOrder || 0), 0);

      // API用のリクエストデータを作成
      const requestData = {
        tasks: checkedTasks.map((task, index) => {
          const calculatedOrder = maxExistingOrder + index + 1;
          return {
            methodId: task.methodId,
            experimentCondition: task.experimentCondition,
            trialCount: task.trialCount,
            experimentOrder: calculatedOrder, // 既存の最大order + 連番
          };
        }),
        instructions: instructionSaveItems.length > 0 ? instructionSaveItems : undefined,
      };

      // APIを呼び出し
      const response = await saveTaskRegistration(projectId, requestData);

      // 保存成功後、共通関数でstateをクリア + DB再取得
      await refreshInstructions();
      
      onTasksChange?.(checkedTasks);
      message.success(t('taskRegistration.messages.saved'));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t('taskRegistration.messages.saveFailed') || 'Failed to save task';
      message.error(errorMessage);
      console.error('Failed to save task registration:', error);
    } finally {
      setIsSaving(false);
    }
  }, [taskDetails, checkedTaskIds, instructions, availableMethods, projectName, isCheckoutLocked, refreshInstructions, onTasksChange, t]);

  /**
   * ドラッグ&ドロップセンサーの設定
   */
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  /**
   * タスク詳細の順序変更ハンドラ（ドラッグ&ドロップ）
   */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTaskDetails((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        // ドラッグ対象またはドロップ先がworker_linked_flg=trueの場合は順序変更を無効化
        const draggedItem = items[oldIndex];
        const targetItem = items[newIndex];
        
        if (draggedItem?.workerLinkedFlg || targetItem?.workerLinkedFlg) {
          message.warning(t('taskRegistration.messages.cannotChangeOrder'));
          return items; // 変更せず元の配列を返す
        }

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  /**
   * 作業順序の手入力変更ハンドラ
   */
  const handleOrderChange = useCallback((taskId: number, newOrder: number) => {
    setTaskDetails((prev) => {
      // 現在の位置を取得
      const currentIndex = prev.findIndex((task) => task.id === taskId);
      if (currentIndex === -1) return prev;

      // 新しい位置（0-indexed）
      const newIndex = newOrder - 1;

      // 範囲外チェック
      if (newIndex < 0 || newIndex >= prev.length) {
        message.warning(t('taskRegistration.messages.invalidOrder', { max: prev.length.toString() }));
        return prev;
      }

      // 同じ位置なら変更不要
      if (currentIndex === newIndex) return prev;

      // 移動元または移動先がworker_linked_flg=trueの場合は順序変更を無効化
      const movingItem = prev[currentIndex];
      const targetItem = prev[newIndex];
      
      if (movingItem?.workerLinkedFlg || targetItem?.workerLinkedFlg) {
        message.warning(t('taskRegistration.messages.cannotChangeOrder'));
        return prev;
      }

      // 配列を並び替え
      return arrayMove(prev, currentIndex, newIndex);
    });
  }, [t]);

  /**
   * MAIMLのdocument情報からCreatorRef選択肢を生成
   * document.creators[].name or id を選択肢として使用
   */
  const creatorRefOptions = useMemo((): RefOption[] => {
    if (!maimlRoot?.document?.creators) return [];
    return maimlRoot.document.creators
      .filter((c) => Boolean(c.id))
      .map((c) => ({ value: c.id, label: c.name || c.id }));
  }, [maimlRoot]);

  /**
   * MAIMLのdocument情報からInstrumentRef選択肢を生成
   */
  const instrumentRefOptions = useMemo((): RefOption[] => {
    if (!maimlRoot?.document?.instruments) return [];
    return maimlRoot.document.instruments
      .filter((i) => Boolean(i.id))
      .map((i) => ({ value: i.id, label: i.name || i.id }));
  }, [maimlRoot]);

  /**
   * MAIMLのdocument情報からOwnerRef選択肢を生成
   */
  const ownerRefOptions = useMemo((): RefOption[] => {
    if (!maimlRoot?.document?.owners) return [];
    return maimlRoot.document.owners
      .filter((o) => Boolean(o.id))
      .map((o) => ({ value: o.id, label: o.name || o.id }));
  }, [maimlRoot]);

  /**
   * 選択中メソッドのテンプレート一覧を生成
   * material/condition/resultTemplates を TemplateDef[] に変換
   */
  const methodTemplatesForPlan = useMemo((): TemplateDef[] => {
    if (!maimlRoot?.protocol?.methods || !selectedMethodIdForPlan) return [];
    const method = maimlRoot.protocol.methods.find((m) => m.id === selectedMethodIdForPlan);
    if (!method) return [];

    const toTemplateDef = (
      templates: typeof method.materialTemplates,
      category: 'material' | 'condition' | 'result'
    ): TemplateDef[] =>
      (templates ?? []).map((tmpl) => ({
        id: tmpl.id,
        label: tmpl.name || tmpl.id,
        category,
        fields: (tmpl.properties ?? []).map((prop): TemplateField => ({
          key: prop.key || '',
          label: prop.key || '',
          type: 'text',
          units: prop.units,
          description: prop.description,
        })),
      }));

    return [
      ...toTemplateDef(method.materialTemplates, 'material'),
      ...toTemplateDef(method.conditionTemplates, 'condition'),
      ...toTemplateDef(method.resultTemplates, 'result'),
    ];
  }, [maimlRoot, selectedMethodIdForPlan]);

  /**
   * 作業順序のSelectオプション（useMemoでメモ化）
   */
  const orderSelectOptions = useMemo(() => {
    return createRangeOptions(1, taskDetails.length);
  }, [taskDetails.length]);

  /**
   * 順序変更が非活性かどうかを判定する関数（順序変更Selectのみ）
   */
  const isOrderChangeDisabled = useCallback((record: TaskDetail) => {
    return isSaving || loadingMethods || isCheckoutLocked || record.workerLinkedFlg || !isEditable;
  }, [isSaving, loadingMethods, isCheckoutLocked, isEditable]);

  /**
   * チェックボックスが非活性かどうかを判定する関数
   */
  const isCheckboxDisabled = useCallback((record: TaskDetail) => {
    return isSaving || loadingMethods || record.workerLinkedFlg;
  }, [isSaving, loadingMethods]);

  /**
   * 実験条件・試行回数・指示追加ボタンの非活性判定
   * チェックアウト中・ワーカー連携済み・MAIMLエラーあり は変更不可
   */
  const isFieldDisabled = useCallback((record: TaskDetail) => {
    return isSaving || loadingMethods || isCheckoutLocked || record.workerLinkedFlg || !!maimlHasErrors || !!isProjectCompleted || !isEditable;
  }, [isSaving, loadingMethods, isCheckoutLocked, maimlHasErrors, isProjectCompleted, isEditable]);

  /**
   * ドラッグ可能な行コンポーネント
   */
  const DraggableRow = (props: DraggableRowProps) => {
    const { children, ...restProps } = props;
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: restProps['data-row-key'],
    });

    // 行データを取得（workerLinkedFlgチェック用）
    const rowKey = restProps['data-row-key'];
    const rowRecord = taskDetails.find(task => task.id.toString() === rowKey.toString());
    const isRowWorkerLinked = rowRecord?.workerLinkedFlg || false;

    const style: React.CSSProperties = {
      ...restProps.style,
      transform: CSS.Transform.toString(transform),
      transition,
      ...(isDragging ? { position: 'relative', zIndex: 9999 } : {}),
      ...(isRowWorkerLinked ? { 
        backgroundColor: '#f5f5f5',
        opacity: 0.7
      } : {}),
    };

    return (
      <tr
        {...restProps}
        ref={setNodeRef}
        style={style}
        {...attributes}
        data-testid={`task-row-${rowKey}`}
        data-worker-linked={isRowWorkerLinked ? 'true' : 'false'}
      >
        {React.Children.map(children, (child) => {
          if ((child as React.ReactElement).key === 'sort') {
            // worker_linked_flg=trueの場合もドラッグ不可にする
            const isDragDisabled = isCheckoutLocked || isRowWorkerLinked;
            return React.cloneElement(child as React.ReactElement, {}, (
              <div 
                {...(isDragDisabled ? {} : listeners)} 
                style={{ 
                  cursor: isDragDisabled ? 'not-allowed' : 'grab', 
                  padding: '8px',
                  opacity: isDragDisabled ? 0.5 : 1
                }}
                data-testid={`task-drag-handle-${rowKey}`}
                data-drag-disabled={isDragDisabled ? 'true' : 'false'}
              >
                <HolderOutlined />
              </div>
            ));
          }
          return child;
        })}
      </tr>
    );
  };

  /**
   * テーブルのカラム定義
   */
  const columns: ColumnsType<TaskDetail> = [
    {
      key: 'checkbox',
      width: 50,
      align: 'center',
      render: (_text, record) => (
        <input
          type="checkbox"
          checked={checkedTaskIds.has(record.id)}
          onChange={(e) => handleCheckboxChange(record.id, e.target.checked)}
          disabled={isCheckboxDisabled(record)}
          style={{ 
            cursor: isCheckboxDisabled(record) ? 'not-allowed' : 'pointer',
            opacity: record.workerLinkedFlg ? 0.5 : 1
          }}
        />
      ),
    },
    {
      key: 'sort',
      width: 50,
      align: 'center',
    },
    {
      title: t('taskRegistration.columns.order'),
      key: 'order',
      width: 120,
      align: 'center',
      render: (_text, record, index) => {
        // worker_linked_flg=trueのメソッドの位置を取得
        const workerLinkedPositions = taskDetails
          .map((task, idx) => task.workerLinkedFlg ? idx + 1 : null)
          .filter(pos => pos !== null) as number[];
        
        // 現在のメソッド自身がworker_linked_flg=trueの場合は、現在位置のみ選択可能
        const options = record.workerLinkedFlg
          ? [{ label: (index + 1).toString(), value: index + 1 }]
          : createRangeOptions(1, taskDetails.length).filter(
              opt => !workerLinkedPositions.includes(opt.value) || opt.value === index + 1
            );
        
        return (
          <Select
            value={index + 1}
            onChange={(value) => {
              handleOrderChange(record.id, value);
            }}
            disabled={isOrderChangeDisabled(record)}
            size="small"
            style={{ width: '100%' }}
            options={options}
          />
        );
      },
    },
    {
      title: t('taskRegistration.columns.method'),
      key: 'method',
      render: (_text, record) => {
        const method = availableMethods.find((m) => m.id === record.methodId);
        return (
          <div>
            <div>{method?.displayName || t('taskRegistration.labels.methodNotSet')}</div>
            {method?.description && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {method.description}
              </Text>
            )}
          </div>
        );
      },
    },
    {
      title: t('taskRegistration.columns.trialCount'),
      key: 'trialCount',
      width: 120,
      render: (_text, record) => (
        <Input
          type="number"
          value={record.trialCount}
          onChange={(e) => {
            const value = e.target.value;
            if (value === '') {
              handleUpdateTaskDetail(record.id, 'trialCount', '');
            } else {
              const num = parseInt(value, 10);
              if (!isNaN(num) && num >= 1 && num <= 999) {
                handleUpdateTaskDetail(record.id, 'trialCount', num.toString());
              }
            }
          }}
          placeholder={t('taskRegistration.trialCountPlaceholder')}
          disabled={isFieldDisabled(record)}
          size="small"
          min={1}
          max={999}
          style={{ width: '100%' }}
          data-testid={`task-trial-count-input-${record.id}`}
        />
      ),
    },
    {
      title: '',
      key: 'addInstruction',
      width: 120,
      align: 'center',
      render: (_text, record) => {
        return (
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => handleAddInstructionClick(record.methodId)}
            disabled={isFieldDisabled(record)}
            data-testid={`task-add-instruction-button-${record.id}`}
          >
            {t('taskRegistration.buttons.addInstruction')}
          </Button>
        );
      },
    },
  ];

  // ローディング中
  if (loadingMethods) {
    return (
      <div style={{ padding: token.paddingLG, textAlign: 'center' }}>
        <Spin size="large" tip={t('taskRegistration.loading')}>
          <div style={{ minHeight: 100 }} />
        </Spin>
      </div>
    );
  }

  // メソッドが取得できなかった場合
  if (availableMethods.length === 0) {
    return (
      <div style={{ padding: token.paddingLG, textAlign: 'center' }}>
        <Text type="secondary">{t('taskRegistration.noMethods')}</Text>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* MAIMLバリデーションエラー警告バナー */}
      {maimlHasErrors && (
        <Alert
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          message={t('taskRegistration.maimlErrorWarning')}
          style={{ marginBottom: token.marginSM, marginLeft: token.paddingLG, marginRight: token.paddingLG }}
        />
      )}
      <div style={{ marginBottom: token.marginMD, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `0 ${token.paddingLG}px` }}>
        <Text type="secondary">{t('taskRegistration.dragHint')}</Text>
        <Space>
          <Button
            type="primary"
            onClick={handleProjectInstructionClick}
            disabled={loadingMethods || isCheckoutLocked || maimlHasErrors || !!isProjectCompleted || !isEditable}
            data-testid="project-instruction-button"
          >
            {t('taskRegistration.buttons.projectInstruction')}
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={isSaving}
            disabled={loadingMethods || isCheckoutLocked || maimlHasErrors || !!isProjectCompleted || !isEditable}
            data-testid="task-registration-save-button"
          >
            {isSaving ? t('taskRegistration.saving') : t('taskRegistration.saveButton')}
          </Button>
        </Space>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={taskDetails.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <Table
            components={{
              body: {
                row: DraggableRow,
              },
            }}
            dataSource={taskDetails}
            columns={columns}
            rowKey="id"
            size="small"
            pagination={false}
            locale={{
              emptyText: (
                <Empty
                  description={t('taskRegistration.emptyState')}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
          />
        </SortableContext>
      </DndContext>

      {/* タスク指示追加ダイアログ */}
      <InstructionEditDialog
        open={isInstructionDialogOpen}
        mode="create"
        tasks={taskDetails}
        availableMethods={availableMethods}
        availableTransitions={availableTransitions}
        onClose={handleInstructionDialogClose}
        onSave={handleInstructionSave}
        saveMode="local"
      />

      {/* プロジェクト指示追加ダイアログ */}
      <InstructionEditDialog
        open={isProjectInstructionDialogOpen}
        mode="create"
        tasks={taskDetails}
        availableMethods={availableMethods}
        availableTransitions={availableTransitions}
        onClose={handleProjectInstructionDialogClose}
        onSave={handleInstructionSave}
        saveMode="local"
      />

      {/* 実験計画詳細指示ダイアログ */}
      <ExperimentPlanDialog
        open={isExperimentPlanDialogOpen}
        projectId={projectId}
        methodId={selectedMethodIdForPlan}
        taskNumbers={taskDetails
          .filter((t) => t.methodId === selectedMethodIdForPlan)
          .flatMap((t) => Array.from({ length: t.trialCount }, (_, i) => i + 1))}
        creatorRefOptions={creatorRefOptions}
        instrumentRefOptions={instrumentRefOptions}
        ownerRefOptions={ownerRefOptions}
        methodTemplates={methodTemplatesForPlan}
        onClose={() => {
          setIsExperimentPlanDialogOpen(false);
          setSelectedMethodIdForPlan('');
        }}
        onSave={() => {
          message.success(t('taskRegistration.saveMockSuccess'));
        }}
        disabled={isCheckoutLocked || !!maimlHasErrors || !!isProjectCompleted}
        organizationGroupCd={organizationGroupCd}
      />
    </div>
  );
};

export default TaskRegistrationTab;
