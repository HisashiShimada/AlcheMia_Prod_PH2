'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Tabs, List, Typography, Space, Tag, Button, theme } from 'antd';
import { FolderOutlined, ToolOutlined, AimOutlined, CheckOutlined } from '@ant-design/icons';
import { projectsData } from '@/data/projectsData';
import { Method } from '@/types/experimentWorker';

const { Text } = Typography;

/**
 * 統合選択ダイアログのProps
 */
interface UnifiedSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  selectedProject: string;
  selectedMethodId: string | null;
  selectedTaskId: string | null;
  onProjectChange: (value: string) => void;
  onSelectMethod: (methodId: string) => void;
  onSelectTask: (taskId: string) => void;
}

/**
 * 統合選択ダイアログコンポーネント
 * プロジェクト、メソッド、タスクを1つのモーダルで選択
 */
export default function UnifiedSelectionDialog({
  open,
  onClose,
  selectedProject,
  selectedMethodId,
  selectedTaskId,
  onProjectChange,
  onSelectMethod,
  onSelectTask,
}: UnifiedSelectionDialogProps) {
  const { token } = theme.useToken();
  const [activeTab, setActiveTab] = useState<string>('project');
  const [tempProject, setTempProject] = useState<string>(selectedProject);
  const [tempMethodId, setTempMethodId] = useState<string | null>(selectedMethodId);
  const [tempTaskId, setTempTaskId] = useState<string | null>(selectedTaskId);

  // ダイアログが開かれた時に現在の選択状態を一時変数に設定
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (open) {
      setTempProject(selectedProject);
      setTempMethodId(selectedMethodId);
      setTempTaskId(selectedTaskId);
    }
  }, [open]);

  // タスクデータ（TODO: 実際のデータはAPIから取得）
  const tasks = [
    { taskId: 'new', taskName: '新規タスク', tag: '新規' },
    { taskId: 'task001', taskName: 'タスク001' },
    { taskId: 'task002', taskName: 'タスク002' },
    { taskId: 'task003', taskName: 'タスク003' },
  ];

  // 選択中のプロジェクトのメソッド一覧を取得
  const methods: Method[] = tempProject ? (projectsData[tempProject]?.methods || []) : [];

  // 決定ボタンの処理
  const handleOk = () => {
    if (tempProject !== selectedProject) {
      onProjectChange(tempProject);
    }
    if (tempMethodId !== selectedMethodId) {
      onSelectMethod(tempMethodId || '');
    }
    if (tempTaskId !== selectedTaskId) {
      onSelectTask(tempTaskId || '');
    }
    onClose();
  };

  // キャンセルボタンの処理
  const handleCancel = () => {
    // 一時変数をリセット
    setTempProject(selectedProject);
    setTempMethodId(selectedMethodId);
    setTempTaskId(selectedTaskId);
    onClose();
  };

  // プロジェクトリストアイテム
  const renderProjectItem = (projectId: string) => {
    const project = projectsData[projectId];
    const isSelected = tempProject === projectId;

    return (
      <List.Item
        onClick={() => {
          setTempProject(projectId);
          // プロジェクトを変更したらメソッドをリセット
          setTempMethodId(null);
        }}
        style={{
          cursor: 'pointer',
          padding: token.paddingMD,
          backgroundColor: isSelected ? token.colorPrimaryBg : 'transparent',
          borderRadius: token.borderRadius,
          marginBottom: token.marginXS,
          transition: 'all 0.2s',
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
          title={
            <Space>
              <Text strong={isSelected}>{project.projectName}</Text>
            </Space>
          }
          description={
            <Space direction="vertical" size={0}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {project.fileName}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {project.methods?.length || 0} メソッド
              </Text>
            </Space>
          }
        />
        {isSelected && <Tag color="red">選択中</Tag>}
      </List.Item>
    );
  };

  // メソッドリストアイテム
  const renderMethodItem = (method: Method) => {
    const isSelected = tempMethodId === method.methodId;

    return (
      <List.Item
        onClick={() => setTempMethodId(method.methodId)}
        style={{
          cursor: 'pointer',
          padding: token.paddingMD,
          backgroundColor: isSelected ? token.colorPrimaryBg : 'transparent',
          borderRadius: token.borderRadius,
          marginBottom: token.marginXS,
          transition: 'all 0.2s',
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
          title={
            <Space>
              <Text strong={isSelected}>{method.methodName}</Text>
            </Space>
          }
          description={
            <Space direction="vertical" size={0}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {method.methodId}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {method.transitions?.length || 0} トランジション
              </Text>
            </Space>
          }
        />
        {isSelected && <Tag color="red">選択中</Tag>}
      </List.Item>
    );
  };

  // タスクリストアイテム
  const renderTaskItem = (task: { taskId: string; taskName: string; tag?: string }) => {
    const isSelected = tempTaskId === task.taskId;

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
          title={
            <Space>
              <Text strong={isSelected}>{task.taskName}</Text>
              {task.tag && (
                <Tag color={isSelected ? 'red' : 'default'}>{task.tag}</Tag>
              )}
            </Space>
          }
        />
        {isSelected && <Tag color="red">選択中</Tag>}
      </List.Item>
    );
  };

  // タブアイテム
  const tabItems = [
    {
      key: 'project',
      label: (
        <Space>
          <FolderOutlined />
          <Text>プロジェクト</Text>
        </Space>
      ),
      children: (
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          <List
            dataSource={Object.keys(projectsData)}
            renderItem={renderProjectItem}
          />
        </div>
      ),
    },
    {
      key: 'method',
      label: (
        <Space>
          <ToolOutlined />
          <Text>メソッド</Text>
        </Space>
      ),
      children: (
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {!tempProject ? (
            <Space direction="vertical" align="center" style={{ width: '100%', padding: token.marginXL }}>
              <Text type="secondary">プロジェクトを選択してください</Text>
            </Space>
          ) : methods.length === 0 ? (
            <Space direction="vertical" align="center" style={{ width: '100%', padding: token.marginXL }}>
              <Text type="secondary">メソッドがありません</Text>
            </Space>
          ) : (
            <List
              dataSource={methods}
              renderItem={renderMethodItem}
            />
          )}
        </div>
      ),
    },
    {
      key: 'task',
      label: (
        <Space>
          <AimOutlined />
          <Text>タスク</Text>
        </Space>
      ),
      children: (
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {!tempProject ? (
            <Space direction="vertical" align="center" style={{ width: '100%', padding: token.marginXL }}>
              <Text type="secondary">プロジェクトを選択してください</Text>
            </Space>
          ) : (
            <List
              dataSource={tasks}
              renderItem={renderTaskItem}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      onOk={handleOk}
      width={700}
      title={
        <Space>
          <CheckOutlined style={{ color: token.colorPrimary }} />
          <Text strong>プロジェクト・メソッド・タスク選択</Text>
        </Space>
      }
      okText="決定"
      cancelText="キャンセル"
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
      />
    </Modal>
  );
}
