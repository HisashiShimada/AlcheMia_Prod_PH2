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
  message,
  theme,
  Spin,
  Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SaveOutlined,
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { 
  TaskDetail, 
  MethodInfo, 
  TaskRegistrationData
} from '@/types/taskRegistration';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProjectMaiml } from '@/contexts/ProjectMaimlContext';
import { getTaskRegistration, saveTaskRegistration } from '@/services/projectApiService';
import { createSelectOptionsFromCodeMaster, createRangeOptions } from '@/utils/selectUtils';
import { useCodeMaster } from '@/hooks/useCodeMaster';

const { Text } = Typography;
const { useToken } = theme;

/**
 * タスク登録タブのプロパティ
 */
interface TaskRegistrationTabProps {
  projectId: string;
  projectName: string;
  isActive: boolean;
  onTasksChange?: (tasks: TaskDetail[]) => void;
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
  onTasksChange,
}) => {
  const { token } = useToken();
  const { t } = useLanguage();
  const { maimlRoot } = useProjectMaiml();

  // 状態管理
  const [availableMethods, setAvailableMethods] = useState<MethodInfo[]>([]);
  const [loadingMethods, setLoadingMethods] = useState<boolean>(false);
  const [taskDetails, setTaskDetails] = useState<TaskDetail[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isCheckoutLocked, setIsCheckoutLocked] = useState<boolean>(false);
  const [isMaimlRegistered, setIsMaimlRegistered] = useState<boolean>(false);

  // コードマスターから実験条件オプションを取得
  const { options: experimentConditionOptions, loading: loadingCodeMaster } = useCodeMaster('experiment_condition');

  /**
   * タブがアクティブになった時にタスク登録情報を再取得
   */
  useEffect(() => {
    const fetchTaskRegistration = async () => {
      if (!projectName || !isActive) return;

      console.log('[DEBUG] TaskRegistrationTab - Tab activated, fetching task registration');
      setLoadingMethods(true);

      try {
        const data = await getTaskRegistration(projectName);

        // チェックアウト状態とMAIML登録状態を保存
        setIsCheckoutLocked(data.isCheckoutLocked);
        setIsMaimlRegistered(data.isMaimlRegistered);

        // タスク情報をUI用の形式に変換
        if (data.tasks && data.tasks.length > 0) {
          // DBにデータがある場合
          const uiTasks: TaskDetail[] = data.tasks.map((task, index) => ({
            id: index + 1,
            methodId: task.methodId,
            experimentCondition: Number(task.experimentCondition), // DBから取得した値を明示的に数値型に変換
            trialCount: task.trialCount,
            experimentOrder: task.experimentOrder,
            taskNumberOptions: Array.from({ length: task.trialCount }, (_, i) => i + 1),
          }));

          // デバッグログ：型を確認
          console.log('[DEBUG] TaskRegistrationTab - Converted tasks from DB:', {
            originalTasks: data.tasks,
            uiTasks,
            experimentConditionTypes: uiTasks.map(t => ({
              value: t.experimentCondition,
              type: typeof t.experimentCondition
            }))
          });

          setTaskDetails(uiTasks);
          onTasksChange?.(uiTasks);

          // メソッド情報を抽出（簡易版：methodIdから生成）
          const methods: MethodInfo[] = data.tasks.map((task) => ({
            id: task.methodId,
            name: task.methodId,
            displayName: task.methodId,
            description: undefined,
          }));
          setAvailableMethods(methods);
        } else if (data.tasks && data.tasks.length === 0 && maimlRoot?.protocol?.methods) {
          // DBにデータがない場合、コンテキストのMAIMLから初期値を生成
          console.log('[DEBUG] TaskRegistrationTab - Generating initial tasks from MAIML context');
          
          const methods = maimlRoot.protocol.methods;
          const initialTasks: TaskDetail[] = methods.map((method, index) => ({
            id: index + 1,
            methodId: method.id,
            experimentCondition: 0, // デフォルト値
            trialCount: 1, // デフォルト値
            experimentOrder: index + 1,
            taskNumberOptions: [1],
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
          
          console.log('[DEBUG] TaskRegistrationTab - Initial tasks generated:', {
            taskCount: initialTasks.length,
            methodCount: methodInfos.length,
          });
        } else {
          // MAIMLもない場合は空配列
          console.log('[DEBUG] TaskRegistrationTab - No tasks and no MAIML data');
          setTaskDetails([]);
          setAvailableMethods([]);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'タスク登録情報の取得に失敗しました';
        message.error(errorMessage);
        console.error('Failed to fetch task registration:', error);
      } finally {
        setLoadingMethods(false);
      }
    };

    fetchTaskRegistration();
  }, [projectName, isActive, onTasksChange, maimlRoot]);

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
   * タスクデータを保存
   */
  const handleSave = useCallback(async () => {
    try {
      // バリデーション
      const emptyMethod = taskDetails.find((task) => !task.methodId);
      if (emptyMethod) {
        message.warning(t('taskRegistration.messages.selectAllMethods'));
        return;
      }

      const invalidTrialCount = taskDetails.find(
        (task) => task.trialCount < 1 || task.trialCount > 999
      );
      if (invalidTrialCount) {
        message.warning(t('taskRegistration.messages.invalidTrialCount'));
        return;
      }

      // チェックアウト状態チェック
      if (isCheckoutLocked) {
        message.warning('プロジェクトがチェックアウトされています。保存できません。');
        return;
      }

      // MAIML登録状態チェック
      if (!isMaimlRegistered) {
        message.warning('MAIMLファイルが登録されていません。保存できません。');
        return;
      }

      setIsSaving(true);

      // API用のリクエストデータを作成
      const requestData = {
        tasks: taskDetails.map((task) => ({
          methodId: task.methodId,
          experimentCondition: task.experimentCondition,
          trialCount: task.trialCount,
        })),
      };

      // APIを呼び出し
      const response = await saveTaskRegistration(projectName, requestData);

      onTasksChange?.(taskDetails);
      message.success(response.message || t('taskRegistration.messages.saved'));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'タスク保存エラー';
      message.error(errorMessage);
      console.error('Failed to save task registration:', error);
    } finally {
      setIsSaving(false);
    }
  }, [taskDetails, projectName, isCheckoutLocked, isMaimlRegistered, onTasksChange, t]);

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
        message.warning(t('taskRegistration.messages.invalidOrder').replace('{max}', prev.length.toString()));
        return prev;
      }

      // 同じ位置なら変更不要
      if (currentIndex === newIndex) return prev;

      // 配列を並び替え
      return arrayMove(prev, currentIndex, newIndex);
    });
  }, [t]);

  /**
   * 実験条件のSelectオプション（useMemoでメモ化）
   */
  const experimentConditionSelectOptions = useMemo(() => {
    return createSelectOptionsFromCodeMaster(experimentConditionOptions);
  }, [experimentConditionOptions]);

  /**
   * 作業順序のSelectオプション（useMemoでメモ化）
   */
  const orderSelectOptions = useMemo(() => {
    return createRangeOptions(1, taskDetails.length);
  }, [taskDetails.length]);

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

    const style: React.CSSProperties = {
      ...restProps.style,
      transform: CSS.Transform.toString(transform),
      transition,
      ...(isDragging ? { position: 'relative', zIndex: 9999 } : {}),
    };

    return (
      <tr {...restProps} ref={setNodeRef} style={style} {...attributes}>
        {React.Children.map(children, (child) => {
          if ((child as React.ReactElement).key === 'sort') {
            return React.cloneElement(child as React.ReactElement, {}, (
              <div {...listeners} style={{ cursor: 'grab', padding: '8px' }}>
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
      key: 'sort',
      width: 50,
      align: 'center',
    },
    {
      title: t('taskRegistration.columns.order'),
      key: 'order',
      width: 120,
      align: 'center',
      render: (_text, record, index) => (
        <Select
          value={index + 1}
          onChange={(value) => {
            handleOrderChange(record.id, value);
          }}
          disabled={isSaving || loadingMethods}
          size="small"
          style={{ width: '100%' }}
          options={orderSelectOptions}
        />
      ),
    },
    {
      title: t('taskRegistration.columns.method'),
      key: 'method',
      render: (_text, record) => {
        const method = availableMethods.find((m) => m.id === record.methodId);
        return (
          <div>
            <div>{method?.displayName || 'メソッド未設定'}</div>
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
      title: t('taskRegistration.columns.condition'),
      key: 'condition',
      width: 200,
      render: (_text, record) => (
        <Select
          value={record.experimentCondition}
          onChange={(value) =>
            handleUpdateTaskDetail(record.id, 'experimentCondition', value.toString())
          }
          disabled={isSaving || loadingMethods}
          size="small"
          style={{ width: '100%' }}
          options={experimentConditionSelectOptions}
        />
      ),
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
          disabled={isSaving || loadingMethods}
          size="small"
          min={1}
          max={999}
          style={{ width: '100%' }}
        />
      ),
    },
  ];

  // ローディング中
  if (loadingMethods) {
    return (
      <div style={{ padding: token.paddingLG, textAlign: 'center' }}>
        <Spin size="large" tip={t('taskRegistration.loading')} />
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
      <div style={{ marginBottom: token.marginMD, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `0 ${token.paddingLG}px` }}>
        <Text type="secondary">{t('taskRegistration.dragHint')}</Text>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={isSaving}
          disabled={loadingMethods}
        >
          {isSaving ? t('taskRegistration.saving') : t('taskRegistration.saveButton')}
        </Button>
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
    </div>
  );
};

export default TaskRegistrationTab;
