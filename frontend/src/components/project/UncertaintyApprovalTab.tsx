'use client';

import React, { useState, useMemo } from 'react';
import {
  Button,
  Table,
  Tag,
  Space,
  Select,
  DatePicker,
  Checkbox,
  Dropdown,
  Typography,
  Flex,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { ReloadOutlined, DownOutlined } from '@ant-design/icons';
import { useLanguage } from '@/contexts/LanguageContext';
// TODO:[MOCK] バックエンド実装時に削除 — JSONモックをAPIに置換する
import mockData from '../../../mock/uncertainty-approval.json';

const { Text } = Typography;
const { RangePicker } = DatePicker;

/** 承認状態の型 */
type ApprovalStatus = 'pending' | 'approved' | 'rejected';

/** 対象タイプの型 */
type TargetType = 'material' | 'condition' | 'result';

/** 不確かさ承認レコードの型 */
interface UncertaintyApprovalRecord {
  id: string;
  taskNumber: string;
  targetType: TargetType;
  methodName: string;
  transitionName: string;
  templateName: string;
  assignedValue: string;
  assignedBy: string;
  assignedAt: string;
  comment: string;
  approvalStatus: ApprovalStatus;
}

interface UncertaintyApprovalTabProps {
  /** 現在選択中のプロジェクトID */
  projectId: string;
}

/**
 * 不確かさ承認タブコンポーネント（モック）
 */
const UncertaintyApprovalTab: React.FC<UncertaintyApprovalTabProps> = ({ projectId: _projectId }) => {
  const { t } = useLanguage();
  const { token } = theme.useToken();

  // モックデータをstateで管理
  const [records, setRecords] = useState<UncertaintyApprovalRecord[]>(
    mockData as UncertaintyApprovalRecord[]
  );

  // 選択行のキー
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // フィルタ状態
  const [fileFilter, setFileFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  // ユニークな付与者リスト
  const assigneeOptions = useMemo(() => {
    const names = Array.from(new Set(records.map((r) => r.assignedBy)));
    return [
      { value: 'all', label: t('uncertaintyApproval.filter.all') },
      ...names.map((n) => ({ value: n, label: n })),
    ];
  }, [records, t]);

  // フィルタ適用後のデータ
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (assigneeFilter !== 'all' && r.assignedBy !== assigneeFilter) return false;
      if (statusFilter !== 'all' && r.approvalStatus !== statusFilter) return false;
      return true;
    });
  }, [records, assigneeFilter, statusFilter]);

  /** フィルタクリア */
  const handleClearFilters = () => {
    setFileFilter('all');
    setAssigneeFilter('all');
    setStatusFilter('all');
    setDateRange(null);
  };

  /** 単一承認 */
  const handleApprove = (id: string) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, approvalStatus: 'approved' } : r))
    );
  };

  /** 単一差し戻し */
  const handleReject = (id: string) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, approvalStatus: 'rejected' } : r))
    );
  };

  /** 一括承認 */
  const handleBulkApprove = () => {
    setRecords((prev) =>
      prev.map((r) =>
        selectedRowKeys.includes(r.id) ? { ...r, approvalStatus: 'approved' } : r
      )
    );
    setSelectedRowKeys([]);
  };

  /** 一括差し戻し */
  const handleBulkReject = () => {
    setRecords((prev) =>
      prev.map((r) =>
        selectedRowKeys.includes(r.id) ? { ...r, approvalStatus: 'rejected' } : r
      )
    );
    setSelectedRowKeys([]);
  };

  /** 一括承認済みにする */
  const handleBulkMarkApproved = () => {
    setRecords((prev) =>
      prev.map((r) =>
        selectedRowKeys.includes(r.id) ? { ...r, approvalStatus: 'approved' } : r
      )
    );
    setSelectedRowKeys([]);
  };

  /** 承認状態タグのレンダリング */
  const renderStatusTag = (status: ApprovalStatus) => {
    switch (status) {
      case 'approved':
        return (
          <Tag color="success">
            {t('uncertaintyApproval.status.approved')}
          </Tag>
        );
      case 'rejected':
        return (
          <Tag color="error">
            {t('uncertaintyApproval.status.rejected')}
          </Tag>
        );
      case 'pending':
      default:
        return (
          <Tag color="orange">
            {t('uncertaintyApproval.status.pending')}
          </Tag>
        );
    }
  };

  /** 日時フォーマット */
  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
  };

  /** 操作カラムの「∨」ドロップダウンメニュー */
  const getDropdownItems = (record: UncertaintyApprovalRecord): MenuProps['items'] => [
    {
      key: 'detail',
      label: t('uncertaintyApproval.action.detail'),
    },
    {
      key: 'approve',
      label: t('uncertaintyApproval.action.approve'),
      disabled: record.approvalStatus === 'approved',
      onClick: () => handleApprove(record.id),
    },
    {
      key: 'reject',
      label: t('uncertaintyApproval.action.reject'),
      disabled: record.approvalStatus === 'rejected',
      onClick: () => handleReject(record.id),
    },
  ];

  /** 対象タイプタグのレンダリング */
  const renderTargetTypeTag = (targetType: TargetType) => {
    switch (targetType) {
      case 'material':
        return <Tag color="blue">{t('uncertaintyApproval.targetType.material')}</Tag>;
      case 'condition':
        return <Tag color="green">{t('uncertaintyApproval.targetType.condition')}</Tag>;
      case 'result':
        return <Tag color="orange">{t('uncertaintyApproval.targetType.result')}</Tag>;
      default:
        return <Tag>{targetType}</Tag>;
    }
  };

  const columns: ColumnsType<UncertaintyApprovalRecord> = [
    {
      title: t('uncertaintyApproval.column.taskNumber'),
      dataIndex: 'taskNumber',
      key: 'taskNumber',
      width: 120,
      sorter: (a, b) => a.taskNumber.localeCompare(b.taskNumber),
    },
    {
      title: t('uncertaintyApproval.column.targetType'),
      dataIndex: 'targetType',
      key: 'targetType',
      width: 110,
      align: 'center',
      filters: [
        { text: t('uncertaintyApproval.targetType.material'), value: 'material' },
        { text: t('uncertaintyApproval.targetType.condition'), value: 'condition' },
        { text: t('uncertaintyApproval.targetType.result'), value: 'result' },
      ],
      onFilter: (value, record) => record.targetType === value,
      render: (targetType: TargetType) => renderTargetTypeTag(targetType),
    },
    {
      title: t('uncertaintyApproval.column.methodName'),
      dataIndex: 'methodName',
      key: 'methodName',
      width: 160,
      sorter: (a, b) => a.methodName.localeCompare(b.methodName),
    },
    {
      title: t('uncertaintyApproval.column.transitionName'),
      dataIndex: 'transitionName',
      key: 'transitionName',
      width: 180,
      sorter: (a, b) => a.transitionName.localeCompare(b.transitionName),
    },
    {
      title: t('uncertaintyApproval.column.templateName'),
      dataIndex: 'templateName',
      key: 'templateName',
      width: 220,
      sorter: (a, b) => a.templateName.localeCompare(b.templateName),
    },
    {
      title: t('uncertaintyApproval.column.assignedValue'),
      dataIndex: 'assignedValue',
      key: 'assignedValue',
      width: 170,
    },
    {
      title: t('uncertaintyApproval.column.assignedBy'),
      dataIndex: 'assignedBy',
      key: 'assignedBy',
      width: 110,
    },
    {
      title: t('uncertaintyApproval.column.assignedAt'),
      dataIndex: 'assignedAt',
      key: 'assignedAt',
      width: 140,
      sorter: (a, b) =>
        new Date(a.assignedAt).getTime() - new Date(b.assignedAt).getTime(),
      render: (val: string) => (
        <Text style={{ fontSize: token.fontSizeSM }}>{formatDateTime(val)}</Text>
      ),
    },
    {
      title: t('uncertaintyApproval.column.comment'),
      dataIndex: 'comment',
      key: 'comment',
      ellipsis: true,
    },
    {
      title: t('uncertaintyApproval.column.approvalStatus'),
      dataIndex: 'approvalStatus',
      key: 'approvalStatus',
      width: 100,
      align: 'center',
      filters: [
        { text: t('uncertaintyApproval.status.pending'), value: 'pending' },
        { text: t('uncertaintyApproval.status.approved'), value: 'approved' },
        { text: t('uncertaintyApproval.status.rejected'), value: 'rejected' },
      ],
      onFilter: (value, record) => record.approvalStatus === value,
      render: (status: ApprovalStatus) => renderStatusTag(status),
    },
    {
      title: t('uncertaintyApproval.column.action'),
      key: 'action',
      width: 120,
      align: 'center',
      render: (_: unknown, record: UncertaintyApprovalRecord) => (
        <Space size={4}>
          {record.approvalStatus === 'rejected' ? (
            <Button size="small" onClick={() => handleApprove(record.id)}>
              {t('uncertaintyApproval.action.resubmit')}
            </Button>
          ) : record.approvalStatus === 'approved' ? (
            <Button size="small" disabled>
              {t('uncertaintyApproval.action.detail')}
            </Button>
          ) : (
            <Button
              size="small"
              type="primary"
              onClick={() => handleApprove(record.id)}
            >
              {t('uncertaintyApproval.action.approve')}
            </Button>
          )}
          <Dropdown menu={{ items: getDropdownItems(record) }} trigger={['click']}>
            <Button size="small" icon={<DownOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  const hasSelection = selectedRowKeys.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* フィルタバー */}
      <div
        style={{
          padding: `${token.paddingSM}px ${token.paddingMD}px`,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          backgroundColor: token.colorBgContainer,
        }}
      >
        <Flex gap={token.marginSM} align="center" wrap="wrap">
          {/* ファイル */}
          <Space size={4}>
            <Text style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>
              {t('uncertaintyApproval.filter.file')}
            </Text>
            <Select
              style={{ width: 140 }}
              value={fileFilter}
              onChange={setFileFilter}
              options={[
                { value: 'all', label: t('uncertaintyApproval.filter.all') },
              ]}
              size="small"
            />
          </Space>

          {/* 担当者 */}
          <Space size={4}>
            <Text style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>
              {t('uncertaintyApproval.filter.assignee')}
            </Text>
            <Select
              style={{ width: 140 }}
              value={assigneeFilter}
              onChange={setAssigneeFilter}
              options={assigneeOptions}
              size="small"
            />
          </Space>

          {/* 付与日 */}
          <Space size={4}>
            <Text style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>
              {t('uncertaintyApproval.filter.assignedDate')}
            </Text>
            <RangePicker
              size="small"
              style={{ width: 230 }}
              onChange={(_, dateStrings) => {
                if (dateStrings[0] && dateStrings[1]) {
                  setDateRange([dateStrings[0], dateStrings[1]]);
                } else {
                  setDateRange(null);
                }
              }}
            />
          </Space>

          {/* 承認状態 */}
          <Space size={4}>
            <Text style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>
              {t('uncertaintyApproval.filter.approvalStatus')}
            </Text>
            <Select
              style={{ width: 120 }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: t('uncertaintyApproval.filter.all') },
                { value: 'pending', label: t('uncertaintyApproval.status.pending') },
                { value: 'approved', label: t('uncertaintyApproval.status.approved') },
                { value: 'rejected', label: t('uncertaintyApproval.status.rejected') },
              ]}
              size="small"
            />
          </Space>

          {/* フィルタをクリア / 検索 */}
          <Button size="small" onClick={handleClearFilters}>
            {t('uncertaintyApproval.filter.clearFilters')}
          </Button>
          <Button size="small" type="primary">
            {t('uncertaintyApproval.filter.search')}
          </Button>
        </Flex>
      </div>

      {/* アクションバー */}
      <div
        style={{
          padding: `${token.paddingXS}px ${token.paddingMD}px`,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          backgroundColor: token.colorBgContainer,
        }}
      >
        <Flex justify="space-between" align="center">
          {/* 左側: 一括操作ボタン */}
          <Space size={token.marginXS}>
            <Button
              type="primary"
              size="small"
              disabled={!hasSelection}
              onClick={handleBulkApprove}
            >
              {t('uncertaintyApproval.action.bulkApprove')}
            </Button>
            <Button
              size="small"
              disabled={!hasSelection}
              onClick={handleBulkReject}
            >
              {t('uncertaintyApproval.action.bulkReject')}
            </Button>
            <Button
              size="small"
              disabled={!hasSelection}
              onClick={handleBulkMarkApproved}
            >
              {t('uncertaintyApproval.action.markApproved')}
            </Button>
          </Space>

          {/* 右側: 件数表示 + 更新ボタン */}
          <Space size={token.marginXS}>
            <Text style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>
              {t('uncertaintyApproval.totalCount', {
                total: String(filteredRecords.length),
                from: '1',
                to: String(filteredRecords.length),
              })}
            </Text>
            <Button
              size="small"
              icon={<ReloadOutlined />}
              type="text"
            />
          </Space>
        </Flex>
      </div>

      {/* テーブル */}
      <div style={{ flex: 1, overflow: 'auto', backgroundColor: token.colorBgContainer }}>
        <Table<UncertaintyApprovalRecord>
          rowSelection={{
            type: 'checkbox',
            ...rowSelection,
          }}
          columns={columns}
          dataSource={filteredRecords}
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ x: 1650 }}
          onRow={(record) => ({
            style: {
              backgroundColor:
                record.approvalStatus === 'approved'
                  ? token.colorSuccessBg
                  : record.approvalStatus === 'rejected'
                  ? token.colorErrorBg
                  : undefined,
            },
          })}
        />
      </div>
    </div>
  );
};

export default UncertaintyApprovalTab;
