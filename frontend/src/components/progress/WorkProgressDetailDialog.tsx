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
import axios from 'axios';
import PetriNetVisualization from './PetriNetVisualization';
import type {
  FileData,
  FileDetails,
  WorkDetail,
  TransitionProgress,
} from '@/types/progress';
// モックデータのインポート
import mockProjectsData from '@/data/mock/mockProjects.json';

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

      // プロジェクトIDからモックデータを選択
      // fileDataのmaimlFileKeyからプロジェクトIDを抽出
      const projectIdMatch = fileData.maimlFileKey.match(/projects?\/(proj_\d+)/);
      const projectId = projectIdMatch ? projectIdMatch[1] : null;
      
      // mockProjects.jsonから該当プロジェクトを取得
      const project = mockProjectsData.projects.find(p => p.id === projectId);
      
      if (!project) {
        throw new Error(`プロジェクト ${projectId} が見つかりません`);
      }

      // APIレスポンス形式に変換
      const response = {
        success: true,
        data: {
          projectInfo: {
            projectId: project.id,
            projectName: project.name,
            projectDescription: project.description,
            owner: project.owner,
            department: project.department,
            status: project.status,
            methods: project.methods,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt
          },
          fileInfo: {
            fileName: project.fileInfo.fileName,
            maimlFileKey: project.fileInfo.maimlFileKey,
            organizationId: project.fileInfo.organizationId,
            checkoutStatus: {
              isCheckedOut: project.isCheckedOut,
              checkoutBy: project.checkedOutBy || null
            }
          },
          workDetails: project.tasks.map(task => ({
            workId: task.workId,
            taskName: task.taskName,
            methodName: task.methodName,
            assignedWorkerId: task.assignedWorkerId,
            workStatus: task.workStatus,
            progressPercentage: task.progressPercentage,
            stats: task.stats,
            transitionProgress: task.transitionProgress || []
          }))
        }
      };

      if (response.success) {
        const { projectInfo, fileInfo, workDetails } = response.data;

        console.log('✅ [FileProgressDetail] ファイル詳細取得成功（モックデータ）:', {
          projectId,
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
        {work.taskName || `作業${index + 1}`}
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

      {/* プロジェクト基本情報 */}
      {fileDetails?.projectInfo && (
        <Card
          size="small"
          bordered={false}
          style={{
            background: token.colorBgLayout,
            borderBottom: `1px solid ${token.colorBorder}`,
            borderRadius: 0,
          }}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Text type="secondary" strong>
              プロジェクト情報
            </Text>
            
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Space direction="vertical" size={0}>
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
                <Space direction="vertical" size={0}>
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
                  <Space direction="vertical" size={0}>
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
                <Space direction="vertical" size={0}>
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    オーナー
                  </Text>
                  <Text>{fileDetails.projectInfo.owner}</Text>
                </Space>
              </Col>
              {fileDetails.projectInfo.department && (
                <Col xs={24} sm={8}>
                  <Space direction="vertical" size={0}>
                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                      部門
                    </Text>
                    <Text>{fileDetails.projectInfo.department}</Text>
                  </Space>
                </Col>
              )}
              <Col xs={24} sm={8}>
                <Space direction="vertical" size={0}>
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
          bordered={false}
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
            {/* タスク詳細 */}
            <Card size="small" title="タスク詳細">
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={6}>
                  <Space direction="vertical" size={0}>
                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                      タスク名
                    </Text>
                    <Text strong style={{ fontSize: token.fontSize }}>
                      {selectedWork.taskName || selectedWork.workId}
                    </Text>
                  </Space>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Space direction="vertical" size={0}>
                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                      タスクID
                    </Text>
                    <Text style={{ fontSize: token.fontSizeSM }}>
                      {selectedWork.workId}
                    </Text>
                  </Space>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Space direction="vertical" size={0}>
                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                      タスクステータス
                    </Text>
                    <Tag color={getWorkStatusColor(selectedWork.workStatus)}>
                      {getWorkStatusLabel(selectedWork.workStatus)}
                    </Tag>
                  </Space>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Space direction="vertical" size={0}>
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
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>

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
                      bodyStyle={{ padding: token.paddingXS }}
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
                      bodyStyle={{ padding: token.paddingXS }}
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
                      bodyStyle={{ padding: token.paddingXS }}
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
                      bodyStyle={{ padding: token.paddingXS }}
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
                      bodyStyle={{ padding: token.paddingXS }}
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
            {fileDetails?.fileInfo && selectedWork.assignedWorkerId && (
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
                            <Space direction="vertical" size={0}>
                              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                                作業者
                              </Text>
                              <Text style={{ fontSize: token.fontSizeSM }}>
                                {transition.assignedWorker || '-'}
                              </Text>
                            </Space>
                          </Col>
                          <Col xs={24} sm={8} md={6}>
                            <Space direction="vertical" size={0}>
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
                            <Space direction="vertical" size={0}>
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
