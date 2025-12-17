'use client';

import React, { useState, useEffect } from 'react';
import { Modal, List, Typography, Space, Tag, Button, theme } from 'antd';
import { AimOutlined, CheckOutlined } from '@ant-design/icons';
import { projectsData } from '@/data/projectsData';
import { Method } from '@/types/experimentWorker';

const { Text } = Typography;

/**
 * タスクの型定義
 */
interface Task {
  taskId: string;
  taskName: string;
  tag?: string;
}

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

  // 選択中のプロジェクト情報を取得
  const projectData = selectedProject ? projectsData[selectedProject] : null;
  
  // 選択中のメソッド情報を取得
  const methods: Method[] = projectData?.methods || [];
  const methodData = selectedMethodId
    ? methods.find((m) => m.methodId === selectedMethodId)
    : null;
  
  // 選択中のメソッドに紐づくタスク一覧を取得（TODO: 実際のデータはAPIから取得）
  const tasks: Task[] = selectedMethodId
    ? [
        { taskId: 'new', taskName: '新規タスク', tag: '新規' },
        { taskId: 'task001', taskName: 'タスク001' },
        { taskId: 'task002', taskName: 'タスク002' },
        { taskId: 'task003', taskName: 'タスク003' },
      ]
    : [];

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

    return (
      <List.Item
        onClick={() => setTempTaskId(task.taskId)}
        style={{
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
            e.currentTarget.style.backgroundColor = token.colorBgTextHover;
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        <List.Item.Meta
          avatar={<AimOutlined style={{ fontSize: 24, color: token.colorPrimary }} />}
          title={
            <Space>
              <Text strong>{task.taskName}</Text>
              {task.tag && <Tag>{task.tag}</Tag>}
              {isCurrentlySelected && <Tag color="blue">現在選択中</Tag>}
              {isSelected && !isCurrentlySelected && <Tag color="red">選択中</Tag>}
            </Space>
          }
          description={
            <Space direction="vertical" size={0}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {task.taskId}
              </Text>
            </Space>
          }
        />
      </List.Item>
    );
  };

  // モーダルタイトル
  const modalTitle = (
    <Space direction="vertical" size={0}>
      <Space>
        <AimOutlined style={{ color: token.colorPrimary }} />
        <Text strong>タスクを選択</Text>
      </Space>
      <Text type="secondary" style={{ fontSize: 12 }}>
        プロジェクト: {projectData?.projectName || '未選択'} / メソッド: {methodData?.methodName || '未選択'}
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
    >
      <div style={{ maxHeight: 500, overflowY: 'auto' }}>
        {!selectedMethodId ? (
          <Space direction="vertical" align="center" style={{ width: '100%', padding: token.marginXL }}>
            <Text type="secondary">メソッドを選択してください</Text>
          </Space>
        ) : tasks.length === 0 ? (
          <Space direction="vertical" align="center" style={{ width: '100%', padding: token.marginXL }}>
            <Text type="secondary">タスクがありません</Text>
          </Space>
        ) : (
          <List
            dataSource={tasks}
            renderItem={renderTaskItem}
          />
        )}
      </div>
    </Modal>
  );
}
