/**
 * Work Progress Detail Dialog Component
 * ファイル単位の詳細進捗ダイアログ（複数作業ID対応 + PetriNetVisualization統合）
 * 
 * Material-UI → Ant Design v6への移行
 * UIポリシー準拠: デザイントークンの使用、インラインスタイル禁止
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Button,
  Typography,
  Tabs,
  Card,
  Tag,
  Spin,
  Alert,
  Space,
  Flex,
  Divider,
  List,
  theme,
  Grid,
  Row,
  Col,
} from 'antd';
import {
  CloseOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  CheckOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import PetriNetVisualization from './PetriNetVisualization';
import type {
  FileData,
  FileDetails,
  WorkDetail,
  TransitionProgress,
} from '@/types/progress';
// モックデータのインポート
import mockFileProgressDetail from '@/data/mock/mockFileProgressDetail.json';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

interface WorkProgressDetailDialogProps {
  open: boolean;
  onClose: () => void;
  fileData: FileData | null;
  managerId: string;
}

/**
 * Work Progress Detail Dialog Component
 */
const WorkProgressDetailDialog: React.FC<WorkProgressDetailDialogProps> = ({
  open,
  onClose,
  fileData,
  managerId,
}) => {
  const { token } = theme.useToken();
  const screens = useBreakpoint();

  const [fileDetails, setFileDetails] = useState<FileDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkIndex, setSelectedWorkIndex] = useState(0);

  /**
   * ファイル詳細取得
   */
  const fetchFileDetails = useCallback(async () => {
    if (!fileData || !fileData.maimlFileKey || !managerId) {
      console.warn('⚠️ [FileProgressDetail] Missing required parameters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 [FileProgressDetail] ファイル詳細取得:', {
        fileKey: fileData.maimlFileKey.substring(0, 50) + '...',
        managerId,
        timestamp: new Date().toISOString(),
      });

      // ============================================================
      // 🔒 API呼び出し（コメントアウト - モックデータ使用中）
      // ============================================================
      // const response = await axios.get(
      //   `/api/manager/file-progress-detail/${encodeURIComponent(fileData.maimlFileKey)}`,
      //   { params: { managerId } }
      // );
      //
      // if (response.data.success) {
      //   const { fileInfo, workDetails } = response.data.data;
      //
      //   console.log('✅ [FileProgressDetail] ファイル詳細取得成功:', {
      //     workCount: workDetails?.length || 0,
      //   });
      //
      //   setFileDetails({
      //     fileInfo,
      //     workDetails: workDetails || [],
      //   });
      //   setSelectedWorkIndex(0);
      // } else {
      //   throw new Error(response.data.error || 'ファイル詳細の取得に失敗しました');
      // }

      // ============================================================
      // ✅ モックデータを使用（開発用）
      // ============================================================
      // 実際のAPIレスポンスをシミュレート
      await new Promise(resolve => setTimeout(resolve, 800)); // ローディング表示のため遅延

      const response = mockFileProgressDetail;

      if (response.success) {
        const { fileInfo, workDetails } = response.data;

        console.log('✅ [FileProgressDetail] ファイル詳細取得成功（モックデータ）:', {
          workCount: workDetails?.length || 0,
        });

        setFileDetails({
          fileInfo,
          workDetails: (workDetails || []) as WorkDetail[],
        });
        setSelectedWorkIndex(0);
      } else {
        throw new Error('ファイル詳細の取得に失敗しました');
      }
    } catch (err) {
      console.error('❌ [FileProgressDetail] Fetch error:', err);
      const errorMessage =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : 'ファイル詳細の取得に失敗しました';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fileData, managerId]);

  /**
   * ダイアログが開かれたらデータ取得
   */
  useEffect(() => {
    if (open && fileData && managerId) {
      fetchFileDetails();
    } else if (!open) {
      // ダイアログを閉じたらリセット
      setFileDetails(null);
      setSelectedWorkIndex(0);
      setError(null);
    }
  }, [open, fileData, managerId, fetchFileDetails]);

  /**
   * タブ変更ハンドラ
   */
  const handleTabChange = (activeKey: string) => {
    setSelectedWorkIndex(Number(activeKey));
  };

  /**
   * 進捗状況に応じた色を取得
   */
  const getProgressStatusColor = (
    progressStatus: string
  ): 'success' | 'processing' | 'default' | 'warning' | 'error' => {
    switch (progressStatus) {
      case '完了':
        return 'success';
      case '作業中':
        return 'processing';
      case '準備中':
        return 'default';
      case '休止中':
        return 'warning';
      case '異常中':
        return 'error';
      case '未開始':
      default:
        return 'default';
    }
  };

  /**
   * 進捗状況に応じたアイコンを取得
   */
  const getProgressStatusIcon = (progressStatus: string) => {
    switch (progressStatus) {
      case '完了':
        return <CheckOutlined />;
      case '作業中':
        return <PlayCircleOutlined />;
      case '準備中':
        return <ClockCircleOutlined />;
      case '休止中':
        return <PauseCircleOutlined />;
      case '異常中':
        return <ExclamationCircleOutlined />;
      case '未開始':
      default:
        return <MinusCircleOutlined />;
    }
  };

  /**
   * 作業ステータスの色
   */
  const getWorkStatusColor = (
    status: string
  ): 'processing' | 'warning' | 'success' | 'default' => {
    switch (status) {
      case 'in_progress':
        return 'processing';
      case 'paused':
        return 'warning';
      case 'completed':
        return 'success';
      default:
        return 'default';
    }
  };

  /**
   * 作業ステータスラベル
   */
  const getWorkStatusLabel = (status: string): string => {
    switch (status) {
      case 'in_progress':
        return '作業中';
      case 'paused':
        return '休止中';
      case 'completed':
        return '完了';
      default:
        return status;
    }
  };

  const selectedWork = fileDetails?.workDetails[selectedWorkIndex];

  /**
   * タブアイテム生成
   */
  const tabItems = fileDetails?.workDetails.map((work, index) => ({
    key: String(index),
    label: (
      <Space direction="vertical" size="small" style={{ textAlign: 'left' }}>
        <Text strong style={{ fontSize: token.fontSizeSM }}>
          作業ID: {work.workId.substring(0, 8)}...
        </Text>
        <Space size="small">
          <Tag color={getWorkStatusColor(work.workStatus)} style={{ margin: 0 }}>
            {getWorkStatusLabel(work.workStatus)}
          </Tag>
          <Tag style={{ margin: 0 }}>{Math.round(work.progressPercentage)}%</Tag>
        </Space>
      </Space>
    ),
  }));

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={screens.lg ? 1200 : screens.md ? 900 : '90%'}
      style={{ top: 20 }}
      styles={{
        body: {
          maxHeight: 'calc(90vh - 110px)',
          overflowY: 'auto',
          padding: 0,
        },
      }}
      title={
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Title level={4} style={{ margin: 0 }}>
            ファイル詳細進捗
          </Title>
          {fileData && (
            <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
              {fileData.fileName}
            </Text>
          )}
        </Space>
      }
      footer={
        <Flex justify="space-between">
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchFileDetails}
            loading={loading}
            type="default"
          >
            再読み込み
          </Button>
          <Button type="primary" onClick={onClose}>
            閉じる
          </Button>
        </Flex>
      }
      closeIcon={<CloseOutlined />}
    >
      {/* エラー表示 */}
      {error && (
        <Alert
          message="エラー"
          description={error}
          type="error"
          showIcon
          closable
          style={{ margin: token.margin }}
          action={
            <Button size="small" onClick={fetchFileDetails}>
              再試行
            </Button>
          }
        />
      )}

      {/* ローディング */}
      {loading && !fileDetails && (
        <Flex justify="center" align="center" style={{ padding: token.paddingXL }}>
          <Spin size="large" tip="ファイル詳細を読み込み中..." />
        </Flex>
      )}

      {/* ファイル基本情報 */}
      {fileDetails?.fileInfo && (
        <Card
          size="small"
          bordered={false}
          style={{
            background: token.colorBgLayout,
            borderBottom: `1px solid ${token.colorBorder}`,
            borderRadius: 0,
          }}
        >
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Text type="secondary" strong>
              ファイル情報
            </Text>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Space direction="vertical" size={0}>
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    ファイル名
                  </Text>
                  <Text strong>{fileDetails.fileInfo.fileName}</Text>
                </Space>
              </Col>
              <Col xs={24} sm={8}>
                <Space direction="vertical" size={0}>
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    チェックアウト状態
                  </Text>
                  <div>
                    {fileDetails.fileInfo.checkoutStatus?.isCheckedOut ? (
                      <Tag color="processing">
                        ✓ {fileDetails.fileInfo.checkoutStatus.checkoutBy}
                      </Tag>
                    ) : (
                      <Tag>チェックアウト可能</Tag>
                    )}
                  </div>
                </Space>
              </Col>
              <Col xs={24} sm={8}>
                <Space direction="vertical" size={0}>
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    組織ID
                  </Text>
                  <Text>{fileDetails.fileInfo.organizationId}</Text>
                </Space>
              </Col>
            </Row>
          </Space>
        </Card>
      )}

      {/* 作業ID別タブ */}
      {fileDetails?.workDetails && fileDetails.workDetails.length > 0 && (
        <Tabs
          activeKey={String(selectedWorkIndex)}
          onChange={handleTabChange}
          items={tabItems}
          type="card"
          style={{
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorder}`,
            margin: 0,
          }}
        />
      )}

      {/* 選択中の作業詳細 */}
      {selectedWork && (
        <div style={{ padding: token.padding }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 作業サマリー */}
            <Card size="small" title="作業サマリー">
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <Space direction="vertical" size={0}>
                      <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                        作業ID
                      </Text>
                      <Text code style={{ fontSize: token.fontSizeSM }}>
                        {selectedWork.workId}
                      </Text>
                    </Space>
                  </Col>
                  <Col xs={24} md={12}>
                    <Space direction="vertical" size={0}>
                      <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                        作業者
                      </Text>
                      <Text>{selectedWork.assignedWorkerId || '未割当'}</Text>
                    </Space>
                  </Col>
                </Row>

                {/* 進捗統計 */}
                <Row gutter={[8, 8]}>
                  <Col xs={12} sm={8} lg={4}>
                    <Card
                      size="small"
                      style={{
                        textAlign: 'center',
                        background: token.colorBgLayout,
                      }}
                    >
                      <Text strong style={{ fontSize: token.fontSizeLG }}>
                        {selectedWork.stats.totalTransitions}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                        全体
                      </Text>
                    </Card>
                  </Col>
                  <Col xs={12} sm={8} lg={4}>
                    <Card
                      size="small"
                      style={{
                        textAlign: 'center',
                        background: token.colorSuccessBg,
                      }}
                    >
                      <Text strong style={{ fontSize: token.fontSizeLG, color: token.colorSuccess }}>
                        {selectedWork.stats.completed}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                        完了
                      </Text>
                    </Card>
                  </Col>
                  <Col xs={12} sm={8} lg={4}>
                    <Card
                      size="small"
                      style={{
                        textAlign: 'center',
                        background: token.colorPrimaryBg,
                      }}
                    >
                      <Text strong style={{ fontSize: token.fontSizeLG, color: token.colorPrimary }}>
                        {selectedWork.stats.working}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                        作業中
                      </Text>
                    </Card>
                  </Col>
                  <Col xs={12} sm={8} lg={4}>
                    <Card
                      size="small"
                      style={{
                        textAlign: 'center',
                        background: token.colorWarningBg,
                      }}
                    >
                      <Text strong style={{ fontSize: token.fontSizeLG, color: token.colorWarning }}>
                        {selectedWork.stats.paused}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                        休止中
                      </Text>
                    </Card>
                  </Col>
                  <Col xs={12} sm={8} lg={4}>
                    <Card
                      size="small"
                      style={{
                        textAlign: 'center',
                        background: token.colorInfoBg,
                      }}
                    >
                      <Text strong style={{ fontSize: token.fontSizeLG, color: token.colorInfo }}>
                        {selectedWork.stats.completionRate}%
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                        完了率
                      </Text>
                    </Card>
                  </Col>
                </Row>
              </Space>
            </Card>

            {/* PetriNetVisualization統合 */}
            {fileDetails.fileInfo && selectedWork.assignedWorkerId && (
              <div>
                <Text type="secondary" strong style={{ paddingLeft: token.paddingSM }}>
                  実験フロー図
                </Text>
                <Card
                  size="small"
                  style={{
                    marginTop: token.marginXS,
                    background: token.colorBgLayout,
                  }}
                >
                  <PetriNetVisualization
                    fileKey={fileDetails.fileInfo.maimlFileKey}
                    workerId={selectedWork.assignedWorkerId}
                    workId={selectedWork.workId}
                    progressData={selectedWork.transitionProgress}
                  />
                </Card>
              </div>
            )}

            {/* トランジション詳細一覧 */}
            {selectedWork.transitionProgress && selectedWork.transitionProgress.length > 0 && (
              <div>
                <Text type="secondary" strong style={{ paddingLeft: token.paddingSM }}>
                  トランジション詳細 ({selectedWork.transitionProgress.length}件)
                </Text>
                <List
                  style={{ marginTop: token.marginXS }}
                  dataSource={selectedWork.transitionProgress}
                  renderItem={(transition: TransitionProgress) => (
                    <List.Item>
                      <Card
                        size="small"
                        style={{ width: '100%', borderColor: token.colorBorder }}
                      >
                        <Flex align="center" gap="small">
                          <div>{getProgressStatusIcon(transition.progressStatus)}</div>
                          <Flex vertical flex={1}>
                            <Flex align="center" gap="small" wrap>
                              <Text strong>
                                {transition.transitionName || transition.transitionId}
                              </Text>
                              <Tag
                                icon={getProgressStatusIcon(transition.progressStatus)}
                                color={getProgressStatusColor(transition.progressStatus)}
                              >
                                {transition.progressStatus}
                              </Tag>
                              {transition.progressPercentage != null && (
                                <Tag>{transition.progressPercentage}%</Tag>
                              )}
                            </Flex>
                            <Space direction="vertical" size={0} style={{ marginTop: token.marginXXS }}>
                              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                                ID: {transition.transitionId}
                              </Text>
                              {transition.lastUpdated && (
                                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                                  最終更新: {new Date(transition.lastUpdated).toLocaleString()}
                                </Text>
                              )}
                            </Space>
                          </Flex>
                        </Flex>
                      </Card>
                    </List.Item>
                  )}
                />
              </div>
            )}

            {selectedWork.transitionProgress &&
              selectedWork.transitionProgress.length === 0 && (
                <Alert
                  message="トランジション進捗データがありません"
                  type="info"
                  showIcon
                />
              )}
          </Space>
        </div>
      )}

      {/* データなし */}
      {!loading && fileDetails?.workDetails && fileDetails.workDetails.length === 0 && (
        <Alert
          message="作業IDが割り当てられていません"
          description="このファイルには作業IDが割り当てられていません。"
          type="info"
          showIcon
          style={{ margin: token.margin }}
        />
      )}
    </Modal>
  );
};

export default WorkProgressDetailDialog;
