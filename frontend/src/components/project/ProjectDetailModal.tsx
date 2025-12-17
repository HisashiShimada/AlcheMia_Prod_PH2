'use client';

import React from 'react';
import {
  Modal,
  Button,
  Typography,
  Tag,
  Divider,
  Space,
  Row,
  Col,
} from 'antd';
import {
  CloseOutlined,
  FolderOutlined,
  TeamOutlined,
  FileTextOutlined,
  HddOutlined,
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
    isCheckedOut: boolean;
    checkedOutBy: string | null;
    checkedOutAt: string | null;
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

  const getStatusTagColor = (status: string): string => {
    const colors: Record<string, string> = {
      planning: 'default',
      pending: 'blue',
      in_progress: 'cyan',
      completed: 'success',
    };
    return colors[status] || 'default';
  };

  const statusText = formatProjectStatus(project.status);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={1000}
      style={{ top: 40 }}
      bodyStyle={{ maxHeight: 'calc(90vh - 200px)', overflowY: 'auto' }}
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Space size="middle" style={{ marginBottom: 8 }}>
              <Title level={4} style={{ margin: 0 }}>
                {project.name}
              </Title>
              <Tag color={getStatusTagColor(project.status)}>
                {statusText}
              </Tag>
            </Space>
            <Space size="small">
              <FolderOutlined style={{ color: '#757575' }} />
              <Text type="secondary">{project.folderName}</Text>
            </Space>
          </div>
        </div>
      }
      footer={[
        <Button key="close" onClick={onClose}>
          閉じる
        </Button>,
        <Button key="open" type="primary" onClick={() => console.log('Open project')}>
          プロジェクトを開く
        </Button>,
      ]}
    >
      <div style={{ padding: '8px 0' }}>
        {/* プロジェクト情報 */}
        <div style={{ marginBottom: 24 }}>
          <Title level={5} style={{ marginBottom: 16 }}>
            プロジェクト情報
          </Title>
          
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            {project.description}
          </Text>

          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            {/* 所有者 */}
            <Col span={12}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>
                所有者
              </Text>
              <Space size="small">
                <TeamOutlined style={{ color: '#757575' }} />
                <Text>{project.owner}</Text>
              </Space>
            </Col>

            {/* メンバー */}
            <Col span={12}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>
                メンバー
              </Text>
              <Text>{project.members.join(', ')}</Text>
            </Col>

            {/* ファイル数 */}
            <Col span={12}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>
                ファイル数
              </Text>
              <Space size="small">
                <FileTextOutlined style={{ color: '#757575' }} />
                <Text>{project.fileCount} ファイル</Text>
              </Space>
            </Col>

            {/* ストレージ使用量 */}
            <Col span={12}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>
                ストレージ使用量
              </Text>
              <Space size="small">
                <HddOutlined style={{ color: '#757575' }} />
                <Text>{formatFileSize(project.totalSize)}</Text>
              </Space>
            </Col>

            {/* 作成日 */}
            <Col span={12}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>
                作成日
              </Text>
              <Space size="small">
                <CalendarOutlined style={{ color: '#757575' }} />
                <Text>{formatRelativeTime(project.createdAt)}</Text>
              </Space>
            </Col>

            {/* 最終更新日 */}
            <Col span={12}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>
                最終更新日
              </Text>
              <Space size="small">
                <CalendarOutlined style={{ color: '#757575' }} />
                <Text>{formatRelativeTime(project.updatedAt)}</Text>
              </Space>
            </Col>
          </Row>

          {/* タグ */}
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
              タグ
            </Text>
            <Space size="small" wrap>
              {project.tags.map((tag, index) => (
                <Tag key={index}>{tag}</Tag>
              ))}
            </Space>
          </div>
        </div>

        <Divider style={{ margin: '24px 0' }} />

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
      </div>
    </Modal>
  );
};

export default ProjectDetailModal;
