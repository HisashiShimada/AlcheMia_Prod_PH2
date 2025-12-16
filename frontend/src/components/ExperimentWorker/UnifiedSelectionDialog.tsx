'use client';

import React, { useState, useEffect } from 'react';
import { Modal, List, Typography, Space, Tag, Button, theme } from 'antd';
import { FolderOutlined, ToolOutlined, CheckOutlined, ArrowLeftOutlined } from '@ant-design/icons';
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
type SelectionStep = 'project' | 'method';

/**
 * 統合選択ダイアログコンポーネント
 * プロジェクト選択 → メソッド選択の2ステップで選択
 */
export default function UnifiedSelectionDialog({
  open,
  onClose,
  selectedProject,
  selectedMethodId,
  onProjectChange,
  onSelectMethod,
}: UnifiedSelectionDialogProps) {
  const { token } = theme.useToken();
  const [step, setStep] = useState<SelectionStep>('project');
  const [tempProject, setTempProject] = useState<string>(selectedProject);
  const [tempMethodId, setTempMethodId] = useState<string | null>(selectedMethodId);

  // ダイアログが開かれた時に現在の選択状態を一時変数に設定し、ステップをリセット
  useEffect(() => {
    if (open) {
      setTempProject(selectedProject);
      setTempMethodId(selectedMethodId);
      setStep('project');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 選択中のプロジェクトのメソッド一覧を取得
  const methods: Method[] = tempProject ? (projectsData[tempProject]?.methods || []) : [];

  // プロジェクト選択時の処理
  const handleProjectSelect = (projectId: string) => {
    setTempProject(projectId);
    setTempMethodId(null); // プロジェクト変更時はメソッドをリセット
    setStep('method'); // メソッド選択ステップに進む
  };

  // 決定ボタンの処理
  const handleOk = () => {
    if (tempProject !== selectedProject) {
      onProjectChange(tempProject);
    }
    if (tempMethodId !== selectedMethodId) {
      onSelectMethod(tempMethodId || '');
    }
    onClose();
  };

  // キャンセルボタンの処理
  const handleCancel = () => {
    // 一時変数をリセット
    setTempProject(selectedProject);
    setTempMethodId(selectedMethodId);
    setStep('project');
    onClose();
  };

  // 戻るボタンの処理
  const handleBack = () => {
    setStep('project');
  };

  // プロジェクトリストアイテム
  const renderProjectItem = (projectId: string) => {
    const project = projectsData[projectId];
    const isSelected = tempProject === projectId;
    const isCurrentlySelected = selectedProject === projectId;

    return (
      <List.Item
        onClick={() => handleProjectSelect(projectId)}
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
          avatar={<FolderOutlined style={{ fontSize: 24, color: token.colorPrimary }} />}
          title={
            <Space>
              <Text strong>{project.projectName}</Text>
              {isCurrentlySelected && <Tag color="blue">現在選択中</Tag>}
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
      </List.Item>
    );
  };

  // メソッドリストアイテム
  const renderMethodItem = (method: Method) => {
    const isSelected = tempMethodId === method.methodId;
    const isCurrentlySelected = selectedMethodId === method.methodId;

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
          avatar={<ToolOutlined style={{ fontSize: 24, color: token.colorInfo }} />}
          title={
            <Space>
              <Text strong>{method.methodName}</Text>
              {isCurrentlySelected && <Tag color="blue">現在選択中</Tag>}
              {isSelected && !isCurrentlySelected && <Tag color="red">選択中</Tag>}
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
      </List.Item>
    );
  };

  // ステップに応じたタイトルとアイコンを取得
  const getModalTitle = () => {
    if (step === 'project') {
      return (
        <Space>
          <FolderOutlined style={{ color: token.colorPrimary }} />
          <Text strong>プロジェクトを選択</Text>
        </Space>
      );
    } else {
      const projectName = tempProject ? projectsData[tempProject]?.projectName : '';
      return (
        <Space>
          <ToolOutlined style={{ color: token.colorInfo }} />
          <Text strong>メソッドを選択</Text>
          <Text type="secondary" style={{ fontSize: 14 }}>
            （プロジェクト: {projectName}）
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
          <List
            dataSource={Object.keys(projectsData)}
            renderItem={renderProjectItem}
          />
        </div>
      );
    } else {
      return (
        <div style={{ maxHeight: 500, overflowY: 'auto' }}>
          {methods.length === 0 ? (
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
      );
    }
  };

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      onOk={step === 'method' ? handleOk : undefined}
      width={700}
      title={getModalTitle()}
      okText="決定"
      cancelText="キャンセル"
      okButtonProps={{
        disabled: step === 'method' && !tempMethodId,
      }}
      footer={
        step === 'project' ? (
          <Space>
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
              disabled={!tempMethodId}
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
