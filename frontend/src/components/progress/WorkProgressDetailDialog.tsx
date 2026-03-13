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
  theme,
  Grid,
  Row,
  Col,
  Select,
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
import PetriNetVisualization from './PetriNetVisualization';
import type {
  FileData,
  FileDetails,
  WorkDetail,
  TransitionProgress,
} from '@/types/progress';
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
  const [selectedMethod, setSelectedMethod] = useState<string | undefined>(undefined);

  /**
   * ファイル詳細取得
   * managerId はサーバー側 JWT 認証から組織IDを取得するため不要
   */
  const fetchFileDetails = useCallback(async () => {
    if (!fileData || !fileData.maimlFileKey) {
      console.warn('⚠️ [FileProgressDetail] Missing required parameters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 [FileProgressDetail] ファイル詳細取得:', {
        fileKey: fileData.maimlFileKey.substring(0, 50) + '...',
        timestamp: new Date().toISOString(),
      });

      // maimlFileKey からプロジェクト名を抽出
      // 形式: "projects/{projectName}/{projectName}.maiml"（organizationIdプレフィックスなし）
      // ※ バックエンド(projectService.getProjectFiles)はorganizationIdを除去した相対パスを返す
      const projectNameMatch = fileData.maimlFileKey.match(/(?:^|\/)projects\/([^/]+)\//);
      const projectName = projectNameMatch ? decodeURIComponent(projectNameMatch[1]) : null;

      if (!projectName) {
        throw new Error('maimlFileKeyからプロジェクト名を取得できませんでした');
      }

      console.log('🔍 [FileProgressDetail] プロジェクト名抽出:', {
        projectName,
        timestamp: new Date().toISOString(),
      });

      // ============================================================
      // API呼び出し（createApiClient 経由で認証ヘッダーを自動付与）
      // ============================================================
      const { createApiClient } = await import('@/utils/authUtils');
      const client = createApiClient();
      const response = await client.get(
        `/progress/projects/${encodeURIComponent(projectName)}/work-details`
      );

      if (response.data.success) {
        const { projectInfo, fileInfo, workDetails } = response.data.data;

        console.log('✅ [FileProgressDetail] ファイル詳細取得成功:', {
          projectName,
          workCount: workDetails?.length || 0,
        });

        setFileDetails({
          projectInfo: projectInfo ? {
            ...projectInfo,
            status: projectInfo.status as 'planning' | 'in_progress' | 'pending' | 'completed'
          } : undefined,
          fileInfo: {
            ...fileInfo,
            checkoutStatus: fileInfo.checkoutStatus ? {
              isCheckedOut: fileInfo.checkoutStatus.isCheckedOut,
              checkoutBy: fileInfo.checkoutStatus.checkoutBy || undefined
            } : undefined
          },
          workDetails: (workDetails || []) as WorkDetail[],
        });
        setSelectedWorkIndex(0);
      } else {
        throw new Error(response.data.error?.message || 'ファイル詳細の取得に失敗しました');
      }
    } catch (err) {
      console.error('❌ [FileProgressDetail] Fetch error:', err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'ファイル詳細の取得に失敗しました';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fileData]);

  /**
   * ダイアログが開かれたらデータ取得
   * managerId はサーバー側 JWT 認証から組織IDを取得するため不要
   */
  useEffect(() => {
    if (open && fileData) {
      fetchFileDetails();
    } else if (!open) {
      // ダイアログを閉じたらリセット
      setFileDetails(null);
      setSelectedWorkIndex(0);
      setError(null);
    }
  }, [open, fileData, fetchFileDetails]);

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
  ): 'processing' | 'warning' | 'success' | 'default' | 'error' => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'in_progress':
        return 'processing';
      case 'error':
        return 'error';
      case 'review_waiting':
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
      case 'pending':
        return '実行待ち';
      case 'in_progress':
        return '実行中';
      case 'error':
        return '異常終了';
      case 'review_waiting':
        return 'レビュー待ち';
      case 'completed':
        return '完了';
      default:
        return status;
    }
  };

  /**
   * プロジェクトのメソッドリスト（projectInfo.methods から取得）
   */
  const projectMethods = fileDetails?.projectInfo?.methods || [];

  /**
   * メソッドフィルタが必要か（メソッドが複数ある場合）
   */
  const needsMethodFilter = projectMethods.length > 1;

  /**
   * フィルタされた作業リスト（workDetail.methodName を使用）
   */
  const filteredWorkDetails = React.useMemo(() => {
    if (!fileDetails?.workDetails) return [];
    if (!selectedMethod) return fileDetails.workDetails;
    
    return fileDetails.workDetails.filter(work => {
      return work.methodName === selectedMethod;
    });
  }, [fileDetails?.workDetails, selectedMethod]);

  /**
   * 選択中の作業（フィルタ適用後のインデックス）
   */
  const selectedWork = filteredWorkDetails[selectedWorkIndex];

  /**
   * タブアイテム生成（フィルタ適用後）
   */
  const tabItems = filteredWorkDetails.map((work, index) => ({
    key: String(index),
    label: (
      <Text strong style={{ fontSize: token.fontSizeSM }}>
        {`Task${work.taskNo}`}
      </Text>
    ),
  }));

  /**
   * メソッドフィルタ変更時の処理
   */
  const handleMethodFilterChange = (value: string | undefined) => {
    setSelectedMethod(value);
    setSelectedWorkIndex(0); // フィルタ変更時は最初のタブに戻す
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      data-testid="progress-detail-dialog"
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
        <Title level={4} style={{ margin: 0 }}>
          プロジェクト進捗詳細
        </Title>
      }
      footer={
        <Flex justify="space-between">
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchFileDetails}
            loading={loading}
            type="default"
            data-testid="progress-detail-reload-button"
          >
            再読み込み
          </Button>
          <Button type="primary" onClick={onClose} data-testid="progress-detail-close-button">
            閉じる
          </Button>
        </Flex>
      }
      closeIcon={<CloseOutlined />}
    >
      {/* エラー表示 */}
      {error && (
        <Alert
          title="エラー"
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
          <Spin size="large" tip="ファイル詳細を読み込み中..." >
              <div style={{ minHeight: 100 }} />
            </Spin>
              <div style={{ minHeight: 100 }} />
        </Flex>
      )}

      {/* プロジェクト基本情報 */}
      {fileDetails?.projectInfo && (
        <Card
          size="small"
          variant="borderless"
          style={{
            background: token.colorBgLayout,
            borderBottom: `1px solid ${token.colorBorder}`,
            borderRadius: 0,
          }}
        >
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Text type="secondary" strong>
              プロジェクト情報
            </Text>
            
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Space orientation="vertical" size={0}>
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    プロジェクト名
                  </Text>
                  <Space size="small" align="center">
                    <Text strong style={{ fontSize: token.fontSize }}>
                      {fileDetails.projectInfo.projectName}
                    </Text>
                    {fileDetails.projectInfo.status && (
                      <Tag 
                        color={
                          fileDetails.projectInfo.status === 'completed' ? 'success' :
                          fileDetails.projectInfo.status === 'in_progress' ? 'processing' :
                          fileDetails.projectInfo.status === 'pending' ? 'warning' :
                          'default'
                        }
                      >
                        {
                          fileDetails.projectInfo.status === 'completed' ? '完了' :
                          fileDetails.projectInfo.status === 'in_progress' ? '進行中' :
                          fileDetails.projectInfo.status === 'pending' ? '保留中' :
                          fileDetails.projectInfo.status === 'planning' ? '計画中' :
                          fileDetails.projectInfo.status
                        }
                      </Tag>
                    )}
                  </Space>
                </Space>
              </Col>
              <Col xs={24} sm={12}>
                <Space orientation="vertical" size={0}>
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    プロジェクトID
                  </Text>
                  <Text style={{ fontSize: token.fontSizeSM }}>
                    {fileDetails.projectInfo.projectId}
                  </Text>
                </Space>
              </Col>
            </Row>

            {fileDetails.projectInfo.projectDescription && (
              <Row>
                <Col span={24}>
                  <Space orientation="vertical" size={0}>
                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                      説明
                    </Text>
                    <Text>{fileDetails.projectInfo.projectDescription}</Text>
                  </Space>
                </Col>
              </Row>
            )}

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Space orientation="vertical" size={0}>
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    オーナー
                  </Text>
                  <Text>{fileDetails.projectInfo.owner}</Text>
                </Space>
              </Col>
              {fileDetails.projectInfo.department && (
                <Col xs={24} sm={8}>
                  <Space orientation="vertical" size={0}>
                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                      部門
                    </Text>
                    <Text>{fileDetails.projectInfo.department}</Text>
                  </Space>
                </Col>
              )}
              <Col xs={24} sm={8}>
                <Space orientation="vertical" size={0}>
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    更新日時
                  </Text>
                  <Text style={{ fontSize: token.fontSizeSM }}>
                    {new Date(fileDetails.projectInfo.updatedAt).toLocaleString()}
                  </Text>
                </Space>
              </Col>
            </Row>
          </Space>
        </Card>
      )}

      {/* メソッドフィルタ（メソッドが複数ある場合のみ表示） */}
      {needsMethodFilter && (
        <Card
          size="small"
          variant="borderless"
          style={{
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorder}`,
            borderRadius: 0,
          }}
        >
          <Row gutter={[16, 16]} align="middle">
            <Col flex="100px">
              <Text type="secondary" strong>
                メソッド:
              </Text>
            </Col>
            <Col flex="auto">
              <Select
                placeholder="すべてのメソッド"
                value={selectedMethod}
                onChange={handleMethodFilterChange}
                allowClear
                style={{ width: '100%', maxWidth: 300 }}
                data-testid="progress-detail-method-filter"
                options={projectMethods.map(method => ({
                  label: method,
                  value: method,
                }))}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* 作業ID別タブ */}
      {fileDetails?.workDetails && fileDetails.workDetails.length > 0 && (
        <Tabs
          activeKey={String(selectedWorkIndex)}
          onChange={handleTabChange}
          items={tabItems}
          type="card"
          data-testid="progress-detail-task-tabs"
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
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            {/* タスク詳細 */}
            <Card size="small" title="タスク詳細">
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={6}>
                  <Space orientation="vertical" size={0}>
                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                      タスクNo
                    </Text>
                    <Text strong style={{ fontSize: token.fontSize }}>
                      {selectedWork.taskNo}
                    </Text>
                  </Space>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Space orientation="vertical" size={0}>
                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                      タスクステータス
                    </Text>
                    <Tag color={getWorkStatusColor(selectedWork.workStatus)}>
                      {getWorkStatusLabel(selectedWork.workStatus)}
                    </Tag>
                  </Space>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Space orientation="vertical" size={0}>
                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                      メソッド名
                    </Text>
                    <Text style={{ fontSize: token.fontSizeSM }}>
                      {selectedWork.methodName || '-'}
                    </Text>
                  </Space>
                </Col>
              </Row>
            </Card>

            {/* トランジションサマリー */}
            <Card size="small" title="トランジションサマリー">
              <Space orientation="vertical" size="middle" style={{ width: '100%' }}>

                {/* トランジション統計 */}
                <Row gutter={[8, 8]}>
                  <Col flex="1" style={{ minWidth: '100px' }}>
                    <Card
                      size="small"
                      style={{
                        textAlign: 'center',
                        background: token.colorBgLayout,
                        padding: `${token.paddingXXS}px ${token.paddingXS}px`,
                      }}
                      styles={{ body: { padding: token.paddingXS } }}
                    >
                      <Text strong style={{ fontSize: token.fontSize }}>
                        {selectedWork.stats.totalTransitions}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                        全体
                      </Text>
                    </Card>
                  </Col>
                  <Col flex="1" style={{ minWidth: '100px' }}>
                    <Card
                      size="small"
                      style={{
                        textAlign: 'center',
                        background: token.colorSuccessBg,
                        padding: `${token.paddingXXS}px ${token.paddingXS}px`,
                      }}
                      styles={{ body: { padding: token.paddingXS } }}
                    >
                      <Text strong style={{ fontSize: token.fontSize, color: token.colorSuccess }}>
                        {selectedWork.stats.completed}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                        完了
                      </Text>
                    </Card>
                  </Col>
                  <Col flex="1" style={{ minWidth: '100px' }}>
                    <Card
                      size="small"
                      style={{
                        textAlign: 'center',
                        background: token.colorPrimaryBg,
                        padding: `${token.paddingXXS}px ${token.paddingXS}px`,
                      }}
                      styles={{ body: { padding: token.paddingXS } }}
                    >
                      <Text strong style={{ fontSize: token.fontSize, color: token.colorPrimary }}>
                        {selectedWork.stats.working}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                        作業中
                      </Text>
                    </Card>
                  </Col>
                  <Col flex="1" style={{ minWidth: '100px' }}>
                    <Card
                      size="small"
                      style={{
                        textAlign: 'center',
                        background: token.colorBgLayout,
                        padding: `${token.paddingXXS}px ${token.paddingXS}px`,
                      }}
                      styles={{ body: { padding: token.paddingXS } }}
                    >
                      <Text strong style={{ fontSize: token.fontSize }}>
                        {selectedWork.stats.notStarted}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                        未着手
                      </Text>
                    </Card>
                  </Col>
                  <Col flex="1" style={{ minWidth: '100px' }}>
                    <Card
                      size="small"
                      style={{
                        textAlign: 'center',
                        background: token.colorInfoBg,
                        padding: `${token.paddingXXS}px ${token.paddingXS}px`,
                      }}
                      styles={{ body: { padding: token.paddingXS } }}
                    >
                      <Text strong style={{ fontSize: token.fontSize, color: token.colorInfo }}>
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
            {fileDetails?.fileInfo && fileDetails.fileInfo.maimlFileKey && (
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
                    workerId={selectedWork.assignedWorkerId || ''}
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
                <Space 
                  orientation="vertical" 
                  size="small" 
                  style={{ width: '100%', marginTop: token.marginXS }}
                >
                  {selectedWork.transitionProgress.map((transition: TransitionProgress) => (
                    <Card
                      key={transition.transitionId}
                      size="small"
                      style={{ width: '100%', borderColor: token.colorBorder }}
                    >
                        <Row gutter={[16, 8]} align="middle">
                          <Col flex="30px">
                            {getProgressStatusIcon(transition.progressStatus)}
                          </Col>
                          <Col flex="auto" style={{ minWidth: 0 }}>
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
                            </Flex>
                            <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                              ID: {transition.transitionId}
                            </Text>
                          </Col>
                          <Col xs={24} sm={8} md={6}>
                            <Space orientation="vertical" size={0}>
                              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                                作業者
                              </Text>
                              <Text style={{ fontSize: token.fontSizeSM }}>
                                {transition.assignedWorker || '-'}
                              </Text>
                            </Space>
                          </Col>
                          <Col xs={24} sm={8} md={6}>
                            <Space orientation="vertical" size={0}>
                              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                                開始日
                              </Text>
                              <Text style={{ fontSize: token.fontSizeSM }}>
                                {transition.startDate
                                  ? new Date(transition.startDate).toLocaleString('ja-JP', {
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : '-'}
                              </Text>
                            </Space>
                          </Col>
                          <Col xs={24} sm={8} md={6}>
                            <Space orientation="vertical" size={0}>
                              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                                終了日
                              </Text>
                              <Text style={{ fontSize: token.fontSizeSM }}>
                                {transition.endDate && transition.progressStatus === '完了'
                                  ? new Date(transition.endDate).toLocaleString('ja-JP', {
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : '-'}
                              </Text>
                            </Space>
                          </Col>
                        </Row>
                      </Card>
                  ))}
                </Space>
              </div>
            )}

            {selectedWork.transitionProgress &&
              selectedWork.transitionProgress.length === 0 && (
                <Alert
                  title="トランジション進捗データがありません"
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
          title="作業IDが割り当てられていません"
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
