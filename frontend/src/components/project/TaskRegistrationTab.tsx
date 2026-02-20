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
import type { TaskDetail, MethodInfo, TaskRegistrationData } from '@/types/taskRegistration';
import { useLanguage } from '@/contexts/LanguageContext';

const { Text } = Typography;
const { useToken } = theme;

/**
 * タスク登録タブのプロパティ
 */
interface TaskRegistrationTabProps {
  projectId: string;
  projectName: string;
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
  onTasksChange,
}) => {
  const { token } = useToken();
  const { t } = useLanguage();

  // 状態管理
  const [availableMethods, setAvailableMethods] = useState<MethodInfo[]>([]);
  const [loadingMethods, setLoadingMethods] = useState<boolean>(false);
  const [taskDetails, setTaskDetails] = useState<TaskDetail[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  /**
   * ローカルストレージのキー
   */
  const storageKey = useMemo(() => `task-registration-${projectId}`, [projectId]);

  /**
   * MAIMLファイルからメソッド情報を取得
   */
  useEffect(() => {
    const fetchMethods = async () => {
      if (!projectId) return;

      setLoadingMethods(true);

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

        setAvailableMethods(mockMethods);

        // 保存されたデータがあれば復元
        const savedData = localStorage.getItem(storageKey);
        if (savedData) {
          try {
            const parsed: TaskRegistrationData = JSON.parse(savedData);
            if (parsed.projectId === projectId && parsed.tasks.length > 0) {
              setTaskDetails(parsed.tasks);
              message.success(t('taskRegistration.messages.restored'));
              onTasksChange?.(parsed.tasks);
              return;
            }
          } catch (error) {
            console.error('Failed to parse saved task data:', error);
          }
        }

        // 保存データがない場合、初期化
        const initialTasks: TaskDetail[] = mockMethods.map((method, index) => ({
          id: index + 1,
          methodId: method.id,
          experimentCondition: 0,
          trialCount: 1,
          taskNumberOptions: [1],
        }));

        setTaskDetails(initialTasks);
        onTasksChange?.(initialTasks);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'メソッド取得エラー';
        message.error(errorMessage);
      } finally {
        setLoadingMethods(false);
      }
    };

    fetchMethods();
  }, [projectId, storageKey, onTasksChange]);

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

      setIsSaving(true);

      const dataToSave: TaskRegistrationData = {
        projectId,
        projectName,
        tasks: taskDetails,
        savedAt: new Date().toISOString(),
      };

      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      onTasksChange?.(taskDetails);

      message.success(t('taskRegistration.messages.saved'));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'タスク保存エラー';
      message.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }, [taskDetails, projectId, projectName, storageKey, onTasksChange, t]);

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
          options={Array.from({ length: taskDetails.length }, (_, i) => ({
            value: i + 1,
            label: `${i + 1}`,
          }))}
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
        >
          <Select.Option value={0}>{t('taskRegistration.condition.same')}</Select.Option>
          <Select.Option value={1}>{t('taskRegistration.condition.different')}</Select.Option>
        </Select>
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
