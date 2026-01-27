'use client';

import React, { useState, useMemo } from 'react';
import {
  Card,
  Input,
  Button,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useLanguage } from '@/contexts/LanguageContext';
import WorkProgressDetailDialog from './WorkProgressDetailDialog';
import type { FileData, Project } from '@/types/progress';
import { useApi } from '@/hooks/useApi';
import { fetchProjects } from '@/utils/apiClient';
import type { ApiResponse } from '@/types/api';
import type { ProjectListResponse } from '@/types/project';

const { Text } = Typography;

/**
 * 進捗情報の型定義（表示用）
 */
interface ProgressRecord {
  key: string;
  projectId: string;
  projectName: string;
  projectStatus: string;
  department: string;
  isCheckedOut: boolean;
  ownerEmail: string;
  ownerName: string;
  completedTasks: number;
  totalTasks: number;
}

type Order = 'asc' | 'desc';
type OrderBy = keyof ProgressRecord;

/**
 * 進捗管理画面コンポーネント
 */
export default function ProgressMonitoring() {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [searchText, setSearchText] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('my_only'); // my_only, all
  const [checkoutFilter, setCheckoutFilter] = useState('all');
  const [projectStatusFilter, setProjectStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [lastUpdated] = useState(new Date().toLocaleString('ja-JP'));
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<OrderBy>('projectName');
  
  // モーダル関連のState
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProgressRecord | null>(null);
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [managerId] = useState('manager_001'); // TODO: 実際のログインユーザーIDを使用

  // プロジェクト一覧をAPI経由で取得
  const { 
    data: projectsData, 
    isLoading: isLoadingProjects, 
    error: projectsError, 
    refetch: refetchProjects 
  } = useApi<ApiResponse<ProjectListResponse>>(
    fetchProjects,
    []
  );

  // APIから取得したデータを進捗記録形式に変換
  const allData: ProgressRecord[] = useMemo(() => {
    if (!projectsData?.data.projects) return [];
    
    return projectsData.data.projects.map(
      (item, index) => ({
        key: `${index + 1}`,
        projectId: item.id,
        projectName: item.name,
        projectStatus: item.status,
        department: item.department || '',
        isCheckedOut: item.isCheckedOut || false,
        ownerEmail: item.ownerEmail || '',
        ownerName: item.ownerName || item.owner || '',
        completedTasks: item.completedTasks || 0,
        totalTasks: item.totalTasks || 0,
      })
    );
  }, [projectsData]);

  // ユニークな部門リストを取得
  const departments = useMemo(() => {
    const uniqueDepartments = Array.from(new Set(allData.map((p) => p.department)));
    return uniqueDepartments.sort();
  }, [allData]);

  // フィルタリング処理
  const filteredData = useMemo(() => {
    return allData.filter((item) => {
      // プロジェクトステータスの表示名を取得
      const getProjectStatusLabel = (status: string) => {
        switch (status) {
          case 'planning':
            return t('progress.filter.planning') || 'プロジェクト計画中';
          case 'pending':
            return t('progress.filter.pending') || 'タスク実行待ち';
          case 'in_progress':
            return t('progress.filter.inProgress') || 'タスク実行中';
          case 'review_waiting':
            return t('progress.filter.reviewWaiting') || 'タスク結果レビュー待ち';
          case 'completed':
            return t('progress.filter.completed') || 'プロジェクト完了';
          case 'error':
            return t('progress.filter.error') || 'タスク異常終了';
          default:
            return status;
        }
      };

      // チェックアウトステータスの表示名を取得
      const getCheckoutStatusLabel = (isCheckedOut: boolean) => {
        if (isCheckedOut) {
          return t('projectManagement.checking_out') || 'チェックアウト中';
        } else {
          return t('projectManagement.checked_in') || 'チェックイン済み';
        }
      };

      const projectStatusLabel = getProjectStatusLabel(item.projectStatus);
      const checkoutStatusLabel = getCheckoutStatusLabel(item.isCheckedOut);

      // すべての項目で検索可能に（表示名も含む）
      const matchesSearch =
        searchText === '' ||
        item.projectId.toLowerCase().includes(searchText.toLowerCase()) ||
        item.projectName.toLowerCase().includes(searchText.toLowerCase()) ||
        item.projectStatus.toLowerCase().includes(searchText.toLowerCase()) ||
        projectStatusLabel.toLowerCase().includes(searchText.toLowerCase()) ||
        checkoutStatusLabel.toLowerCase().includes(searchText.toLowerCase()) ||
        item.department.toLowerCase().includes(searchText.toLowerCase()) ||
        item.ownerEmail.toLowerCase().includes(searchText.toLowerCase()) ||
        item.ownerName.toLowerCase().includes(searchText.toLowerCase()) ||
        item.completedTasks.toString().includes(searchText) ||
        item.totalTasks.toString().includes(searchText);

      let matchesCheckout = true;
      if (checkoutFilter !== 'all') {
        if (checkoutFilter === 'checkedOut') {
          matchesCheckout = item.isCheckedOut === true;
        } else if (checkoutFilter === 'checkedIn') {
          matchesCheckout = item.isCheckedOut === false;
        }
      }

      let matchesProjectStatus = true;
      if (projectStatusFilter !== 'all') {
        matchesProjectStatus = item.projectStatus === projectStatusFilter;
      }

      let matchesDepartment = true;
      if (departmentFilter !== 'all') {
        matchesDepartment = item.department === departmentFilter;
      }

      return (
        matchesSearch &&
        matchesCheckout &&
        matchesProjectStatus &&
        matchesDepartment
      );
    });
  }, [
    allData,
    searchText,
    checkoutFilter,
    projectStatusFilter,
    departmentFilter,
    t,
  ]);

  // ソート処理
  const sortedData = useMemo(() => {
    const comparator = (a: ProgressRecord, b: ProgressRecord) => {
      const aValue: string | number | boolean = a[orderBy];
      const bValue: string | number | boolean = b[orderBy];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return order === 'asc'
          ? aValue.localeCompare(bValue, 'ja')
          : bValue.localeCompare(aValue, 'ja');
      }

      if (order === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return bValue < aValue ? -1 : bValue > aValue ? 1 : 0;
      }
    };

    return [...filteredData].sort(comparator);
  }, [filteredData, order, orderBy]);

  // 統計データ計算
  const totalProjects = filteredData.length;

  // プロジェクトステータスの色を取得する関数
  const getProjectStatusColor = (status: string): 'default' | 'info' | 'primary' | 'success' => {
    switch (status) {
      case 'planning':
        return 'default';
      case 'pending':
        return 'info';
      case 'in_progress':
        return 'primary';
      case 'completed':
        return 'success';
      default:
        return 'default';
    }
  };

  // プロジェクトステータスのラベルを取得する関数
  const getProjectStatusLabel = (status: string) => {
    switch (status) {
      case 'planning':
        return t('progress.filter.planning') || 'プロジェクト計画中';
      case 'pending':
        return t('progress.filter.pending') || 'タスク実行待ち';
      case 'in_progress':
        return t('progress.filter.inProgress') || 'タスク実行中';
      case 'review_waiting':
        return t('progress.filter.reviewWaiting') || 'タスク結果レビュー待ち';
      case 'completed':
        return t('progress.filter.completed') || 'プロジェクト完了';
      case 'error':
        return t('progress.filter.error') || 'タスク異常終了';
      default:
        return status;
    }
  };

  // 詳細表示ハンドラ
  const handleViewDetails = (record: ProgressRecord) => {
    setSelectedProject(record);
    // test_omori11.maimlを使用（mock環境）
    const dummyFileData: FileData = {
      maimlFileKey: `org_001/projects/${record.projectId}/test_omori11.maiml`,
      fileName: `test_omori11.maiml`,
    };
    setFileData(dummyFileData);
    setIsDetailDialogOpen(true);
  };
  
  // モーダルを閉じるハンドラ
  const handleCloseDialog = () => {
    setIsDetailDialogOpen(false);
    setSelectedProject(null);
    setFileData(null);
  };

  const handleRefresh = () => {
    console.log('Refresh data');
    refetchProjects();
  };

  // Ant Design Tableのカラム定義
  const columns: ColumnsType<ProgressRecord> = [
    {
      title: (
        <Space size="small">
          <span>{t('progress.table.projectName') || 'プロジェクト名'}</span>
          <Tag color="blue" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
            {totalProjects}
          </Tag>
        </Space>
      ),
      dataIndex: 'projectName',
      key: 'projectName',
      width: 250,
      sorter: (a, b) => a.projectName.localeCompare(b.projectName, 'ja'),
      render: (text: string, record: ProgressRecord) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.projectId}
          </Text>
        </div>
      ),
    },
    {
      title: t('progress.filter.department') || '部門',
      dataIndex: 'department',
      key: 'department',
      width: 120,
      sorter: (a, b) => a.department.localeCompare(b.department, 'ja'),
    },
    {
      title: t('progress.table.projectStatus') || 'プロジェクトステータス',
      dataIndex: 'projectStatus',
      key: 'projectStatus',
      width: 180,
      sorter: (a, b) => a.projectStatus.localeCompare(b.projectStatus),
      render: (status: string) => {
        const getStatusColor = (status: string) => {
          switch (status) {
            case 'planning':
              return 'default';
            case 'pending':
              return 'blue';
            case 'in_progress':
              return 'cyan';
            case 'review_waiting':
              return 'purple';
            case 'completed':
              return 'success';
            case 'error':
              return 'error';
            default:
              return 'default';
          }
        };
        return (
          <Tag color={getStatusColor(status)}>
            {getProjectStatusLabel(status)}
          </Tag>
        );
      },
    },
    {
      title: t('progress.table.checkoutStatus') || 'チェックアウト',
      dataIndex: 'isCheckedOut',
      key: 'isCheckedOut',
      width: 150,
      align: 'center',
      sorter: (a, b) => Number(a.isCheckedOut) - Number(b.isCheckedOut),
      render: (isCheckedOut: boolean) =>
        isCheckedOut ? (
          <Tag color="orange">{t('projectManagement.checking_out') || 'チェックアウト中'}</Tag>
        ) : (
          <Tag color="success">{t('projectManagement.checked_in') || 'チェックイン済み'}</Tag>
        ),
    },
    {
      title: t('progress.table.owner') || '所有者',
      dataIndex: 'ownerName',
      key: 'ownerName',
      width: 150,
      sorter: (a, b) => a.ownerName.localeCompare(b.ownerName, 'ja'),
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: t('progress.table.taskProgress') || '完了タスク数/総タスク数',
      key: 'progress',
      width: 150,
      align: 'center',
      sorter: (a, b) => a.completedTasks - b.completedTasks,
      render: (_text: string, record: ProgressRecord) => (
        <span style={{ fontWeight: 500 }}>
          {record.completedTasks}/{record.totalTasks}
        </span>
      ),
    },
    {
      title: t('progress.table.actions') || '操作',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_text: string, record: ProgressRecord) => (
        <Button
          type="primary"
          ghost
          icon={<EyeOutlined />}
          size="small"
          onClick={() => handleViewDetails(record)}
        >
          {t('progress.actions.viewDetails')}
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: token.paddingLG, backgroundColor: token.colorBgLayout, minHeight: '100vh' }}>
      {/* 検索・フィルタエリア */}
      <Card style={{ marginBottom: token.paddingLG }} variant="borderless">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Space orientation="horizontal" size="middle" wrap>
            <Space size={4} orientation="horizontal">
              <Text type="secondary" style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>
                {t('progress.filter_labels.owner')}
              </Text>
              <Select
                style={{ width: 150 }}
                value={ownerFilter}
                onChange={setOwnerFilter}
                options={[
                  { value: 'my_only', label: t('progress.filter.myOnly') || '自分所有のみ' },
                  { value: 'all', label: t('progress.filter.allProjects') || '全体' },
                ]}
              />
            </Space>

            <Space size={4} orientation="horizontal">
              <Text type="secondary" style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>
                {t('progress.filter_labels.department')}
              </Text>
              <Select
                style={{ width: 150 }}
                value={departmentFilter}
                onChange={setDepartmentFilter}
                options={[
                  { value: 'all', label: t('progress.filter.allDepartments') || '全部門' },
                  ...departments.map(dept => ({ value: dept, label: dept })),
                ]}
              />
            </Space>

            <Space size={4} orientation="horizontal">
              <Text type="secondary" style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>
                {t('progress.filter_labels.project_status')}
              </Text>
              <Select
                style={{ width: 200 }}
                value={projectStatusFilter}
                onChange={setProjectStatusFilter}
                options={[
                  { value: 'all', label: t('progress.filter.allStatus') },
                  { value: 'planning', label: t('progress.filter.planning') },
                  { value: 'pending', label: t('progress.filter.pending') },
                  { value: 'inProgress', label: t('progress.filter.inProgress') },
                  { value: 'reviewWaiting', label: t('progress.filter.reviewWaiting') },
                  { value: 'completed', label: t('progress.filter.completed') },
                  { value: 'error', label: t('progress.filter.error') },
                ]}
              />
            </Space>

            <Space size={4} orientation="horizontal">
              <Text type="secondary" style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>
                {t('progress.filter_labels.checkout_status')}
              </Text>
              <Select
                style={{ width: 150 }}
                value={checkoutFilter}
                onChange={setCheckoutFilter}
                options={[
                  { value: 'all', label: t('progress.filter.all') || '全て' },
                  { value: 'checkedOut', label: t('progress.filter.checkedOut') || 'チェックアウト済み' },
                  { value: 'checkedIn', label: t('progress.filter.checkedIn') || 'チェックイン済み' },
                ]}
              />
            </Space>

            <Space size={4} orientation="horizontal">
              <Text type="secondary" style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>
                {t('progress.filter_labels.search')}
              </Text>
              <Input
                prefix={<SearchOutlined />}
                placeholder={t('progress.filter_placeholder') || '入力値でフィルタリング'}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 300 }}
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

      {/* テーブル */}
      <Card variant="borderless">
        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey="key"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `${t('progress.table.total') || '合計'} ${total} ${t('progress.table.items') || '件'}`,
            pageSizeOptions: ['5', '10', '25', '50'],
          }}
          scroll={{ x: 1200 }}
          size="middle"
        />
      </Card>

      {/* 作業進捗詳細ダイアログ */}
      <WorkProgressDetailDialog
        open={isDetailDialogOpen}
        onClose={handleCloseDialog}
        fileData={fileData}
        managerId={managerId}
      />
    </div>
  );
}
