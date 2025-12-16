'use client';

import React, { useState, useMemo } from 'react';
import {
  Card,
  Table,
  Input,
  Select,
  Space,
  Button,
  Tag,
  Typography,
  Statistic,
  Row,
  Col,
  Avatar,
  theme,
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  UserOutlined,
  CheckCircleOutlined,
  FolderOutlined,
  FileDoneOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { SorterResult, FilterValue } from 'antd/es/table/interface';
import { useLanguage } from '@/contexts/LanguageContext';
import mockWorkersData from '@/data/mock/mockWorkers.json';
import mockProjectProgressData from '@/data/mock/mockProjectProgress.json';
import WorkerDetailModal, { type WorkerDetails } from './WorkerDetailModal';

const { Text } = Typography;

/**
 * 作業者情報の型定義
 */
interface WorkerRecord {
  key: string;
  workerId: string;
  email: string;
  name: string;
  emailStatus: string;
  status: 'active' | 'inactive';
  totalTasks: number;
  inProgressTasks: number;
  reportedTasks: number;
  completedTasks: number;
  lastConnection: string | null;
  avatarLetter: string;
  avatarColor: string;
}

/**
 * 作業者管理画面コンポーネント
 */
export default function WorkerManagement() {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [searchText, setSearchText] = useState('');
  const [filterValue, setFilterValue] = useState('all');
  
  // モーダル関連のState
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [workerDetails, setWorkerDetails] = useState<WorkerDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // JSONファイルからデータを読み込み、プロジェクト進捗データで集計
  const mockData: WorkerRecord[] = useMemo(() => {
    return mockWorkersData.workers.map((worker) => {
      // この作業者の全プロジェクト進捗を取得
      const workerProjects = mockProjectProgressData.projectProgress.filter(
        (p) => p.ownerId === worker.id
      );

      // 総タスク数（全プロジェクトのtotalTransitionsの合計）
      const totalTasks = workerProjects.reduce((sum, p) => sum + p.totalTransitions, 0);

      // 作業中タスク数（completedTransitions < totalTransitions のタスク数の合計）
      const inProgressTasks = workerProjects.reduce((sum, p) => {
        const incomplete = p.totalTransitions - p.completedTransitions;
        return sum + incomplete;
      }, 0);

      // 報告済みタスク数（仮に完了タスクの80%とする - 実際のデータがないため）
      const completedTasks = workerProjects.reduce((sum, p) => sum + p.completedTransitions, 0);
      const reportedTasks = Math.floor(completedTasks * 0.8);

      // 日本語の名前を取得（メールステータスのロケール対応）
      const emailStatusText =
        worker.emailStatus === 'verified'
          ? 'メール確認済'
          : worker.emailStatus === 'unverified'
            ? 'メール未確認'
            : 'メール未設定';

      return {
        key: worker.id,
        workerId: worker.id,
        email: worker.email,
        name: worker.nameJa,
        emailStatus: emailStatusText,
        status: worker.status as 'active' | 'inactive',
        totalTasks,
        inProgressTasks,
        reportedTasks,
        completedTasks,
        lastConnection: worker.lastConnection
          ? new Date(worker.lastConnection).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            })
          : null,
        avatarLetter: worker.avatarLetter,
        avatarColor: worker.avatarColor,
      };
    });
  }, []);

  // 統計データ計算
  const totalWorkers = mockData.length;
  const activeWorkers = mockData.filter((item) => item.status === 'active').length;
  const totalAllTasks = mockData.reduce((sum, item) => sum + item.totalTasks, 0);
  const totalAllCompletedTasks = mockData.reduce((sum, item) => sum + item.completedTasks, 0);

  // フィルタリング処理
  const filteredData = useMemo(() => {
    return mockData.filter((item) => {
      // ステータスの表示名を取得
      const statusLabel = item.status === 'active' ? 'アクティブ' : '非アクティブ';
      
      // 全表示項目で検索可能に
      const matchesSearch =
        searchText === '' ||
        item.workerId.toLowerCase().includes(searchText.toLowerCase()) ||
        item.email.toLowerCase().includes(searchText.toLowerCase()) ||
        item.name.toLowerCase().includes(searchText.toLowerCase()) ||
        item.emailStatus.toLowerCase().includes(searchText.toLowerCase()) ||
        item.status.toLowerCase().includes(searchText.toLowerCase()) ||
        statusLabel.toLowerCase().includes(searchText.toLowerCase()) ||
        item.totalTasks.toString().includes(searchText) ||
        item.inProgressTasks.toString().includes(searchText) ||
        item.reportedTasks.toString().includes(searchText) ||
        item.completedTasks.toString().includes(searchText) ||
        (item.lastConnection && item.lastConnection.toLowerCase().includes(searchText.toLowerCase()));

      if (filterValue === 'all') return matchesSearch;
      if (filterValue === 'active') return matchesSearch && item.status === 'active';
      if (filterValue === 'inactive') return matchesSearch && item.status === 'inactive';

      return matchesSearch;
    });
  }, [mockData, searchText, filterValue]);

  // テーブルカラム定義
  const columns: ColumnsType<WorkerRecord> = [
    {
      title: t('worker.table.worker') || '作業者',
      dataIndex: 'email',
      key: 'worker',
      width: 280,
      sorter: (a, b) => a.name.localeCompare(b.name, 'ja'),
      render: (email: string, record: WorkerRecord) => (
        <Space size={12}>
          <Avatar
            style={{
              backgroundColor: record.avatarColor,
            }}
            size={40}
          >
            {record.avatarLetter}
          </Avatar>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {record.name}
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.workerId}
              </Text>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {email}
              </Text>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: t('worker.table.status') || 'ステータス',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      align: 'center',
      sorter: (a, b) => a.status.localeCompare(b.status),
      render: (status: 'active' | 'inactive') => (
        <Tag color={status === 'active' ? 'success' : 'default'}>
          {status === 'active'
            ? t('worker.status.active') || 'アクティブ'
            : t('worker.status.inactive') || '非アクティブ'}
        </Tag>
      ),
    },
    {
      title: t('worker.table.totalTasks') || '総タスク数',
      dataIndex: 'totalTasks',
      key: 'totalTasks',
      width: 120,
      align: 'center',
      sorter: (a, b) => a.totalTasks - b.totalTasks,
      render: (count: number) => <Text style={{ fontWeight: 500 }}>{count}</Text>,
    },
    {
      title: t('worker.table.inProgressTasks') || '作業中タスク数',
      dataIndex: 'inProgressTasks',
      key: 'inProgressTasks',
      width: 140,
      align: 'center',
      sorter: (a, b) => a.inProgressTasks - b.inProgressTasks,
      render: (count: number) => <Text style={{ fontWeight: 500 }}>{count}</Text>,
    },
    {
      title: t('worker.table.reportedTasks') || '報告済みタスク数',
      dataIndex: 'reportedTasks',
      key: 'reportedTasks',
      width: 140,
      align: 'center',
      sorter: (a, b) => a.reportedTasks - b.reportedTasks,
      render: (count: number) => <Text style={{ fontWeight: 500 }}>{count}</Text>,
    },
    {
      title: t('worker.table.completedTasks') || '完了タスク数',
      dataIndex: 'completedTasks',
      key: 'completedTasks',
      width: 120,
      align: 'center',
      sorter: (a, b) => a.completedTasks - b.completedTasks,
      render: (count: number) => <Text style={{ fontWeight: 500 }}>{count}</Text>,
    },
    {
      title: t('worker.table.lastConnection') || '最終接続',
      dataIndex: 'lastConnection',
      key: 'lastConnection',
      width: 150,
      align: 'center',
      sorter: (a, b) => {
        if (!a.lastConnection && !b.lastConnection) return 0;
        if (!a.lastConnection) return 1;
        if (!b.lastConnection) return -1;
        return a.lastConnection.localeCompare(b.lastConnection);
      },
      render: (date: string | null) => (
        <Text type={date ? undefined : 'secondary'}>
          {date || t('worker.table.noRecord') || '未記録'}
        </Text>
      ),
    },
    {
      title: t('worker.table.actions') || '操作',
      key: 'actions',
      width: 140,
      align: 'center',
      render: (_, record) => (
        <Button
          type="primary"
          ghost
          icon={<EyeOutlined />}
          size="small"
          onClick={() => handleViewDetails(record)}
        >
          {t('worker.actions.viewDetails') || '詳細'}
        </Button>
      ),
    },
  ];

  // 詳細表示ボタンのハンドラ
  const handleViewDetails = async (record: WorkerRecord) => {
    setSelectedWorkerId(record.workerId);
    setIsModalOpen(true);
    setLoadingDetails(true);
    
    try {
      // TODO: 実際のAPIコールに置き換える
      // 現時点ではモックデータを使用
      await new Promise(resolve => setTimeout(resolve, 500)); // ローディングを見せるための遅延
      
      // モック詳細データ
      const mockDetails: WorkerDetails = {
        workerId: record.workerId,
        name: record.name,
        email: record.email,
        sessionInfo: {
          lastLogin: record.lastConnection ? new Date(record.lastConnection).toISOString() : undefined,
          lastActivity: record.lastConnection ? new Date(record.lastConnection).toISOString() : undefined,
          totalSessions: Math.floor(Math.random() * 50) + 1,
        },
        stats: {
          totalFiles: record.totalTasks,
          completionRate: record.totalTasks > 0 ? Math.round((record.completedTasks / record.totalTasks) * 100) : 0,
          inProgressFiles: record.inProgressTasks,
        },
        assignedFiles: Array.from({ length: Math.min(record.totalTasks, 5) }, (_, i) => ({
          fileName: `sample_file_${i + 1}.maiml`,
          fileKey: `org_001/projects/project_001/files/sample_file_${i + 1}.maiml`,
          status: i < record.completedTasks ? 'completed' : i < record.completedTasks + record.inProgressTasks ? 'in_progress' : 'pending',
          progressPercentage: i < record.completedTasks ? 100 : i < record.completedTasks + record.inProgressTasks ? Math.floor(Math.random() * 80) + 10 : 0,
        })),
        progressData: {
          progress: Array.from({ length: Math.min(3, record.completedTasks) }, (_, i) => ({
            fileName: `sample_file_${i + 1}.maiml`,
            comments: i === 0 ? '実験データの入力が完了しました' : i === 1 ? '測定結果を確認しました' : '',
            progressPercentage: 100,
            timestamp: new Date(Date.now() - i * 86400000).toISOString(),
          })),
        },
      };
      
      setWorkerDetails(mockDetails);
    } catch (error) {
      console.error('Failed to fetch worker details:', error);
      setWorkerDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };
  
  // モーダルを閉じるハンドラ
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedWorkerId(null);
    setWorkerDetails(null);
  };

  const handleRefresh = () => {
    console.log('Refresh worker list');
  };

  return (
    <div style={{ padding: token.paddingLG, backgroundColor: token.colorBgLayout, minHeight: '100vh' }}>
      {/* 検索・フィルタエリア */}
      <Card style={{ marginBottom: token.paddingLG }} bordered={false}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Space direction="horizontal" size="middle" wrap>
            <Space size={4} direction="horizontal">
              <Text type="secondary" style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>
                {t('worker.filter_labels.status')}
              </Text>
              <Select
                style={{ width: 180 }}
                value={filterValue}
                onChange={setFilterValue}
                options={[
                  { value: 'all', label: t('worker.filter.allStatus') || '全ステータス' },
                  { value: 'active', label: t('worker.status.active') || 'アクティブ' },
                  { value: 'inactive', label: t('worker.status.inactive') || '非アクティブ' },
                ]}
              />
            </Space>

            <Space size={4} direction="horizontal">
              <Text type="secondary" style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>
                {t('worker.filter_labels.search')}
              </Text>
              <Input
                prefix={<SearchOutlined />}
                placeholder={t('progress.filter_placeholder') || '入力値でフィルタリング'}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 400 }}
                allowClear
              />
            </Space>
          </Space>

          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
          >
            {t('progress.refresh')}
          </Button>
        </div>
      </Card>

      {/* 統計カード */}
      <Row gutter={[16, 16]} style={{ marginBottom: token.paddingLG }}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              borderLeft: `4px solid ${token.colorInfo}`,
            }}
          >
            <Statistic
              title={t('worker.stats.totalWorkers') || '総作業者数'}
              value={totalWorkers}
              prefix={<UserOutlined style={{ color: token.colorInfo }} />}
              valueStyle={{ color: token.colorInfo, fontSize: token.fontSizeHeading3 }}
              suffix={t('worker.stats.people') || '人'}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              borderLeft: `4px solid ${token.colorSuccess}`,
            }}
          >
            <Statistic
              title={t('worker.stats.activeWorkers') || 'アクティブ'}
              value={activeWorkers}
              prefix={<CheckCircleOutlined style={{ color: token.colorSuccess }} />}
              valueStyle={{ color: token.colorSuccess, fontSize: token.fontSizeHeading3 }}
              suffix={t('worker.stats.people') || '人'}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              borderLeft: `4px solid ${token.colorWarning}`,
            }}
          >
            <Statistic
              title={t('worker.stats.totalTasks') || '総タスク数'}
              value={totalAllTasks}
              prefix={<FolderOutlined style={{ color: token.colorWarning }} />}
              valueStyle={{ color: token.colorWarning, fontSize: token.fontSizeHeading3 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              borderLeft: `4px solid ${token.colorWarning}`,
            }}
          >
            <Statistic
              title={t('worker.stats.completedTasks') || '完了タスク数'}
              value={totalAllCompletedTasks}
              prefix={<FileDoneOutlined style={{ color: token.colorWarning }} />}
              valueStyle={{ color: token.colorWarning, fontSize: token.fontSizeHeading3 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 作業者一覧テーブル */}
      <Card bordered={false}>
        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey="key"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `${t('worker.table.total') || '合計'} ${total} ${t('worker.stats.people') || '人'}`,
            pageSizeOptions: ['5', '10', '25', '50'],
          }}
          scroll={{ x: 1400 }}
          size="middle"
        />
      </Card>

      {/* 作業者詳細モーダル */}
      <WorkerDetailModal
        open={isModalOpen}
        onCancel={handleCloseModal}
        workerId={selectedWorkerId}
        workerDetails={workerDetails}
        loading={loadingDetails}
      />
    </div>
  );
}
