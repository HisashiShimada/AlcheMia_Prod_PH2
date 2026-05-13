'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Flex,
  Modal,
  Form,
  Select,
  Typography,
  Row,
  Col,
  theme,
  App,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  DeleteOutlined,
  ReloadOutlined,
  UploadOutlined,
  DownloadOutlined,
  EditOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { formatDateTime } from '@/utils/formatUtils';
import { getDepartmentConfig } from '@/types/departmentTypes';
import type { DepartmentUIRecord, MasterRecord } from '@/types/departmentTypes';
import { getMenuPermission } from '@/utils/menuPermissions';
import { useLanguage } from '@/contexts/LanguageContext';
import { extractErrorMessage } from '@/utils/errorUtils';
import {
  fetchMasters,
  createMaster,
  updateMaster,
  updateMasterStatus,
  batchUpdateMasterStatus,
  uploadCsv,
  downloadCsv,
} from '@/services/departmentApiService';

const { Text } = Typography;

/**
 * 部署管理画面のコンポーネント
 */
export default function DepartmentManagement() {
  const { modal, message } = App.useApp();
  const { token } = theme.useToken();
  const { t } = useLanguage();

  const isReadOnly = getMenuPermission('system_admin') === 0;

  // State管理
  const [departments, setDepartments] = useState<DepartmentUIRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentUIRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [form] = Form.useForm();

  // 設定情報を取得
  const config = getDepartmentConfig();

  // 部署一覧を取得
  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const data = await fetchMasters();
      setDepartments(data as unknown as DepartmentUIRecord[]);
      console.log('Loaded departments from API:', data.length, 'records');
    } catch (error) {
      console.error('Fetch error:', error);
      message.error(extractErrorMessage(error, t('departmentManagement.messages.fetchError')));
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  // 初回データ読み込み
  useEffect(() => {
    fetchDepartments();
  }, []);

  // フィルタ変化時に1ページ目にリセット
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText]);

  // フィルタリングされたデータ
  const filteredDepartments = useMemo(() => {
    return departments.filter(dept => {
      const searchLower = searchText.toLowerCase();
      if (!searchText.trim()) return true;

      const deptRecord = dept as DepartmentUIRecord;
      return (
        deptRecord.departmentId?.toLowerCase().includes(searchLower) ||
        deptRecord.displayName?.toLowerCase().includes(searchLower)
      );
    });
  }, [departments, searchText]);

  // テーブルカラム定義
  const columns: ColumnsType<DepartmentUIRecord> = useMemo(() => {
    return [
      {
        title: <div style={{ textAlign: 'center' }}>{t('departmentManagement.columns.departmentCd')}</div>,
        dataIndex: 'departmentId',
        key: 'departmentId',
        width: 150,
        align: 'left',
        sorter: (a, b) => {
          const aRecord = a as DepartmentUIRecord;
          const bRecord = b as DepartmentUIRecord;
          return aRecord.departmentId.localeCompare(bRecord.departmentId);
        },
      },
      {
        title: <div style={{ textAlign: 'center' }}>{t('departmentManagement.columns.departmentName')}</div>,
        dataIndex: 'displayName',
        key: 'displayName',
        width: 300,
        align: 'left',
        sorter: (a, b) => {
          const aRecord = a as DepartmentUIRecord;
          const bRecord = b as DepartmentUIRecord;
          return aRecord.displayName.localeCompare(bRecord.displayName);
        },
        render: (text: string, record: DepartmentUIRecord) => (
          <Text
            style={{
              fontWeight: token.fontWeightStrong,
              color: record.isActive === false ? token.colorTextDisabled : token.colorPrimary,
            }}
          >
            {text}
          </Text>
        ),
      },
      {
        title: <div style={{ textAlign: 'center' }}>{t('departmentManagement.columns.updatedAt')}</div>,
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        width: 180,
        align: 'right',
        sorter: (a, b) => {
          const aRecord = a as DepartmentUIRecord;
          const bRecord = b as DepartmentUIRecord;
          return (aRecord.updatedAt || '').localeCompare(bRecord.updatedAt || '');
        },
        render: (text: string) => formatDateTime(text || ''),
      },
      {
        title: '',
        key: 'action',
        width: 140,
        align: 'right',
        fixed: 'right',
        render: (_, record) => (
          <Flex gap="small" justify="end">
            <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} disabled={isReadOnly}>
              {t('departmentManagement.buttons.edit')}
            </Button>
            <Button
              size="small"
              onClick={() => handleToggleActive(record)}
              danger={record.isActive !== false}
              style={{ minWidth: '80px' }}
              disabled={isReadOnly}
            >
              {record.isActive !== false ? t('departmentManagement.status.inactive') : t('departmentManagement.status.active')}
            </Button>
          </Flex>
        ),
      },
    ];
  }, [token]);

  // テーブルの行選択
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  // 部署追加
  const handleAdd = () => {
    setEditingDepartment(null);
    form.resetFields();
    form.setFieldsValue({
      isActive: true,
    });
    setIsModalVisible(true);
  };

  // 部署編集
  const handleEdit = (department: DepartmentUIRecord) => {
    setEditingDepartment(department);
    form.setFieldsValue(department);
    setIsModalVisible(true);
  };

  // 一括アクティブ化
  const handleActivate = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('departmentManagement.messages.activateSelectRequired'));
      return;
    }

    modal.confirm({
      title: t('departmentManagement.messages.activateConfirmTitle'),
      content: t('departmentManagement.messages.activateConfirmContent').replace('{count}', String(selectedRowKeys.length)),
      okText: t('departmentManagement.status.active'),
      cancelText: t('departmentManagement.buttons.cancel'),
      onOk: async () => {
        try {
          await batchUpdateMasterStatus(selectedRowKeys.map(String), true);
          await fetchDepartments();
          setSelectedRowKeys([]);
          message.success(t('departmentManagement.messages.activateSuccess').replace('{count}', String(selectedRowKeys.length)));
        } catch (error) {
          console.error('一括アクティブ化エラー:', error);
          message.error(extractErrorMessage(error, t('departmentManagement.messages.activateError')));
        }
      },
    });
  };

  // 一括非アクティブ化
  const handleDeactivate = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('departmentManagement.messages.deactivateSelectRequired'));
      return;
    }

    modal.confirm({
      title: t('departmentManagement.messages.deactivateConfirmTitle'),
      content: t('departmentManagement.messages.deactivateConfirmContent').replace('{count}', String(selectedRowKeys.length)),
      okText: t('departmentManagement.status.inactive'),
      cancelText: t('departmentManagement.buttons.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await batchUpdateMasterStatus(selectedRowKeys.map(String), false);
          await fetchDepartments();
          setSelectedRowKeys([]);
          message.success(t('departmentManagement.messages.deactivateSuccess').replace('{count}', String(selectedRowKeys.length)));
        } catch (error) {
          console.error('エラー:', error);
          message.error(extractErrorMessage(error, t('departmentManagement.messages.deactivateError')));
        }
      },
    });
  };

  // 個別のアクティブ/非アクティブ切り替え
  const handleToggleActive = async (record: DepartmentUIRecord) => {
    const deptRecord = record as DepartmentUIRecord;
    const departmentName = deptRecord.displayName || 'この部署';
    const currentStatus = record.isActive !== false;
    const actionText = currentStatus ? t('departmentManagement.status.inactive') : t('departmentManagement.status.active');
    const newStatus = !currentStatus;

    modal.confirm({
      title: t('departmentManagement.messages.toggleConfirmTitle').replace('{name}', departmentName).replace('{action}', actionText),
      content: t('departmentManagement.messages.toggleConfirmContent').replace('{action}', actionText),
      okText: actionText,
      cancelText: t('departmentManagement.buttons.cancel'),
      okButtonProps: actionText === t('departmentManagement.status.inactive') ? { danger: true } : undefined,
      onOk: async () => {
        try {
          await updateMasterStatus(deptRecord.departmentId, newStatus);
          await fetchDepartments();
          message.success(t('departmentManagement.messages.toggleSuccess').replace('{name}', departmentName).replace('{action}', actionText));
        } catch (error) {
          console.error('エラー:', error);
          message.error(extractErrorMessage(error, t('departmentManagement.messages.toggleError')));
        }
      },
    });
  };

  // リロード
  const handleReload = () => {
    fetchDepartments();
    message.success(t('departmentManagement.messages.reloadSuccess'));
  };

  // CSVアップロード
  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        handleCSVUpload(file);
      }
    };
    input.click();
  };

  // CSVファイルをAPIにアップロード
  const handleCSVUpload = async (file: File) => {
    try {
      setLoading(true);
      await uploadCsv(file);
      message.success(t('departmentManagement.messages.csvUploadSuccess'));
      await fetchDepartments();
    } catch (error) {
      console.error('CSV upload error:', error);
      message.error(extractErrorMessage(error, t('departmentManagement.messages.csvUploadError')));
    } finally {
      setLoading(false);
    }
  };

  // CSVダウンロード
  const handleDownload = async () => {
    try {
      setLoading(true);
      await downloadCsv({
        search: searchText,
      });
      message.success(t('departmentManagement.messages.csvDownloadSuccess'));
    } catch (error) {
      console.error('CSV download error:', error);
      message.error(extractErrorMessage(error, t('departmentManagement.messages.csvDownloadError')));
    } finally {
      setLoading(false);
    }
  };

  // モーダルOK
  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingDepartment) {
        // 編集の場合
        const editingRecord = editingDepartment as DepartmentUIRecord;
        await updateMaster(editingRecord.departmentId, {
          ...(editingRecord as unknown as MasterRecord),
          department_name: values.displayName,
          is_active: values.isActive,
        } as MasterRecord);
        await fetchDepartments();
        message.success(t('departmentManagement.messages.saveSuccess'));
      } else {
        // 新規追加の場合
        await createMaster({
          department_cd: values.departmentId,
          department_name: values.displayName,
          is_active: values.isActive !== undefined ? values.isActive : true,
        } as unknown as MasterRecord);
        await fetchDepartments();
        message.success(t('departmentManagement.messages.addSuccess'));
      }

      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      // form.validateFields() によるバリデーションエラーはフォームに表示済みのため何もしない
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      console.error('エラー:', error);
      // 409（重複エラー）の場合はフォームフィールドにエラーを表示
      const axiosError = error as { response?: { status?: number } };
      if (axiosError?.response?.status === 409) {
        const dupMsg = t('departmentManagement.messages.duplicateIdError');
        form.setFields([{ name: 'departmentId', errors: [dupMsg] }]);
        message.error(dupMsg);
        return;
      }
      message.error(extractErrorMessage(error, t('departmentManagement.messages.saveError')));
    }
  };

  // モーダルキャンセル
  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  return (
    <div style={{ padding: 0 }}>
      {/* 操作ボタン */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          marginBottom: 16,
          gap: 16,
        }}
      >
        <Flex gap="small">
  <Button icon={<UploadOutlined />} onClick={handleUpload} disabled={isReadOnly}>
            {t('departmentManagement.buttons.csvUpload')}
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleDownload}>
            {t('departmentManagement.buttons.csvDownload')}
          </Button>
          <Button icon={<PlusOutlined />} onClick={handleAdd} disabled={isReadOnly}>
            {t('departmentManagement.buttons.add')}
          </Button>
          <Button
            icon={<DeleteOutlined />}
            onClick={handleActivate}
            disabled={isReadOnly || selectedRowKeys.length === 0}
            style={{
              minWidth: 85,
              backgroundColor: !isReadOnly && selectedRowKeys.length > 0 ? token.colorSuccess : undefined,
              borderColor: !isReadOnly && selectedRowKeys.length > 0 ? token.colorSuccess : undefined,
              color: !isReadOnly && selectedRowKeys.length > 0 ? token.colorWhite : undefined,
            }}
          >
            {t('departmentManagement.buttons.activate')}
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={handleDeactivate}
            disabled={isReadOnly || selectedRowKeys.length === 0}
            style={{
              minWidth: 85,
              backgroundColor: !isReadOnly && selectedRowKeys.length > 0 ? token.colorWarning : undefined,
              borderColor: !isReadOnly && selectedRowKeys.length > 0 ? token.colorWarning : undefined,
              color: !isReadOnly && selectedRowKeys.length > 0 ? token.colorWhite : undefined,
            }}
          >
            {t('departmentManagement.buttons.deactivate')}
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReload}>
            {t('departmentManagement.buttons.reload')}
          </Button>
        </Flex>
      </div>

      {/* 部署一覧セクション */}
      <div
        style={{
          padding: 0,
          backgroundColor: token.colorBgContainer,
          maxWidth: 3600,
          margin: '0 auto',
        }}
      >
        <Row gutter={16} style={{ marginBottom: 8 }}>
          <Col style={{ width: 400 }}>
            <Input
            placeholder={t('departmentManagement.searchPlaceholder')}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
        </Row>

        <Table
          loading={loading}
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredDepartments}
          rowKey="departmentId"
          size="small"
          scroll={{ x: 800 }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100'],
            showTotal: (total) => t('departmentManagement.pagination.showTotal').replace('{total}', String(total)),
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
            onShowSizeChange: (_, size) => {
              setCurrentPage(1);
              setPageSize(size);
            },
          }}
          rowClassName={(record) =>
            record.isActive === false ? 'active-row' : 'inactive-row'
          }
        />
      </div>

      {/* 部署追加/編集モーダル */}
      <Modal
        title={editingDepartment ? t('departmentManagement.modal.editTitle') : t('departmentManagement.modal.addTitle')}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        okText={t('departmentManagement.buttons.save')}
        cancelText={t('departmentManagement.buttons.cancel')}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="departmentId"
            label={t('departmentManagement.form.departmentCd')}
            rules={[{ required: !editingDepartment, message: t('departmentManagement.form.departmentCdRequired') }]}
          >
            <Input disabled={!!editingDepartment} placeholder={t('departmentManagement.form.departmentCdPlaceholder')} />
          </Form.Item>

          <Form.Item
            name="displayName"
            label={t('departmentManagement.form.departmentName')}
            rules={[{ required: true, message: t('departmentManagement.form.departmentNameRequired') }]}
          >
            <Input placeholder={t('departmentManagement.form.departmentNamePlaceholder')} />
          </Form.Item>

          <Form.Item name="isActive" label={t('departmentManagement.form.status')}>
            <Select
              options={[
                { value: true, label: t('departmentManagement.status.active') },
                { value: false, label: t('departmentManagement.status.inactive') },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <style jsx global>{`
        .ant-form-item-has-error .ant-input {
          background-color: #ffcccc !important;
        }
        .ant-form-item-has-error .ant-input:focus {
          background-color: #ffcccc !important;
        }

        .active-row td {
          background-color: #d3d3d3 !important;
        }
        .active-row:hover td {
          background-color: #c0c0c0 !important;
        }
        .inactive-row td {
          background-color: #fff !important;
        }
        .inactive-row:hover td {
          background-color: #f5f5f5 !important;
        }
      `}</style>
    </div>
  );
}