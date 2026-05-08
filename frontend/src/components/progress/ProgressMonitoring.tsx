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
  message,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useLanguage } from '@/contexts/LanguageContext';
import WorkProgressDetailDialog from './WorkProgressDetailDialog';
import type { FileData, Project } from '@/types/progress';
import type { ProjectFile } from '@/types/file';
import { useApi } from '@/hooks/useApi';
import { getProjects, getProjectFiles } from '@/services/projectApiService';
import type { ApiResponse as ProjectApiResponse, ProjectListResponse } from '@/services/projectApiService';
import { getUserInfo } from '@/utils/sessionStorageHelper';

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
  /** MAIMLファイルが登録済みか（project_uuid または maimlFileKey が存在する場合 true） */
  hasMaiml: boolean;
}

/**
 * 進捗管理画面コンポーネント
 */
export default function ProgressMonitoring() {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [searchText, setSearchText] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('my_only'); // my_only, all
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [checkoutFilter, setCheckoutFilter] = useState('all');
  const [projectStatusFilter, setProjectStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  // モーダル関連のState
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [fileData, setFileData] = useState<FileData | null>(null);
  // 詳細ボタン押下時のローディング状態（Phase 3）: クリックしたプロジェクトIDを保持
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);

  // プロジェクト一覧をAPI経由で取得
  const { 
    data: projectsData, 
    refetch: refetchProjects 
  } = useApi<ProjectApiResponse<ProjectListResponse>>(
    getProjects,
    []
  );

  /**
   * プロジェクトステータスの数値コードを文字列キーに変換する
   * APIレスポンスの status は数値（0〜5）だが、
   * フィルタリング・表示ロジックは文字列キーを期待しているため変換が必要
   * 
   * マッピング（バックエンド code_master テーブルに基づく）:
   * 0 → 'planning'       プロジェクト計画中
   * 1 → 'pending'        タスク実行待ち
   * 2 → 'in_progress'    タスク実行中
   * 3 → 'review_waiting' タスク結果レビュー待ち
   * 4 → 'completed'      プロジェクト完了
   * 5 → 'error'          タスク異常終了
   */
  const getStatusStringFromNumber = (status: number): string => {
    const map: Record<number, string> = {
      0: 'planning',
      1: 'pending',
      2: 'in_progress',
      3: 'review_waiting',
      4: 'completed',
      5: 'error',
    };
    return map[status] ?? 'planning';
  };

  // APIから取得したデータを進捗記録形式に変換
  const allData: ProgressRecord[] = useMemo(() => {
    if (!projectsData || !projectsData.success) return [];

    const rawData = projectsData.data;

    const projects = Array.isArray(rawData)
      ? (rawData as unknown as Project[])
      : ((rawData as unknown as ProjectListResponse)?.projects ?? []);

    if (!projects.length) return [];

    return projects.map(
      (item, index) => ({
        key: `${index + 1}`,
        projectId: item.id,
        projectName: item.name,
        projectStatus: getStatusStringFromNumber(Number(item.status)),
        department: item.department || '',
        isCheckedOut: item.isCheckedOut || false,
        ownerEmail: item.ownerEmail || '',
        ownerName: item.ownerName || item.owner || '',
        completedTasks: item.completedTasks || 0,
        totalTasks: item.totalTasks || 0,
        // project_uuid または maimlFileKey が存在する場合は MAIML 登録済みとみなす
        hasMaiml: !!(item.project_uuid || item.maimlFileKey),
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
      const getProjectStatusLabel = (status: string) => {
        switch (status) {
          case 'planning': return t('progress.filter.planning') || 'プロジェクト計画中';
          case 'pending': return t('progress.filter.pending') || 'タスク実行待ち';
          case 'in_progress': return t('progress.filter.inProgress') || 'タスク実行中';
          case 'review_waiting': return t('progress.filter.reviewWaiting') || 'タスク結果レビュー待ち';
          case 'completed': return t('progress.filter.completed') || 'プロジェクト完了';
          case 'error': return t('progress.filter.error') || 'タスク異常終了';
          default: return status;
        }
      };

      const getCheckoutStatusLabel = (isCheckedOut: boolean) => {
        return isCheckedOut
          ? t('projectManagement.checking_out') || 'チェックアウト中'
          : t('projectManagement.checked_in') || 'チェックイン済み';
      };

      const projectStatusLabel = getProjectStatusLabel(item.projectStatus);
      const checkoutStatusLabel = getCheckoutStatusLabel(item.isCheckedOut);

      const st = searchText.toLowerCase();
      const matchesSearch =
        searchText === '' ||
        (item.projectId ?? '').toLowerCase().includes(st) ||
        (item.projectName ?? '').toLowerCase().includes(st) ||
        (item.projectStatus ?? '').toLowerCase().includes(st) ||
        projectStatusLabel.toLowerCase().includes(st) ||
        checkoutStatusLabel.toLowerCase().includes(st) ||
        (item.department ?? '').toLowerCase().includes(st) ||
        (item.ownerEmail ?? '').toLowerCase().includes(st) ||
        (item.ownerName ?? '').toLowerCase().includes(st) ||
        item.completedTasks.toString().includes(searchText) ||
        item.totalTasks.toString().includes(searchText);

      let matchesCheckout = true;
      if (checkoutFilter !== 'all') {
        if (checkoutFilter === 'checkedOut') matchesCheckout = item.isCheckedOut === true;
        else if (checkoutFilter === 'checkedIn') matchesCheckout = item.isCheckedOut === false;
      }

      let matchesProjectStatus = true;
      if (projectStatusFilter !== 'all') matchesProjectStatus = item.projectStatus === projectStatusFilter;

      let matchesDepartment = true;
      if (departmentFilter !== 'all') matchesDepartment = item.department === departmentFilter;

      const userInfo = getUserInfo();
      let matchesOwner = true;
      if (ownerFilter === 'my_only' && userInfo) {
        if (item.ownerEmail && userInfo.email) matchesOwner = item.ownerEmail === userInfo.email;
        else if (item.ownerName && userInfo.displayName) matchesOwner = item.ownerName === userInfo.displayName;
      }

      return matchesSearch && matchesOwner && matchesCheckout && matchesProjectStatus && matchesDepartment;
    });
  }, [allData, searchText, ownerFilter, checkoutFilter, projectStatusFilter, departmentFilter, t]);

  const totalProjects = filteredData.length;

  // プロジェクトステータスのラベルを取得する関数
  const getProjectStatusLabel = (status: string) => {
    switch (status) {
      case 'planning': return t('progress.filter.planning') || 'プロジェクト計画中';
      case 'pending': return t('progress.filter.pending') || 'タスク実行待ち';
      case 'in_progress': return t('progress.filter.inProgress') || 'タスク実行中';
      case 'review_waiting': return t('progress.filter.reviewWaiting') || 'タスク結果レビュー待ち';
      case 'completed': return t('progress.filter.completed') || 'プロジェクト完了';
      case 'error': return t('progress.filter.error') || 'タスク異常終了';
      default: return status;
    }
  };

  // 詳細表示ハンドラ
  const handleViewDetails = async (record: ProgressRecord) => {
    setLoadingProjectId(record.projectId);
    try {
      const filesResponse = await getProjectFiles(record.projectId, false);
      const mainFiles: ProjectFile[] = filesResponse.files ?? [];
      const maimlFile = mainFiles.find((f: ProjectFile) => f.name.endsWith('.maiml'));
      if (!maimlFile) {
        message.error('MAIMLファイルが見つかりません');
        return;
      }
      const resolvedFileData: FileData = {
        maimlFileKey: maimlFile.path,
        fileName: maimlFile.name,
        projectId: record.projectId,
      };
      setFileData(resolvedFileData);
      setIsDetailDialogOpen(true);
    } catch (error) {
      console.error('handleViewDetails error:', error);
      message.error('ファイル情報の取得に失敗しました');
    } finally {
      setLoadingProjectId(null);
    }
  };
  
  const handleCloseDialog = () => {
    setIsDetailDialogOpen(false);
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
        const getStatusColor = (s: string) => {
          switch (s) {
            case 'planning': return 'default';
            case 'pending': return 'blue';
            case 'in_progress': return 'cyan';
            case 'review_waiting': return 'purple';
            case 'completed': return 'success';
            case 'error': return 'error';
            default: return 'default';
          }
        };
        return <Tag color={getStatusColor(status)}>{getProjectStatusLabel(status)}</Tag>;
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
      width: 150,
      align: 'center',
      render: (_text: string, record: ProgressRecord) => {
        const isOtherLoading = loadingProjectId !== null && loadingProjectId !== record.projectId;
        const isThisLoading = loadingProjectId === record.projectId;
        // MAIMLファイル未登録の場合はボタンを非活性にする
        const isMaimlMissing = !record.hasMaiml;
        const isDisabled = isOtherLoading || isMaimlMissing;

        const button = (
          <Button
            type="primary"
            ghost
            icon={isMaimlMissing ? <WarningOutlined /> : <EyeOutlined />}
            size="small"
            data-testid={`progress-detail-button-${record.projectId}`}
            loading={isThisLoading}
            disabled={isDisabled}
            onClick={() => handleViewDetails(record)}
          >
            {t('progress.actions.viewDetails')}
          </Button>
        );

        if (isMaimlMissing) {
          return (
            <Tooltip title="MAIMLファイルが未登録のため詳細を表示できません">
              {/* disabled なボタンは Tooltip が効かないため span でラップ */}
              <span>{button}</span>
            </Tooltip>
          );
        }

        return button;
      },
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
            current: currentPage,
            pageSize: pageSize,
            showSizeChanger: true,
            showTotal: (total) => `${t('progress.table.total') || '合計'} ${total} ${t('progress.table.items') || '件'}`,
            pageSizeOptions: ['20', '50', '100'],
            onChange: (page, size) => { setCurrentPage(page); setPageSize(size); },
            onShowSizeChange: (_, newSize) => { setPageSize(newSize); setCurrentPage(1); },
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
      />
    </div>
  );
}
