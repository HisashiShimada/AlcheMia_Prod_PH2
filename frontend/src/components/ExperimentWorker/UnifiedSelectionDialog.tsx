'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Typography, Space, Tag, Button, theme } from 'antd';
import { FolderOutlined, ToolOutlined, AimOutlined, CheckOutlined, ArrowLeftOutlined, MinusOutlined } from '@ant-design/icons';
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
 * 選択ステップの型定義
 */
type SelectionStep = 'project' | 'method' | 'task';

/**
 * タスクの型定義
 */
interface Task {
  taskId: string;
  taskName: string;
  tag?: string;
}

/**
 * 統合選択ダイアログコンポーネント
 * プロジェクト選択 → メソッド選択 → タスク選択の3ステップで選択
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
  const [step, setStep] = useState<SelectionStep>('project');
  const [tempProject, setTempProject] = useState<string>(selectedProject);
  const [tempMethodId, setTempMethodId] = useState<string | null>(selectedMethodId);
  const [tempTaskId, setTempTaskId] = useState<string | null>(selectedTaskId);

  // ダイアログが開かれた時に現在の選択状態を一時変数に設定し、ステップをリセット
  useEffect(() => {
    if (open) {
      setTempProject(selectedProject);
      setTempMethodId(selectedMethodId);
      setTempTaskId(selectedTaskId);
      setStep('project');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 選択中のプロジェクトのメソッド一覧を取得
  const methods: Method[] = tempProject ? (projectsData[tempProject]?.methods || []) : [];
  
  // 選択中のメソッドに紐づくタスク一覧を取得（TODO: 実際のデータはAPIから取得）
  const tasks: Task[] = tempMethodId
    ? [
        { taskId: 'new', taskName: '新規タスク', tag: '新規' },
        { taskId: 'task001', taskName: 'タスク001' },
        { taskId: 'task002', taskName: 'タスク002' },
        { taskId: 'task003', taskName: 'タスク003' },
      ]
    : [];

  // プロジェクト選択時の処理
  const handleProjectSelect = (projectId: string) => {
    setTempProject(projectId);
    setTempMethodId(null); // プロジェクト変更時はメソッドをリセット
    setTempTaskId(null); // プロジェクト変更時はタスクをリセット
    
    // "-" が選択された場合は、すぐに決定する
    if (!projectId) {
      handleOk();
    } else {
      setStep('method'); // メソッド選択ステップに進む
    }
  };

  // メソッド選択時の処理
  const handleMethodSelect = (methodId: string) => {
    setTempMethodId(methodId);
    setTempTaskId(null); // メソッド変更時はタスクをリセット
    
    // "-" が選択された場合は、すぐに決定する
    if (!methodId) {
      handleOk();
    } else {
      setStep('task'); // タスク選択ステップに進む
    }
  };

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
    setStep('project');
    onClose();
  };

  // 戻るボタンの処理
  const handleBack = () => {
    if (step === 'task') {
      setStep('method');
    } else if (step === 'method') {
      setStep('project');
    }
  };

  // "-" 選択アイテムをレンダリング
  const renderEmptyOption = (type: 'project' | 'method') => {
    const isSelected = type === 'project' ? !tempProject : !tempMethodId;
    const isCurrentlySelected = type === 'project' ? !selectedProject : !selectedMethodId;
    const icon = type === 'project' ? <FolderOutlined /> : <ToolOutlined />;
    const label = type === 'project' ? 'プロジェクト' : 'メソッド';
    const color = type === 'project' ? token.colorPrimary : token.colorInfo;

    return (
      <div
        onClick={() => type === 'project' ? handleProjectSelect('') : handleMethodSelect('')}
        style={{
          display: 'flex', alignItems: 'flex-start',
          cursor: 'pointer', padding: token.paddingMD,
          backgroundColor: isSelected ? token.colorPrimaryBg : 'transparent',
          borderRadius: token.borderRadius, marginBottom: token.marginXS,
          transition: 'all 0.2s',
          border: isCurrentlySelected ? `1px solid ${token.colorPrimary}` : '1px solid transparent',
        }}
        onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = token.colorBgTextHover; }}
        onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'; }}
      >
        {React.cloneElement(icon, { style: { fontSize: 24, color, marginRight: 12, marginTop: 2 } })}
        <div style={{ flex: 1 }}>
          <Space>
            <Text strong>-</Text>
            {isCurrentlySelected && <Tag color="blue">現在選択中</Tag>}
            {isSelected && !isCurrentlySelected && <Tag color="red">選択中</Tag>}
          </Space>
          <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{label}を選択しない</Text>
        </div>
      </div>
    );
  };

  // プロジェクトリストアイテム
  const renderProjectItem = (projectId: string) => {
    const project = projectsData[projectId];
    const isSelected = tempProject === projectId;
    const isCurrentlySelected = selectedProject === projectId;
    return (
      <div
        key={projectId}
        onClick={() => handleProjectSelect(projectId)}
        style={{
          display: 'flex', alignItems: 'flex-start',
          cursor: 'pointer', padding: token.paddingMD,
          backgroundColor: isSelected ? token.colorPrimaryBg : 'transparent',
          borderRadius: token.borderRadius, marginBottom: token.marginXS,
          transition: 'all 0.2s',
          border: isCurrentlySelected ? `1px solid ${token.colorPrimary}` : '1px solid transparent',
        }}
        onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = token.colorBgTextHover; }}
        onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'; }}
      >
        <FolderOutlined style={{ fontSize: 24, color: token.colorPrimary, marginRight: 12, marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <Space>
            <Text strong>{project.projectName}</Text>
            {isCurrentlySelected && <Tag color="blue">現在選択中</Tag>}
          </Space>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{project.fileName}</Text>
            <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{project.methods?.length || 0} メソッド</Text>
          </div>
        </div>
      </div>
    );
  };

  // メソッドリストアイテム
  const renderMethodItem = (method: Method) => {
    const isSelected = tempMethodId === method.methodId;
    const isCurrentlySelected = selectedMethodId === method.methodId;
    return (
      <div
        key={method.methodId}
        onClick={() => handleMethodSelect(method.methodId)}
        style={{
          display: 'flex', alignItems: 'flex-start',
          cursor: 'pointer', padding: token.paddingMD,
          backgroundColor: isSelected ? token.colorPrimaryBg : 'transparent',
          borderRadius: token.borderRadius, marginBottom: token.marginXS,
          transition: 'all 0.2s',
          border: isCurrentlySelected ? `1px solid ${token.colorPrimary}` : '1px solid transparent',
        }}
        onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = token.colorBgTextHover; }}
        onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'; }}
      >
        <ToolOutlined style={{ fontSize: 24, color: token.colorInfo, marginRight: 12, marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <Space>
            <Text strong>{method.methodName}</Text>
            {isCurrentlySelected && <Tag color="blue">現在選択中</Tag>}
          </Space>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{method.methodId}</Text>
            <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{method.transitions?.length || 0} トランジション</Text>
          </div>
        </div>
      </div>
    );
  };

  // タスクリストアイテム
  const renderTaskItem = (task: Task) => {
    const isSelected = tempTaskId === task.taskId;
    const isCurrentlySelected = selectedTaskId === task.taskId;
    return (
      <div
        key={task.taskId}
        onClick={() => setTempTaskId(task.taskId)}
        style={{
          display: 'flex', alignItems: 'flex-start',
          cursor: 'pointer', padding: token.paddingMD,
          backgroundColor: isSelected ? token.colorPrimaryBg : 'transparent',
          borderRadius: token.borderRadius, marginBottom: token.marginXS,
          transition: 'all 0.2s',
          border: isCurrentlySelected ? `1px solid ${token.colorPrimary}` : '1px solid transparent',
        }}
        onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = token.colorBgTextHover; }}
        onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'; }}
      >
        <AimOutlined style={{ fontSize: 24, color: token.colorPrimary, marginRight: 12, marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <Space>
            <Text strong>{task.taskName}</Text>
            {task.tag && <Tag>{task.tag}</Tag>}
            {isCurrentlySelected && <Tag color="blue">現在選択中</Tag>}
            {isSelected && !isCurrentlySelected && <Tag color="red">選択中</Tag>}
          </Space>
          <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{task.taskId}</Text>
        </div>
      </div>
    );
  };

  // ステップに応じたタイトルとアイコンを取得
  const getModalTitle = () => {
    const projectName = tempProject ? projectsData[tempProject]?.projectName : '';
    const methodName = tempMethodId
      ? methods.find((m) => m.methodId === tempMethodId)?.methodName
      : '';

    if (step === 'project') {
      return (
        <Space>
          <FolderOutlined style={{ color: token.colorPrimary }} />
          <Text strong>プロジェクトを選択</Text>
        </Space>
      );
    } else if (step === 'method') {
      return (
        <Space>
          <ToolOutlined style={{ color: token.colorInfo }} />
          <Text strong>メソッドを選択</Text>
          <Text type="secondary" style={{ fontSize: 14 }}>
            （プロジェクト: {projectName}）
          </Text>
        </Space>
      );
    } else {
      return (
        <Space>
          <AimOutlined style={{ color: token.colorPrimary }} />
          <Text strong>タスクを選択</Text>
          <Text type="secondary" style={{ fontSize: 14 }}>
            （プロジェクト: {projectName} / メソッド: {methodName}）
          </Text>
        </Space>
      );
    }
  };

  // ステップに応じたコンテンツを取得
  const getModalContent = () => {
    if (step === 'project') {
      return (
        <div style={{ maxHeight: 500, overflowY: 'auto' }}>
          {renderEmptyOption('project')}
          {Object.keys(projectsData).map(renderProjectItem)}
        </div>
      );
    } else if (step === 'method') {
      return (
        <div style={{ maxHeight: 500, overflowY: 'auto' }}>
          {renderEmptyOption('method')}
          {methods.length === 0 ? (
            <Space orientation="vertical" align="center" style={{ width: '100%', padding: token.marginXL }}>
              <Text type="secondary">メソッドがありません</Text>
            </Space>
          ) : (
            methods.map(renderMethodItem)
          )}
        </div>
      );
    } else {
      return (
        <div style={{ maxHeight: 500, overflowY: 'auto' }}>
          {tasks.length === 0 ? (
            <Space orientation="vertical" align="center" style={{ width: '100%', padding: token.marginXL }}>
              <Text type="secondary">タスクがありません</Text>
            </Space>
          ) : (
            <div>{tasks.map(renderTaskItem)}</div>
          )}
        </div>
      );
    }
  };

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      width={700}
      title={getModalTitle()}
      okText="決定"
      cancelText="キャンセル"
      data-testid="unified-selection-dialog"
      footer={
        step === 'project' ? (
          <Space>
            <Button onClick={handleCancel}>キャンセル</Button>
          </Space>
        ) : step === 'method' ? (
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
              戻る
            </Button>
            <Button onClick={handleCancel}>キャンセル</Button>
          </Space>
        ) : (
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
              戻る
            </Button>
            <Button onClick={handleCancel}>キャンセル</Button>
            <Button
              type="primary"
              onClick={handleOk}
              disabled={!tempTaskId}
              icon={<CheckOutlined />}
            >
              決定
            </Button>
          </Space>
        )
      }
    >
      {getModalContent()}
    </Modal>
  );
}
