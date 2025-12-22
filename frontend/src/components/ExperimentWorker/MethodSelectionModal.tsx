'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal, List, Typography, Space, Tag, Button, theme } from 'antd';
import { ToolOutlined, MinusOutlined, CheckOutlined } from '@ant-design/icons';
import { projectsData } from '@/data/projectsData';

const { Text } = Typography;

/**
 * メソッド選択モーダルのProps
 */
interface MethodSelectionModalProps {
  open: boolean;
  onClose: () => void;
  selectedProject: string;
  selectedMethodId: string | null;
  onMethodChange: (methodId: string | null) => void;
}

/**
 * メソッド選択モーダルコンポーネント
 * プロジェクトに紐づくメソッドを選択するためのモーダル
 */
export default function MethodSelectionModal({
  open,
  onClose,
  selectedProject,
  selectedMethodId,
  onMethodChange,
}: MethodSelectionModalProps) {
  const { token } = theme.useToken();
  const [tempMethodId, setTempMethodId] = useState<string | null>(selectedMethodId);

  // ダイアログが開かれた時に現在の選択状態を一時変数に設定
  useEffect(() => {
    if (open) {
      setTempMethodId(selectedMethodId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 選択されたプロジェクトのメソッド一覧を取得
  const methods = useMemo(() => {
    if (!selectedProject) return [];
    const project = projectsData[selectedProject];
    return project?.methods || [];
  }, [selectedProject]);

  // プロジェクト情報を取得（所有者情報用）
  const projectInfo = useMemo(() => {
    if (!selectedProject) return null;
    return projectsData[selectedProject];
  }, [selectedProject]);

  // 決定ボタンの処理
  const handleOk = () => {
    onMethodChange(tempMethodId);
    onClose();
  };

  // キャンセルボタンの処理
  const handleCancel = () => {
    // 一時変数をリセット
    setTempMethodId(selectedMethodId);
    onClose();
  };

  // 「未選択」アイテムをレンダリング
  const renderEmptyOption = () => {
    const isSelected = !tempMethodId;
    const isCurrentlySelected = !selectedMethodId;

    return (
      <List.Item
        onClick={() => setTempMethodId(null)}
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
          avatar={<MinusOutlined style={{ fontSize: 24, color: token.colorTextSecondary }} />}
          title={
            <Space>
              <Text strong>未選択</Text>
              {isCurrentlySelected && <Tag color="blue">現在選択中</Tag>}
              {isSelected && !isCurrentlySelected && <Tag color="red">選択</Tag>}
            </Space>
          }
          description={
            <Text type="secondary" style={{ fontSize: 12 }}>
              全てのメソッドの作業指示を表示します
            </Text>
          }
        />
      </List.Item>
    );
  };

  // メソッドリストアイテムをレンダリング
  const renderMethodItem = (method: typeof methods[0]) => {
    const isSelected = tempMethodId === method.methodId;
    const isCurrentlySelected = selectedMethodId === method.methodId;
    const owner = projectInfo?.workAssignment?.assignedBy?.userName || '不明';

    return (
      <List.Item
        key={method.methodId}
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
          avatar={<ToolOutlined style={{ fontSize: 24, color: token.colorPrimary }} />}
          title={
            <Space>
              <Text strong>{method.methodName}</Text>
              {isCurrentlySelected && <Tag color="blue">現在選択中</Tag>}
              {isSelected && !isCurrentlySelected && <Tag color="red">選択</Tag>}
            </Space>
          }
          description={
            <Space direction="vertical" size={0} style={{ width: '100%' }}>
              {method.description && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {method.description}
                </Text>
              )}
              <Text type="secondary" style={{ fontSize: 12 }}>
                所有者: {owner}
              </Text>
            </Space>
          }
        />
      </List.Item>
    );
  };

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      width={700}
      title={
        <Space>
          <ToolOutlined style={{ color: token.colorPrimary }} />
          <Text strong>メソッド選択</Text>
        </Space>
      }
      footer={
        <Space>
          <Button onClick={handleCancel}>
            キャンセル
          </Button>
          <Button
            type="primary"
            onClick={handleOk}
            icon={<CheckOutlined />}
          >
            決定
          </Button>
        </Space>
      }
    >
      <div style={{ maxHeight: 500, overflowY: 'auto' }}>
        <List>
          {/* 未選択オプション */}
          {renderEmptyOption()}
          {/* メソッド一覧 */}
          {methods.map(renderMethodItem)}
        </List>
      </div>
    </Modal>
  );
}
