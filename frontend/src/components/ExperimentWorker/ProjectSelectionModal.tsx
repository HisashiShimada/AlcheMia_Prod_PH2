'use client';

import React, { useState, useEffect } from 'react';
import { Modal, List, Typography, Space, Tag, Button, theme } from 'antd';
import { FolderOutlined, MinusOutlined, CheckOutlined } from '@ant-design/icons';
import { projectsData } from '@/data/projectsData';
import { useLanguage } from '@/contexts/LanguageContext';

const { Text } = Typography;

/**
 * プロジェクト選択モーダルのProps
 */
interface ProjectSelectionModalProps {
  open: boolean;
  onClose: () => void;
  selectedProject: string;
  onProjectChange: (value: string | null) => void;
}

/**
 * プロジェクト選択モーダルコンポーネント
 * プロジェクトを選択するためのシンプルなモーダル
 */
export default function ProjectSelectionModal({
  open,
  onClose,
  selectedProject,
  onProjectChange,
}: ProjectSelectionModalProps) {
  const { token } = theme.useToken();
  const { t } = useLanguage();
  const [tempProject, setTempProject] = useState<string>(selectedProject);

  // ダイアログが開かれた時に現在の選択状態を一時変数に設定
  useEffect(() => {
    if (open) {
      setTempProject(selectedProject);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 決定ボタンの処理
  const handleOk = () => {
    // nullの場合は空文字列に変換
    onProjectChange(tempProject || null);
    onClose();
  };

  // キャンセルボタンの処理
  const handleCancel = () => {
    // 一時変数をリセット
    setTempProject(selectedProject);
    onClose();
  };

  // 「未選択」アイテムをレンダリング
  const renderEmptyOption = () => {
    const isSelected = !tempProject;
    const isCurrentlySelected = !selectedProject;

    return (
      <List.Item
        onClick={() => setTempProject('')}
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
              <Text strong>{t('experimentWork.projectSelection.noSelection')}</Text>
              {isCurrentlySelected && <Tag color="blue">{t('experimentWork.projectSelection.currentlySelected')}</Tag>}
              {isSelected && !isCurrentlySelected && <Tag color="red">{t('experimentWork.projectSelection.selected')}</Tag>}
            </Space>
          }
          description={
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('experimentWork.projectSelection.noSelectionDescription')}
            </Text>
          }
        />
      </List.Item>
    );
  };

  // プロジェクトリストアイテムをレンダリング
  const renderProjectItem = (projectId: string) => {
    const project = projectsData[projectId];
    const isSelected = tempProject === projectId;
    const isCurrentlySelected = selectedProject === projectId;
    const owner = project.workAssignment?.assignedBy?.userName || t('experimentWork.projectSelection.unknownOwner');

    return (
      <List.Item
        key={projectId}
        onClick={() => setTempProject(projectId)}
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
              {isCurrentlySelected && <Tag color="blue">{t('experimentWork.projectSelection.currentlySelected')}</Tag>}
              {isSelected && !isCurrentlySelected && <Tag color="red">{t('experimentWork.projectSelection.selected')}</Tag>}
            </Space>
          }
          description={
            <Space direction="vertical" size={0} style={{ width: '100%' }}>
              {project.description && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {project.description}
                </Text>
              )}
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('experimentWork.projectSelection.owner')}: {owner}
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
          <FolderOutlined style={{ color: token.colorPrimary }} />
          <Text strong>{t('experimentWork.projectSelection.title')}</Text>
        </Space>
      }
      footer={
        <Space>
          <Button onClick={handleCancel}>
            {t('experimentWork.projectSelection.cancel')}
          </Button>
          <Button
            type="primary"
            onClick={handleOk}
            icon={<CheckOutlined />}
          >
            {t('experimentWork.projectSelection.confirm')}
          </Button>
        </Space>
      }
    >
      <div style={{ maxHeight: 500, overflowY: 'auto' }}>
        <List>
          {/* 未選択オプション */}
          {renderEmptyOption()}
          {/* プロジェクト一覧 */}
          {Object.keys(projectsData).map(renderProjectItem)}
        </List>
      </div>
    </Modal>
  );
}
