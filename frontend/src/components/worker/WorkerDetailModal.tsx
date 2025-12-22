'use client';

import React from 'react';
import {
  Modal,
  Space,
  Card,
  Typography,
  Tag,
  Descriptions,
  Progress,
  Empty,
  Spin,
  Alert,
  Row,
  Col,
  Statistic,
  List,
  theme,
} from 'antd';
import {
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  FileOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useLanguage } from '@/contexts/LanguageContext';

const { Title, Text } = Typography;

/**
 * 割り当てファイル情報の型定義
 */
export interface AssignedFile {
  fileName?: string;
  fileKey?: string;
  status: 'completed' | 'in_progress' | 'pending';
  progressPercentage: number;
}

/**
 * 進捗報告情報の型定義
 */
interface ProgressReport {
  fileName: string;
  comments?: string;
  progressPercentage: number;
  timestamp: string;
}

/**
 * セッション情報の型定義
 */
interface SessionInfo {
  lastLogin?: string;
  lastActivity?: string;
  totalSessions?: number;
}

/**
 * 作業統計情報の型定義
 */
interface WorkerStats {
  totalFiles: number;
  completionRate: number;
  inProgressFiles: number;
}

/**
 * 進捗データの型定義
 */
interface ProgressData {
  progress?: ProgressReport[];
}

/**
 * 作業者詳細情報の型定義
 */
export interface WorkerDetails {
  workerId: string;
  name: string;
  email: string;
  sessionInfo?: SessionInfo;
  stats?: WorkerStats;
  assignedFiles?: AssignedFile[];
  progressData?: ProgressData;
}

/**
 * WorkerDetailModalのProps型定義
 */
interface WorkerDetailModalProps {
  open: boolean;
  onCancel: () => void;
  workerId: string | null;
  workerDetails: WorkerDetails | null;
  loading: boolean;
}

/**
 * 作業者詳細モーダルコンポーネント
 * UIポリシーに従い、Ant Designコンポーネントとデザイントークンを使用
 */
export default function WorkerDetailModal({
  open,
  onCancel,
  workerId,
  workerDetails,
  loading,
}: WorkerDetailModalProps) {
  const { t } = useLanguage();
  const { token } = theme.useToken();

  // ステータスタグの設定を取得
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          color: 'success',
          icon: <CheckCircleOutlined />,
          text: t('worker.detail.status.completed') || '完了',
        };
      case 'in_progress':
        return {
          color: 'processing',
          icon: <SyncOutlined spin />,
          text: t('worker.detail.status.inProgress') || '進行中',
        };
      case 'pending':
      default:
        return {
          color: 'default',
          icon: <ClockCircleOutlined />,
          text: t('worker.detail.status.pending') || '未開始',
        };
    }
  };

  // ファイル名を取得（fileNameまたはfileKeyから抽出）
  const getFileName = (file: AssignedFile): string => {
    return file.fileName || file.fileKey?.split('/').pop() || t('worker.detail.unknownFile') || 'ファイル名不明';
  };

  // モーダルのタイトル
  const modalTitle = workerId
    ? `${t('worker.detail.title') || '作業者詳細'}: ${workerId}${loading ? ` (${t('worker.detail.loading') || '読み込み中'}...)` : ''}`
    : t('worker.detail.title') || '作業者詳細';

  return (
    <Modal
      title={modalTitle}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={1024}
      style={{ top: 20 }}
      styles={{
        body: {
          maxHeight: 'calc(100vh - 200px)',
          overflowY: 'auto',
        },
      }}
    >
      {loading ? (
        // ローディング表示
        <div style={{ textAlign: 'center', padding: `${token.paddingXL}px 0` }}>
          <Space direction="vertical" size="middle">
            <Spin size="large" />
            <Text type="secondary">{t('worker.detail.loadingMessage') || '詳細データ読み込み中...'}</Text>
          </Space>
        </div>
      ) : workerDetails ? (
        // 詳細データ表示
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 基本情報・統計グリッド */}
          <Row gutter={[16, 16]}>
            {/* 基本情報 */}
            <Col xs={24} md={12}>
              <Card
                title={
                  <Space>
                    <UserOutlined style={{ color: token.colorPrimary }} />
                    <Text strong>{t('worker.detail.basicInfo') || '基本情報'}</Text>
                  </Space>
                }
                size="small"
                style={{ height: '100%' }}
              >
                <Descriptions column={1} size="small">
                  <Descriptions.Item label={t('worker.detail.id') || 'ID'}>
                    <Text copyable>{workerDetails.workerId}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label={t('worker.detail.name') || '名前'}>
                    {workerDetails.name || t('worker.detail.notSet') || '未設定'}
                  </Descriptions.Item>
                  <Descriptions.Item label={t('worker.detail.email') || 'メール'}>
                    <Text copyable>{workerDetails.email || t('worker.detail.notSet') || '未設定'}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label={t('worker.detail.lastLogin') || '最終ログイン'}>
                    {workerDetails.sessionInfo?.lastLogin
                      ? new Date(workerDetails.sessionInfo.lastLogin).toLocaleString('ja-JP')
                      : t('worker.detail.noRecord') || '未記録'}
                  </Descriptions.Item>
                  <Descriptions.Item label={t('worker.detail.lastActivity') || '最終活動'}>
                    {workerDetails.sessionInfo?.lastActivity
                      ? new Date(workerDetails.sessionInfo.lastActivity).toLocaleString('ja-JP')
                      : t('worker.detail.noRecord') || '未記録'}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>

            {/* 作業統計 */}
            <Col xs={24} md={12}>
              <Card
                title={
                  <Space>
                    <FileOutlined style={{ color: token.colorInfo }} />
                    <Text strong>{t('worker.detail.workStats') || '作業統計'}</Text>
                  </Space>
                }
                size="small"
                style={{
                  height: '100%',
                  background: `linear-gradient(135deg, ${token.colorBgContainer} 0%, ${token.colorPrimaryBg} 100%)`,
                }}
              >
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Statistic
                      title={t('worker.detail.totalFiles') || '総ファイル数'}
                      value={workerDetails.stats?.totalFiles || 0}
                      prefix={<FileOutlined />}
                      valueStyle={{ fontSize: token.fontSizeHeading3 }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title={t('worker.detail.completionRate') || '完了率'}
                      value={workerDetails.stats?.completionRate || 0}
                      suffix="%"
                      prefix={<CheckCircleOutlined />}
                      valueStyle={{
                        color: token.colorSuccess,
                        fontSize: token.fontSizeHeading3,
                      }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title={t('worker.detail.inProgress') || '進行中'}
                      value={workerDetails.stats?.inProgressFiles || 0}
                      prefix={<SyncOutlined />}
                      valueStyle={{
                        color: token.colorInfo,
                        fontSize: token.fontSizeHeading3,
                      }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title={t('worker.detail.sessionCount') || 'セッション数'}
                      value={workerDetails.sessionInfo?.totalSessions || 0}
                      prefix={<ClockCircleOutlined />}
                      valueStyle={{
                        color: token.colorWarning,
                        fontSize: token.fontSizeHeading3,
                      }}
                    />
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>

          {/* 割り当てファイル一覧 */}
          <Card
            title={
              <Space>
                <FileOutlined style={{ color: token.colorPrimary }} />
                <Text strong>
                  {t('worker.detail.assignedFiles') || '割り当てファイル'} (
                  {workerDetails.assignedFiles?.length || 0}
                  {t('worker.detail.filesCount') || '件'})
                </Text>
              </Space>
            }
            size="small"
          >
            {workerDetails.assignedFiles && workerDetails.assignedFiles.length > 0 ? (
              <List
                dataSource={workerDetails.assignedFiles}
                style={{ maxHeight: 300, overflowY: 'auto' }}
                renderItem={(file) => {
                  const statusConfig = getStatusConfig(file.status);
                  return (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <Space>
                            <Text strong>{getFileName(file)}</Text>
                            <Tag icon={statusConfig.icon} color={statusConfig.color}>
                              {statusConfig.text}
                            </Tag>
                          </Space>
                        }
                        description={
                          <Space direction="vertical" size="small" style={{ width: '100%' }}>
                            {file.fileKey && (
                              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                                {file.fileKey}
                              </Text>
                            )}
                            <Progress
                              percent={file.progressPercentage}
                              size="small"
                              strokeColor={
                                file.status === 'completed'
                                  ? token.colorSuccess
                                  : file.status === 'in_progress'
                                    ? token.colorInfo
                                    : token.colorTextTertiary
                              }
                            />
                          </Space>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            ) : (
              <Empty
                description={t('worker.detail.noAssignedFiles') || '割り当てられたファイルがありません'}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>

          {/* 最近の進捗報告 */}
          <Card
            title={
              <Space>
                <CheckCircleOutlined style={{ color: token.colorSuccess }} />
                <Text strong>{t('worker.detail.recentProgress') || '最近の進捗報告'}</Text>
              </Space>
            }
            size="small"
          >
            {workerDetails.progressData?.progress && workerDetails.progressData.progress.length > 0 ? (
              <List
                dataSource={workerDetails.progressData.progress.slice(0, 5)}
                style={{ maxHeight: 240, overflowY: 'auto' }}
                renderItem={(report) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                          <Text strong>{report.fileName || t('worker.detail.unknownFile') || 'ファイル名不明'}</Text>
                          <Space size="small">
                            <Text strong style={{ fontSize: token.fontSizeLG }}>
                              {report.progressPercentage}%
                            </Text>
                            <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                              {new Date(report.timestamp).toLocaleDateString('ja-JP')}
                            </Text>
                          </Space>
                        </Space>
                      }
                      description={
                        report.comments && (
                          <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                            {report.comments}
                          </Text>
                        )
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty
                description={t('worker.detail.noProgressReports') || '進捗報告がありません'}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Space>
      ) : (
        // エラー表示
        <div style={{ textAlign: 'center', padding: `${token.paddingXL}px 0` }}>
          <Space direction="vertical" size="middle">
            <WarningOutlined
              style={{
                fontSize: 48,
                color: token.colorWarning,
              }}
            />
            <div>
              <Title level={4}>{t('worker.detail.fetchError') || '詳細データの取得に失敗'}</Title>
              <Text type="secondary">
                {t('worker.detail.fetchErrorMessage') || '作業者の詳細情報を取得できませんでした'}
              </Text>
            </div>
          </Space>
        </div>
      )}
    </Modal>
  );
}
