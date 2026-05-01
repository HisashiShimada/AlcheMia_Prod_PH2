'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Typography, Space, Tag, Button, theme } from 'antd';
import { AimOutlined, CheckOutlined } from '@ant-design/icons';
import { Method, Task } from '@/types/experimentWorker';

const { Text } = Typography;

/**
 * タスク選択ダイアログのProps
 */
interface TaskSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  selectedProject: string;
  selectedMethodId: string | null;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  /** APIから取得したメソッド一覧 */
  methods?: Method[];
  /** 表示用のプロジェクト名 */
  projectName?: string;
}

/**
 * タスク選択ダイアログコンポーネント
 * 選択済みのプロジェクト・メソッドに紐づくタスクを選択
 */
export default function TaskSelectionDialog({
  open,
  onClose,
  selectedProject,
  selectedMethodId,
  selectedTaskId,
  onSelectTask,
  methods: propsMethods = [],
  projectName,
}: TaskSelectionDialogProps) {
  const { token } = theme.useToken();
  const [tempTaskId, setTempTaskId] = useState<string | null>(selectedTaskId);

  // ダイアログが開かれた時に現在の選択状態を一時変数に設定
  useEffect(() => {
    if (open) {
      setTempTaskId(selectedTaskId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 選択中のメソッド情報を取得（propsから受け取ったメソッド一覧から検索）
  const methodData = selectedMethodId
    ? propsMethods.find((m) => m.methodId === selectedMethodId)
    : null;
  
  // 選択中のメソッドに紐づくタスク一覧を取得
  const tasks: Task[] = methodData?.tasks || [];

  // 決定ボタンの処理
  const handleOk = () => {
    if (tempTaskId !== selectedTaskId) {
      onSelectTask(tempTaskId || '');
    }
    onClose();
  };

  // キャンセルボタンの処理
  const handleCancel = () => {
    // 一時変数をリセット
    setTempTaskId(selectedTaskId);
    onClose();
  };

  // タスクリストアイテム
  const renderTaskItem = (task: Task) => {
    const isSelected = tempTaskId === task.taskId;
    const isCurrentlySelected = selectedTaskId === task.taskId;

    // ステータスに応じたタグ表示
    const getStatusTag = (status: string) => {
      switch (status) {
        case 'not_started':
          return <Tag>未着手</Tag>;
        case 'started':
          return <Tag color="blue">着手</Tag>;
        case 'in_progress':
          return <Tag color="orange">進行中</Tag>;
        case 'completed':
          return <Tag color="green">完了</Tag>;
        case 'suspended':
          return <Tag color="red">中断</Tag>;
        case 'forced_terminated':
          return <Tag color="red">強制終了</Tag>;
        default:
          return null;
      }
    };

    return (
      <div
        onClick={() => setTempTaskId(task.taskId)}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          cursor: 'pointer',
          padding: token.paddingMD,
          backgroundColor: isSelected ? token.colorPrimaryBg : 'transparent',
          borderRadius: token.borderRadius,
          marginBottom: token.marginXS,
          transition: 'all 0.2s',
          border: isCurrentlySelected ? `1px solid ${token.colorPrimary}` : '1px solid transparent',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            (e.currentTarget as HTMLDivElement).style.backgroundColor = token.colorBgTextHover;
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
          }
        }}
      >
        <AimOutlined style={{ fontSize: 24, color: token.colorPrimary, marginRight: 12, marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <Space>
            <Text strong>{task.taskName}</Text>
            {getStatusTag(task.status)}
            {isCurrentlySelected && <Tag color="blue">現在選択中</Tag>}
            {isSelected && !isCurrentlySelected && <Tag color="red">選択中</Tag>}
          </Space>
          <Space orientation="vertical" size={0} style={{ display: 'flex', flexDirection: 'column' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              タスクID: {task.taskId}
            </Text>
            {task.sampleNumber && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                サンプル番号: {task.sampleNumber}
              </Text>
            )}
            {task.notes && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                備考: {task.notes}
              </Text>
            )}
          </Space>
        </div>
      </div>
    );
  };

  // モーダルタイトル
  const modalTitle = (
    <Space orientation="vertical" size={0}>
      <Space>
        <AimOutlined style={{ color: token.colorPrimary }} />
        <Text strong>タスクを選択</Text>
      </Space>
      <Text type="secondary" style={{ fontSize: 12 }}>
        プロジェクト: {projectName || '未選択'} / メソッド: {methodData?.methodName || '未選択'}
      </Text>
    </Space>
  );

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      onOk={handleOk}
      width={700}
      title={modalTitle}
      okText="決定"
      cancelText="キャンセル"
      okButtonProps={{
        disabled: !tempTaskId,
        icon: <CheckOutlined />,
      }}
      data-testid="task-selection-dialog"
    >
      <div style={{ maxHeight: 500, overflowY: 'auto' }} data-testid="task-selection-dialog-content">
        {!selectedProject ? (
          <Space orientation="vertical" align="center" style={{ width: '100%', padding: token.marginXL }} data-testid="task-selection-no-project">
            <AimOutlined style={{ fontSize: 48, color: token.colorTextDisabled }} />
            <Text type="secondary">プロジェクトを選択してください</Text>
          </Space>
        ) : !selectedMethodId ? (
          <Space orientation="vertical" align="center" style={{ width: '100%', padding: token.marginXL }} data-testid="task-selection-no-method">
            <AimOutlined style={{ fontSize: 48, color: token.colorTextDisabled }} />
            <Text type="secondary">メソッドを選択してください</Text>
          </Space>
        ) : tasks.length === 0 ? (
          <Space orientation="vertical" align="center" style={{ width: '100%', padding: token.marginXL }} data-testid="task-selection-no-tasks">
            <AimOutlined style={{ fontSize: 48, color: token.colorTextDisabled }} />
            <Text type="secondary">選択されたメソッドにタスクがありません</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              プロジェクト: {projectName || '未選択'}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              メソッド: {methodData?.methodName || '未選択'}
            </Text>
          </Space>
        ) : (
          <div style={{ padding: `${token.paddingSM}px 0` }} data-testid="task-selection-list">
            {tasks.map((task) => (
              <React.Fragment key={task.taskId}>
                {renderTaskItem(task)}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
