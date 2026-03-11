'use client';

import React from 'react';
import { Button, Select, Space, Typography, theme } from 'antd';
import { CheckOutlined, CheckSquareOutlined, PartitionOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * メソッド・タスク選択エリアのProps
 */
interface MethodTaskSelectorProps {
  // プロジェクト選択状態
  selectedProject: string;
  
  // メソッド関連
  selectedMethodId: string | null;
  onSelectMethod: (methodId: string | null) => void;
  methods: Array<{ methodId: string; methodName: string }>;
  
  // タスク関連
  selectedTaskId: string;
  onSelectTask: (taskId: string) => void;
  tasks: Array<{ taskId: string; taskName: string }>;
  
  // モーダル制御
  onOpenModal: () => void;
  
  // Disabled状態
  methodDisabled?: boolean;
  taskDisabled?: boolean;
}

/**
 * メソッド・タスク選択エリア（共通コンポーネント）
 * 
 * 指示確認タブと実験記録タブで共通で使用されるメソッド・タスク選択UI
 */
export default function MethodTaskSelector({
  selectedProject,
  selectedMethodId,
  onSelectMethod,
  methods,
  selectedTaskId,
  onSelectTask,
  tasks,
  onOpenModal,
  methodDisabled = false,
  taskDisabled = false,
}: MethodTaskSelectorProps) {
  // テーマトークンを取得（UIポリシー準拠）
  const { token } = theme.useToken();

  // Selectコンポーネント用のオプションを生成
  const taskOptions = [
    { label: '-', value: '' },
    ...tasks.map((task) => ({
      label: task.taskName,
      value: task.taskId,
    })),
  ];

  return (
    <div
      style={{ 
        marginBottom: 8,
        height: 56,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: token.paddingLG,
        paddingRight: token.paddingLG,
        backgroundColor: token.colorBgContainer,
        border: `1px solid ${token.colorBorder}`,
        borderRadius: 0,
      }}
    >
      <div style={{ width: '100%' }}>
        {/* メソッド選択 + タスク選択（コンボボックス） + 選択ボタン */}
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: token.margin }}>
          {/* メソッド選択 */}
          <Space size="middle" style={{ minWidth: 300, maxWidth: 400 }}>
            <PartitionOutlined style={{ fontSize: 16, color: token.colorPrimary }} />
            <Text strong style={{ minWidth: 80 }}>メソッド:</Text>
            <Select
              data-testid="method-select"
              style={{ width: 200 }}
              placeholder="メソッドを選択してください"
              value={selectedMethodId || undefined}
              onChange={(value) => onSelectMethod(value || null)}
              options={[
                { label: '-', value: '' },
                ...methods.map((method) => ({
                  label: method.methodName,
                  value: method.methodId,
                })),
              ]}
              disabled={methodDisabled}
              size="large"
            />
          </Space>
          
          {/* タスク選択 + 選択ボタン */}
          <Space size="middle" style={{ minWidth: 300, maxWidth: 400 }}>
            <CheckSquareOutlined style={{ fontSize: 16, color: token.colorPrimary }} />
            <Text strong style={{ minWidth: 80 }}>タスク:</Text>
            <Select
              data-testid="task-select"
              style={{ width: 200 }}
              placeholder="タスクを選択してください"
              value={selectedTaskId || ''}
              onChange={onSelectTask}
              options={taskOptions}
              disabled={taskDisabled}
              size="large"
            />
            <Button
              data-testid="method-task-select-button"
              type="primary"
              icon={<CheckOutlined />}
              onClick={onOpenModal}
              size="large"
              disabled={!selectedProject}
            >
              選択
            </Button>
          </Space>
        </div>
      </div>
    </div>
  );
}
