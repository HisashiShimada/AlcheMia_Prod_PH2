'use client';

import React from 'react';
import {
  Modal,
  Typography,
  Tag,
  Divider,
  Space,
  Button,
  Flex,
  Descriptions,
} from 'antd';
import {
  CloseOutlined,
  FolderOutlined,
  UserOutlined,
  TeamOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import FileListTable from './FileListTable';
import { formatFileSize, formatRelativeTime, formatProjectStatus, getStatusColor } from '@/utils/formatters';

const { Title, Text } = Typography;

interface ProjectDetailModalProps {
  open: boolean;
  onClose: () => void;
  project: {
    id: string;
    name: string;
    folderName: string;
    description: string;
    status: string;
    fileCount: number;
    totalSize: number;
    createdAt: string;
    updatedAt: string;
    owner: string;
    members: string[];
    tags: string[];
  } | null;
  files: Array<{
    id: string;
    name: string;
    path: string;
    size: number;
    lastModified: string;
    type: string;
    isFolder?: boolean;
    fileCount?: number;
    isCheckedOut?: boolean;
    checkedOutBy?: string | null;
    checkedOutAt?: string | null;
  }>;
}

/**
 * プロジェクト詳細モーダルコンポーネント
 */
const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  open,
  onClose,
  project,
  files,
}) => {
  if (!project) return null;

  const statusColor = getStatusColor(project.status);
  const statusText = formatProjectStatus(project.status);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={1000}
      style={{ top: 20 }}
      styles={{
        body: { maxHeight: 'calc(90vh - 200px)', overflowY: 'auto' },
      }}
      footer={[
        <Button key="close" onClick={onClose}>
          閉じる
        </Button>,
        <Button key="open" type="primary">
          プロジェクトを開く
        </Button>,
      ]}
    >
      {/* ヘッダー */}
      <Space direction="vertical" size="small" style={{ width: '100%', marginBottom: 16 }}>
        <Flex align="center" gap="middle">
          <Title level={4} style={{ margin: 0 }}>
            {project.name}
          </Title>
          <Tag color={statusColor}>{statusText}</Tag>
        </Flex>
        <Flex align="center" gap="small">
          <FolderOutlined style={{ color: '#757575' }} />
          <Text type="secondary">{project.folderName}</Text>
        </Flex>
      </Space>

      <Divider style={{ margin: '16px 0' }} />

      {/* プロジェクト情報 */}
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <Title level={5} style={{ marginTop: 0 }}>
            プロジェクト情報
          </Title>
          
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            {project.description}
          </Text>

          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label={
              <Flex align="center" gap="small">
                <UserOutlined />
                <span>所有者</span>
              </Flex>
            }>
              {project.owner}
            </Descriptions.Item>

            <Descriptions.Item label={
              <Flex align="center" gap="small">
                <TeamOutlined />
                <span>メンバー</span>
              </Flex>
            }>
              {project.members.join(', ')}
            </Descriptions.Item>

            <Descriptions.Item label={
              <Flex align="center" gap="small">
                <FileTextOutlined />
                <span>ファイル数</span>
              </Flex>
            }>
              {project.fileCount} ファイル
            </Descriptions.Item>

            <Descriptions.Item label={
              <Flex align="center" gap="small">
                <DatabaseOutlined />
                <span>ストレージ使用量</span>
              </Flex>
            }>
              {formatFileSize(project.totalSize)}
            </Descriptions.Item>

            <Descriptions.Item label={
              <Flex align="center" gap="small">
                <CalendarOutlined />
                <span>作成日</span>
              </Flex>
            }>
              {formatRelativeTime(project.createdAt)}
            </Descriptions.Item>

            <Descriptions.Item label={
              <Flex align="center" gap="small">
                <CalendarOutlined />
                <span>最終更新日</span>
              </Flex>
            }>
              {formatRelativeTime(project.updatedAt)}
            </Descriptions.Item>
          </Descriptions>

          {/* タグ */}
          <div style={{ marginTop: 16 }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              タグ
            </Text>
            <Space size="small" wrap>
              {project.tags.map((tag, index) => (
                <Tag key={index}>{tag}</Tag>
              ))}
            </Space>
          </div>
        </div>

        <Divider style={{ margin: '16px 0' }} />

        {/* ファイル一覧 */}
        <div>
          <Title level={5} style={{ marginBottom: 16 }}>
            ファイル一覧 ({files.length})
          </Title>
          <FileListTable
            files={files}
            onFileClick={(file) => console.log('File clicked:', file.name)}
          />
        </div>
      </Space>
    </Modal>
  );
};

export default ProjectDetailModal;
