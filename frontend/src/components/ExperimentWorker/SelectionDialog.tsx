'use client';

import React from 'react';
import { Modal, List, Typography, Space, Tag, theme } from 'antd';
import { FolderOutlined, ToolOutlined, AimOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

/**
 * 選択タイプ
 */
export type SelectionType = 'project' | 'method' | 'task';

/**
 * 選択アイテムの型
 */
export interface SelectionItem {
  id: string;
  name: string;
  subtitle?: string;
  description?: string;
  tag?: string;
}

/**
 * 選択ダイアログのProps
 */
interface SelectionDialogProps {
  open: boolean;
  onClose: () => void;
  type: SelectionType;
  items: SelectionItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * 選択ダイアログコンポーネント
 * プロジェクト、メソッド、タスクの選択に使用
 */
export default function SelectionDialog({
  open,
  onClose,
  type,
  items,
  selectedId,
  onSelect,
}: SelectionDialogProps) {
  const { token } = theme.useToken();

  // タイプに応じたタイトルとアイコンを取得
  const getTitle = () => {
    switch (type) {
      case 'project':
        return 'プロジェクトを選択';
      case 'method':
        return 'メソッドを選択';
      case 'task':
        return 'タスクを選択';
      default:
        return '選択';
    }
  };

  const getIcon = () => {
    const iconProps = { style: { fontSize: 16, color: token.colorPrimary } };
    switch (type) {
      case 'project':
        return <FolderOutlined {...iconProps} />;
      case 'method':
        return <ToolOutlined {...iconProps} />;
      case 'task':
        return <AimOutlined {...iconProps} />;
      default:
        return null;
    }
  };

  // アイテムを選択
  const handleSelect = (id: string) => {
    onSelect(id);
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      title={
        <Space>
          {getIcon()}
          <Text strong>{getTitle()}</Text>
        </Space>
      }
    >
      <List
        dataSource={items}
        renderItem={(item) => {
          const isSelected = item.id === selectedId;
          
          return (
            <List.Item
              onClick={() => handleSelect(item.id)}
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
                    <Text strong={isSelected}>{item.name}</Text>
                    {item.tag && (
                      <Tag color={isSelected ? 'red' : 'default'}>
                        {item.tag}
                      </Tag>
                    )}
                  </Space>
                }
                description={
                  <Space orientation="vertical" size={0}>
                    {item.subtitle && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.subtitle}
                      </Text>
                    )}
                    {item.description && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.description}
                      </Text>
                    )}
                  </Space>
                }
              />
              {isSelected && (
                <Tag color="red">選択中</Tag>
              )}
            </List.Item>
          );
        }}
      />
    </Modal>
  );
}
