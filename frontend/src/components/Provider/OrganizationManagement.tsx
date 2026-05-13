'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Table,
  Button,
  Input,
  InputNumber,
  Space,
  Modal,
  Form,
  Select,
  Typography,
  Row,
  Col,
  Badge,
  App,
  Divider,
  theme,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  ReloadOutlined,
  UploadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { createApiClient } from '@/utils/authUtils';
import { formatDateTime } from '@/utils/formatUtils';
import { getSystemConfig } from '@/services/systemConfigApiService';
import { getMenuPermission } from '@/utils/menuPermissions';
import { useLanguage } from '@/contexts/LanguageContext';
import { extractErrorMessage } from '@/utils/errorUtils';

const { Text } = Typography;
const { useToken } = theme;

interface OrganizationData {
  organizationId: string;
  organizationCd: string;
  organizationDisplayName: string;
  organizationEmail: string;
  chiefUserId: string;
  chiefUserName: string;
  corporationName: string;
  isEntry: number;
  useDeemedProgress: boolean;
  isActive: boolean;
  contractCapacity: number | null;
  contractedUsers: number | null;
  contractedProjects: number | null;
  defaultRetentionDays: number;
  updatedAt: string;
}

interface CorporationData {
  corporationId: string;
  corporationName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface OptionType {
  label: string;
  value: string;
}

export default function OrganizationManagement() {
  const { modal, message: messageApi } = App.useApp();
  const { token } = useToken();
  const { t } = useLanguage();

  const isReadOnly = getMenuPermission('provider') === 0;

  const [organizations, setOrganizations] = useState<OrganizationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrganizationData | null>(null);
  const [selectedOrganizationDisplayName, setSelectedOrganizationDisplayName] = useState<string>('');
  const [selectedCompanyCode, setSelectedCompanyCode] = useState<string>('');
  const [selectedIsEntry, setSelectedIsEntry] = useState<string>('');
  const [selectedUseDeemedProgress, setSelectedUseDeemedProgress] = useState<string>('');
  const [form] = Form.useForm();
  const [companyOptions, setCompanyOptions] = useState<OptionType[]>([]);
  const [systemAdminOptions, setSystemAdminOptions] = useState<OptionType[]>([]);
  const [isDuplicateChecking, setIsDuplicateChecking] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [organizationCdValue, setOrganizationCdValue] = useState('');
  const [defaultRetentionDaysDefault, setDefaultRetentionDaysDefault] = useState<number>(30);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    fetchOrganizations();
    fetchSystemConfig();
  }, []);

  const fetchSystemConfig = async () => {
    try {
      const config = await getSystemConfig(['defaultRetentionDays']);
      if (config.defaultRetentionDays != null) {
        setDefaultRetentionDaysDefault(config.defaultRetentionDays as number);
      }
    } catch (error) {
      console.error('system-config取得エラー:', error);
      // フォールバック: デフォルト30を維持
    }
  };

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const client = createApiClient();
      const response = await client.get('/provider/organization');
      if (response.data.success && Array.isArray(response.data.data)) {
        setOrganizations(response.data.data);
      } else {
        messageApi.error(t('organizationManagement.messages.invalidDataFormat'));
        setOrganizations([]);
      }
    } catch (error) {
      console.error('Organization取得エラー:', error);
      messageApi.error(extractErrorMessage(error, t('organizationManagement.messages.fetchError')));
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  const organizationDisplayNames = useMemo(() => {
    const uniqueNames = Array.from(new Set(organizations.map(o => o.organizationDisplayName).filter(name => name)));
    return uniqueNames.sort();
  }, [organizations]);

  const companyNames = useMemo(() => {
    const uniqueNames = Array.from(new Set(organizations.map(o => o.corporationName).filter(name => name)));
    return uniqueNames.sort();
  }, [organizations]);

  const filteredOrganizations = useMemo(() => {
    return organizations.filter(org => {
      const searchLower = searchText.toLowerCase();
      const matchesSearch = !searchText.trim() || (
        org.organizationCd.toLowerCase().includes(searchLower) ||
        org.organizationEmail.toLowerCase().includes(searchLower) ||
        org.chiefUserName.toLowerCase().includes(searchLower) ||
        formatDateTime(org.updatedAt).toLowerCase().includes(searchLower)
      );
      const matchesOrganizationDisplayName = !selectedOrganizationDisplayName || org.organizationDisplayName === selectedOrganizationDisplayName;
      const matchesCompanyName = !selectedCompanyCode || org.corporationName === selectedCompanyCode;
      const matchesIsEntry = selectedIsEntry === '' || org.isEntry === Number(selectedIsEntry);
      const matchesUseDeemedProgress = selectedUseDeemedProgress === '' || org.useDeemedProgress === (selectedUseDeemedProgress === 'true');
      return matchesSearch && matchesOrganizationDisplayName && matchesCompanyName && matchesIsEntry && matchesUseDeemedProgress;
    });
  }, [organizations, searchText, selectedOrganizationDisplayName, selectedCompanyCode, selectedIsEntry, selectedUseDeemedProgress]);

  // フィルタ変化時に1ページ目にリセット
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, selectedOrganizationDisplayName, selectedCompanyCode, selectedIsEntry, selectedUseDeemedProgress]);

  const activeOrganizationCount = useMemo(() => {
    return filteredOrganizations.filter(org => org.isActive).length;
  }, [filteredOrganizations]);

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  const columns: ColumnsType<OrganizationData> = [
    {
      title: (
        <div style={{ textAlign: 'center' }}>
          <Space size="middle" align="center">
            <span>{t('organizationManagement.columns.organizationCd')}</span>
            <Badge
              count={activeOrganizationCount}
              style={{
                backgroundColor: '#4169E1',
                fontSize: 14,
                height: 24,
                minWidth: 40,
                lineHeight: '24px',
                borderRadius: 12,
              }}
            />
          </Space>
        </div>
      ),
      dataIndex: 'organizationCd',
      key: 'organizationCd',
      width: 180,
      sorter: (a, b) => a.organizationCd.localeCompare(b.organizationCd),
      render: (text: string, record) => (
        <Text style={{ fontWeight: 500, color: !record.isActive ? 'rgba(0, 0, 0, 0.45)' : '#0093CF' }}>
          {text}
        </Text>
      ),
    },
    {
      title: <div style={{ textAlign: 'center' }}>{t('organizationManagement.columns.organizationDisplayName')}</div>,
      dataIndex: 'organizationDisplayName',
      key: 'organizationDisplayName',
      width: 150,
      sorter: (a, b) => a.organizationDisplayName.localeCompare(b.organizationDisplayName),
      render: (text: string, record) => (
        <Text style={{ fontSize: 13, color: !record.isActive ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.85)' }}>
          {text}
        </Text>
      ),
    },
    {
      title: <div style={{ textAlign: 'center' }}>{t('organizationManagement.columns.organizationEmail')}</div>,
      dataIndex: 'organizationEmail',
      key: 'organizationEmail',
      width: 250,
      sorter: (a, b) => a.organizationEmail.localeCompare(b.organizationEmail),
      render: (text: string, record) => (
        <Text style={{ fontSize: 13, color: !record.isActive ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.85)' }}>
          {text}
        </Text>
      ),
    },
    {
      title: <div style={{ textAlign: 'center' }}>{t('organizationManagement.columns.chiefUserName')}</div>,
      dataIndex: 'chiefUserName',
      key: 'chiefUserName',
      width: 164,
      sorter: (a, b) => a.chiefUserName.localeCompare(b.chiefUserName),
      render: (text: string, record) => (
        <Text style={{ fontSize: 13, color: !record.isActive ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.85)' }}>
          {text}
        </Text>
      ),
    },
    {
      title: <div style={{ textAlign: 'center' }}>{t('organizationManagement.columns.corporationName')}</div>,
      dataIndex: 'corporationName',
      key: 'corporationName',
      width: 250,
      align: 'left',
      sorter: (a, b) => a.corporationName.localeCompare(b.corporationName),
      render: (text: string, record) => (
        <Text style={{ fontSize: 13, color: !record.isActive ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.85)' }}>
          {text}
        </Text>
      ),
    },
    {
      title: <div style={{ textAlign: 'center' }}>{t('organizationManagement.columns.twoFactorAuth')}</div>,
      dataIndex: 'isEntry',
      key: 'isEntry',
      width: 140,
      align: 'center',
      sorter: (a, b) => a.isEntry - b.isEntry,
      render: (value: number, record) => (
        <Text style={{ fontSize: 13, color: !record.isActive ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.85)' }}>
          {value === 1 ? t('organizationManagement.yesNo.yes') : t('organizationManagement.yesNo.no')}
        </Text>
      ),
    },
    {
      title: <div style={{ textAlign: 'center' }}>{t('organizationManagement.columns.useDeemedProgress')}</div>,
      dataIndex: 'useDeemedProgress',
      key: 'useDeemedProgress',
      width: 174,
      align: 'center',
      sorter: (a, b) => Number(a.useDeemedProgress) - Number(b.useDeemedProgress),
      render: (value: boolean, record) => (
        <Text style={{ fontSize: 13, color: !record.isActive ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.85)' }}>
          {value ? t('organizationManagement.yesNo.yes') : t('organizationManagement.yesNo.no')}
        </Text>
      ),
    },
    {
      title: <div style={{ textAlign: 'center' }}>{t('organizationManagement.columns.updatedAt')}</div>,
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 160,
      align: 'right',
      sorter: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
      render: (text: string) => formatDateTime(text),
    },
    {
      title: '',
      key: 'action',
      width: 330,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleDownloadCertificate(record)}
            disabled={isReadOnly || !record.isActive}
          >
            {t('organizationManagement.buttons.certDownload')}
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            disabled={isReadOnly}
          >
            {t('organizationManagement.buttons.edit')}
          </Button>
          <Button
            size="small"
            onClick={() => handleToggleActive(record)}
            danger={record.isActive}
            style={{ width: '100px' }}
            disabled={isReadOnly}
          >
            {!record.isActive ? t('organizationManagement.status.active') : t('organizationManagement.status.inactive')}
          </Button>
        </Space>
      ),
    },
  ];

  const handleDownloadCertificate = async (org: OrganizationData) => {
    try {
      const client = createApiClient();
      const response = await client.get(
        `/provider/organization/${org.organizationId}/certificate`,
        { responseType: 'blob' }
      );
      const blob = new Blob([response.data], { type: 'application/x-pkcs12' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${org.organizationCd}_certificate.p12`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      messageApi.success(t('organizationManagement.messages.certDownloadSuccess').replace('{cd}', org.organizationCd));
    } catch (error) {
      console.error('証明書ダウンロードエラー:', error);
      messageApi.error(extractErrorMessage(error, t('organizationManagement.messages.certDownloadError')));
    }
  };

  useEffect(() => {
    if (editingOrg || !organizationCdValue || organizationCdValue.length === 0) {
      setIsDuplicate(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsDuplicateChecking(true);
      try {
        const client = createApiClient();
        const response = await client.get(`/provider/organization/check-cd/${organizationCdValue}`);
        if (response.data.exists) {
          setIsDuplicate(true);
          form.setFields([{ name: 'organizationCd', errors: [t('organizationManagement.form.organizationCdDuplicate')] }]);
        } else {
          setIsDuplicate(false);
          form.setFields([{ name: 'organizationCd', errors: [] }]);
        }
      } catch (_error) {
        setIsDuplicate(false);
      } finally {
        setIsDuplicateChecking(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [organizationCdValue, form, editingOrg]);

  const handleAdd = () => {
    setEditingOrg(null);
    setIsDuplicate(false);
    setOrganizationCdValue('');
    form.resetFields();
    form.setFieldsValue({
      organizationCd: '',
      organizationDisplayName: '',
      organizationEmail: '',
      corporationId: undefined,
      isEntry: 0,
      useDeemedProgress: false,
      isActive: true,
      chiefUserName: '',
      chiefUserEmail: '',
      defaultRetentionDays: defaultRetentionDaysDefault,
    });
    setIsModalVisible(true);
  };

  const fetchSystemAdmins = async (organizationId: string) => {
    try {
      const client = createApiClient();
      const response = await client.get(`/provider/organization/${organizationId}/system-admins`);
      if (response.data.success && Array.isArray(response.data.data)) {
        const options = response.data.data.map((user: { userName: string; userId: string }) => ({
          label: user.userName,
          value: user.userId,
        }));
        setSystemAdminOptions(options);
      }
    } catch (error) {
      console.error('システム管理者取得エラー:', error);
      messageApi.error(extractErrorMessage(error, t('organizationManagement.messages.systemAdminFetchError')));
      setSystemAdminOptions([]);
    }
  };

  const handleEdit = async (org: OrganizationData) => {
    setEditingOrg(org);
    await fetchSystemAdmins(org.organizationId);
    const corporationId = companyOptions.find(option => option.label === org.corporationName)?.value || undefined;
    form.setFieldsValue({ ...org, corporationId, chiefUserId: org.chiefUserId });
    setIsModalVisible(true);
  };

  const handleActivate = () => {
    if (selectedRowKeys.length === 0) {
      messageApi.warning(t('organizationManagement.messages.activateSelectRequired'));
      return;
    }
    modal.confirm({
      title: t('organizationManagement.messages.activateConfirmTitle'),
      content: t('organizationManagement.messages.activateConfirmContent').replace('{count}', String(selectedRowKeys.length)),
      okText: t('organizationManagement.status.active'),
      cancelText: t('organizationManagement.buttons.cancel'),
      onOk: async () => {
        try {
          const client = createApiClient();
          for (const key of selectedRowKeys) {
            await client.patch(`/provider/organization/${key}/status`, { isActive: true });
          }
          messageApi.success(t('organizationManagement.messages.activateSuccess').replace('{count}', String(selectedRowKeys.length)));
          setSelectedRowKeys([]);
          await fetchOrganizations();
        } catch (error) {
          console.error('アクティブ化エラー:', error);
          messageApi.error(extractErrorMessage(error, t('organizationManagement.messages.activateError')));
        }
      },
    });
  };

  const handleDeactivate = () => {
    if (selectedRowKeys.length === 0) {
      messageApi.warning(t('organizationManagement.messages.deactivateSelectRequired'));
      return;
    }
    modal.confirm({
      title: t('organizationManagement.messages.deactivateConfirmTitle'),
      content: t('organizationManagement.messages.deactivateConfirmContent').replace('{count}', String(selectedRowKeys.length)),
      okText: t('organizationManagement.status.inactive'),
      cancelText: t('organizationManagement.buttons.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const client = createApiClient();
          for (const key of selectedRowKeys) {
            await client.patch(`/provider/organization/${key}/status`, { isActive: false });
          }
          messageApi.success(t('organizationManagement.messages.deactivateSuccess').replace('{count}', String(selectedRowKeys.length)));
          setSelectedRowKeys([]);
          await fetchOrganizations();
        } catch (error) {
          console.error('非アクティブ化エラー:', error);
          messageApi.error(extractErrorMessage(error, t('organizationManagement.messages.deactivateError')));
        }
      },
    });
  };

  const handleToggleActive = (org: OrganizationData) => {
    const actionText = org.isActive ? t('organizationManagement.status.inactive') : t('organizationManagement.status.active');
    const organizationCd = org.organizationCd;
    modal.confirm({
      title: t('organizationManagement.messages.toggleConfirmTitle').replace('{cd}', organizationCd).replace('{action}', actionText),
      content: t('organizationManagement.messages.toggleConfirmContent').replace('{action}', actionText),
      okText: actionText,
      cancelText: t('organizationManagement.buttons.cancel'),
      okButtonProps: org.isActive ? { danger: true } : undefined,
      onOk: async () => {
        try {
          const client = createApiClient();
          await client.patch(`/provider/organization/${org.organizationId}/status`, { isActive: !org.isActive });
          messageApi.success(t('organizationManagement.messages.toggleSuccess').replace('{cd}', organizationCd).replace('{action}', actionText));
          await fetchOrganizations();
        } catch (error) {
          console.error('ステータス変更エラー:', error);
          messageApi.error(extractErrorMessage(error, t('organizationManagement.messages.toggleError')));
        }
      },
    });
  };

  const handleReload = async () => {
    setSearchText('');
    setSelectedRowKeys([]);
    setSelectedOrganizationDisplayName('');
    setSelectedCompanyCode('');
    setSelectedIsEntry('');
    setSelectedUseDeemedProgress('');
    await fetchOrganizations();
    messageApi.success(t('organizationManagement.messages.reloadSuccess'));
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleCSVUpload(file);
    event.target.value = '';
  };

  const handleCSVUpload = async (file: File) => {
    try {
      setLoading(true);
      const client = createApiClient();
      const formData = new FormData();
      formData.append('file', file);
      const response = await client.post('/provider/organization/upload-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (response.data.success && response.data.data) {
        const result = response.data.data;
        if (result.failureCount > 0 && result.errors.length > 0) {
          console.error('CSV validation error:', result.errors[0].message);
          messageApi.error(t('organizationManagement.messages.csvUploadError'));
          return;
        }
        messageApi.success(t('organizationManagement.messages.csvUploadSuccess'));
      }
      await fetchOrganizations();
    } catch (error) {
      if (error instanceof Error && !('isAxiosError' in error)) {
        messageApi.error(extractErrorMessage(error, t('organizationManagement.messages.csvUploadError')));
        return;
      }
      messageApi.error(extractErrorMessage(error, t('organizationManagement.messages.csvUploadError')));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    try {
      const csvData = filteredOrganizations.map((o) => ({
        'organization_cd': o.organizationCd,
        'organization_display_name': o.organizationDisplayName,
        'organization_email': o.organizationEmail,
        'chief_user_name': o.chiefUserName,
        'chief_user_email': o.chiefUserId,
        'corporation_name': o.corporationName,
        'contract_capacity': o.contractCapacity ?? '',
        'contract_users': o.contractedUsers ?? '',
        'contract_projects': o.contractedProjects ?? '',
        'is_entry': o.isEntry,
        'use_deemed_progress': o.useDeemedProgress,
        'update_at': o.updatedAt,
        'is_active': o.isActive,
      }));
      const headers = Object.keys(csvData[0] ?? {});
      const rows = csvData.map(row =>
        headers.map(h => {
          const val = String((row as Record<string, unknown>)[h] ?? '');
          return val.includes(',') || val.includes('"') || val.includes('\n')
            ? `"${val.replace(/"/g, '""')}"` : val;
        }).join(',')
      );
      const csvString = [headers.join(','), ...rows].join('\r\n');
      const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '').slice(0, 14);
      link.href = url;
      link.download = `organizations_${timestamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      messageApi.success(t('organizationManagement.messages.csvDownloadSuccess'));
    } catch (error) {
      console.error('CSV download error:', error);
      messageApi.error(extractErrorMessage(error, t('organizationManagement.messages.csvDownloadError')));
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();

      // 組織CD重複チェック中 or 重複確定の場合は送信しない
      if (!editingOrg && (isDuplicateChecking || isDuplicate)) {
        return;
      }

      const client = createApiClient();
      if (editingOrg) {
        const { chiefUserEmail, ...saveData } = values;
        await client.put(`/provider/organization/${editingOrg.organizationId}`, saveData);
        messageApi.success(t('organizationManagement.messages.saveSuccess'));
      } else {
        const organizationId = uuidv4();
        await client.post('/provider/organization', { organizationId, ...values });
        messageApi.success(t('organizationManagement.messages.addSuccess'));
      }
      setIsModalVisible(false);
      setOrganizationCdValue('');
      form.resetFields();
      await fetchOrganizations();
    } catch (error) {
      // form.validateFields() によるバリデーションエラーはフォームに表示済みのため何もしない
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      console.error('保存エラー:', error);
      // 409 DUPLICATE_ORGANIZATION_CD の場合のみフォームフィールドにエラーを表示
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: { error?: { code?: string } } } };
        if (axiosError.response?.status === 409) {
          const code = axiosError.response?.data?.error?.code;
          if (code === 'DUPLICATE_ORGANIZATION_CD') {
            form.setFields([{ name: 'organizationCd', errors: [t('organizationManagement.form.organizationCdDuplicate')] }]);
            setIsDuplicate(true);
            return;
          }
        }
      }
      // その他エラーは extractErrorMessage で統一
      messageApi.error(extractErrorMessage(error, t('organizationManagement.messages.saveError')));
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setIsDuplicate(false);
    form.resetFields();
  };

  useEffect(() => {
    const fetchCorporations = async () => {
      try {
        const client = createApiClient();
        const response = await client.get('/provider/corporation');
        if (response.data.success && Array.isArray(response.data.data)) {
          const options = response.data.data
            .filter((corp: CorporationData) => corp.isActive)
            .map((corp: CorporationData) => ({
              label: corp.corporationName,
              value: corp.corporationId,
            }));
          setCompanyOptions(options);
        } else {
          messageApi.error(t('organizationManagement.messages.corporationInvalidFormat'));
        }
      } catch (error) {
        console.error('会社名の取得に失敗:', error);
        messageApi.error(extractErrorMessage(error, t('organizationManagement.messages.corporationFetchError')));
      }
    };
    fetchCorporations();
  }, [messageApi]);

  return (
    <div style={{ padding: '0 15px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16, gap: 8 }}>
        <label htmlFor="csv-upload">
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleUpload}
          />
          <Button
            icon={<UploadOutlined />}
            onClick={() => document.getElementById('csv-upload')?.click()}
            disabled={isReadOnly}
          >
            {t('organizationManagement.buttons.csvUpload')}
          </Button>
        </label>
        <Button icon={<DownloadOutlined />} onClick={handleDownload}>
          {t('organizationManagement.buttons.csvDownload')}
        </Button>
        <Button icon={<PlusOutlined />} onClick={handleAdd} disabled={isReadOnly}>
          {t('organizationManagement.buttons.add')}
        </Button>
        <Button
          onClick={handleActivate}
          disabled={isReadOnly || selectedRowKeys.length === 0}
          style={{
            minWidth: 85,
            backgroundColor: !isReadOnly && selectedRowKeys.length > 0 ? '#4CAF50' : undefined,
            borderColor: !isReadOnly && selectedRowKeys.length > 0 ? '#4CAF50' : undefined,
            color: !isReadOnly && selectedRowKeys.length > 0 ? '#fff' : undefined,
          }}
        >
          {t('organizationManagement.buttons.activate')}
        </Button>
        <Button
          danger
          onClick={handleDeactivate}
          disabled={isReadOnly || selectedRowKeys.length === 0}
          style={{
            minWidth: 85,
            backgroundColor: !isReadOnly && selectedRowKeys.length > 0 ? '#FFA500' : undefined,
            borderColor: !isReadOnly && selectedRowKeys.length > 0 ? '#FFA500' : undefined,
            color: !isReadOnly && selectedRowKeys.length > 0 ? '#fff' : undefined,
          }}
        >
          {t('organizationManagement.buttons.deactivate')}
        </Button>
        <Button icon={<ReloadOutlined />} onClick={handleReload}>
          {t('organizationManagement.buttons.reload')}
        </Button>
      </div>

      <div style={{ padding: 0, backgroundColor: '#fff', maxWidth: 3600, margin: '0 auto' }}>
        <Row gutter={16} style={{ marginBottom: 8 }}>
          <Col style={{ width: 400 }}>
            <Input
              placeholder={t('organizationManagement.searchPlaceholder')}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col style={{ width: 150 }}>
            <Select
              placeholder={t('organizationManagement.filters.organizationDisplayName')}
              value={selectedOrganizationDisplayName || undefined}
              onChange={(value) => setSelectedOrganizationDisplayName(value || '')}
              allowClear
              style={{ width: '100%' }}
              options={organizationDisplayNames.map(name => ({ label: name, value: name }))}
            />
          </Col>
          <Col style={{ width: 150 }}>
            <Select
              placeholder={t('organizationManagement.filters.corporationName')}
              value={selectedCompanyCode || undefined}
              onChange={(value) => setSelectedCompanyCode(value || '')}
              allowClear
              style={{ width: '100%' }}
              options={companyNames.map(name => ({ label: name, value: name }))}
            />
          </Col>
          <Col style={{ width: 150 }}>
            <Select
              placeholder={t('organizationManagement.filters.twoFactorAuth')}
              value={selectedIsEntry || undefined}
              onChange={(value) => setSelectedIsEntry(value ?? '')}
              allowClear
              style={{ width: '100%' }}
              options={[
                { label: t('organizationManagement.yesNo.no'), value: '0' },
                { label: t('organizationManagement.yesNo.yes'), value: '1' },
              ]}
            />
          </Col>
          <Col style={{ width: 174 }}>
            <Select
              placeholder={t('organizationManagement.filters.useDeemedProgress')}
              value={selectedUseDeemedProgress || undefined}
              onChange={(value) => setSelectedUseDeemedProgress(value ?? '')}
              allowClear
              style={{ width: '100%' }}
              options={[
                { label: t('organizationManagement.yesNo.yes'), value: 'true' },
                { label: t('organizationManagement.yesNo.no'), value: 'false' },
              ]}
            />
          </Col>
        </Row>

        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredOrganizations}
          rowKey="organizationId"
          size="small"
          loading={loading}
          scroll={{ x: 1540 }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100'],
            showTotal: (total) => t('organizationManagement.pagination.showTotal').replace('{total}', String(total)),
            onChange: (page, size) => { setCurrentPage(page); setPageSize(size); },
            onShowSizeChange: (_, newSize) => { setPageSize(newSize); setCurrentPage(1); },
          }}
          rowClassName={(record) => (!record.isActive ? 'inactive-row' : '')}
        />
      </div>

      <Modal
        title={editingOrg ? t('organizationManagement.modal.editTitle') : t('organizationManagement.modal.addTitle')}
        forceRender
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        okText={t('organizationManagement.buttons.save')}
        cancelText={t('organizationManagement.buttons.cancel')}
      >
        <Form form={form} layout="vertical">
          {editingOrg ? (
            <>
              <Form.Item
                name="organizationCd"
                label={t('organizationManagement.form.organizationCd')}
                rules={[{ required: true, message: t('organizationManagement.form.organizationCdRequired') }]}
              >
                <Input disabled />
              </Form.Item>
              <Form.Item
                name="organizationDisplayName"
                label={t('organizationManagement.form.organizationDisplayName')}
                rules={[
                  { required: true, message: t('organizationManagement.form.organizationDisplayNameRequired') },
                  { max: 50, message: t('organizationManagement.form.organizationDisplayNameMaxLength') },
                ]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="organizationEmail"
                label={t('organizationManagement.form.organizationEmail')}
                rules={[{ required: true, message: t('organizationManagement.form.organizationEmailRequired') }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="chiefUserId"
                label={t('organizationManagement.form.chiefUserId')}
                rules={[{ required: true, message: t('organizationManagement.form.chiefUserIdRequired') }]}
              >
                <Select
                  options={systemAdminOptions}
                  placeholder={t('organizationManagement.form.chiefUserIdPlaceholder')}
                  showSearch
                  filterOption={(input, option) => {
                    if (!option?.label) return false;
                    return option.label.toLowerCase().includes(input.toLowerCase());
                  }}
                />
              </Form.Item>
              <Form.Item name="corporationId" label={t('organizationManagement.form.corporationName')}>
                <Select
                  options={companyOptions}
                  placeholder={t('organizationManagement.form.corporationNamePlaceholder')}
                  showSearch
                  filterOption={(input, option) => {
                    if (!option?.label) return false;
                    return option.label.toLowerCase().includes(input.toLowerCase());
                  }}
                />
              </Form.Item>
              <Form.Item
                name="contractCapacity"
                label={t('organizationManagement.form.contractCapacity')}
                rules={[{ required: true, message: t('organizationManagement.form.contractCapacityRequired') }]}
              >
                <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder={t('organizationManagement.form.contractCapacityPlaceholder')} />
              </Form.Item>
              <Form.Item
                name="contractedUsers"
                label={t('organizationManagement.form.contractedUsers')}
                rules={[{ required: true, message: t('organizationManagement.form.contractedUsersRequired') }]}
              >
                <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder={t('organizationManagement.form.contractedUsersPlaceholder')} />
              </Form.Item>
              <Form.Item
                name="contractedProjects"
                label={t('organizationManagement.form.contractedProjects')}
                rules={[{ required: true, message: t('organizationManagement.form.contractedProjectsRequired') }]}
              >
                <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder={t('organizationManagement.form.contractedProjectsPlaceholder')} />
              </Form.Item>
              <Form.Item
                name="isEntry"
                label={t('organizationManagement.form.isEntry')}
                rules={[{ required: true, message: t('organizationManagement.form.isEntryRequired') }]}
              >
                <Select
                  options={[
                    { value: 0, label: t('organizationManagement.yesNo.no') },
                    { value: 1, label: t('organizationManagement.yesNo.yes') },
                  ]}
                />
              </Form.Item>
              <Form.Item
                name="useDeemedProgress"
                label={t('organizationManagement.form.useDeemedProgress')}
                rules={[{ required: true, message: t('organizationManagement.form.useDeemedProgressRequired') }]}
              >
                <Select
                  options={[
                    { value: true, label: t('organizationManagement.yesNo.yes') },
                    { value: false, label: t('organizationManagement.yesNo.no') },
                  ]}
                />
              </Form.Item>
              <Form.Item name="isActive" label={t('organizationManagement.form.status')} rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: true, label: t('organizationManagement.status.active') },
                    { value: false, label: t('organizationManagement.status.inactive') },
                  ]}
                />
              </Form.Item>
              <Form.Item
                name="defaultRetentionDays"
                label={t('organizationManagement.form.defaultRetentionDays')}
                rules={[
                  { required: true, message: t('organizationManagement.form.defaultRetentionDaysRequired') },
                  { type: 'integer', min: 1, message: t('organizationManagement.form.defaultRetentionDaysInvalid') },
                ]}
                extra={t('organizationManagement.form.defaultRetentionDaysHelp')}
              >
                <InputNumber min={1} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </>
          ) : (
            <>
              <Divider>{t('organizationManagement.form.organizationInfo')}</Divider>
              <Form.Item
                name="organizationCd"
                label={t('organizationManagement.form.organizationCd')}
                rules={[{ required: true, message: t('organizationManagement.form.organizationCdRequired') }]}
              >
                <Input onChange={(e) => setOrganizationCdValue(e.target.value)} />
              </Form.Item>
              <Form.Item
                name="organizationDisplayName"
                label={t('organizationManagement.form.organizationDisplayName')}
                rules={[{ required: true, message: t('organizationManagement.form.organizationDisplayNameRequired') }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="organizationEmail"
                label={t('organizationManagement.form.organizationEmail')}
                rules={[{ required: true, message: t('organizationManagement.form.organizationEmailRequired') }]}
              >
                <Input />
              </Form.Item>
              <Form.Item name="corporationId" label={t('organizationManagement.form.corporationName')}>
                <Select
                  options={companyOptions}
                  placeholder={t('organizationManagement.form.corporationNamePlaceholder')}
                  showSearch
                  filterOption={(input, option) => {
                    if (!option?.label) return false;
                    return option.label.toLowerCase().includes(input.toLowerCase());
                  }}
                />
              </Form.Item>
              <Form.Item
                name="contractCapacity"
                label={t('organizationManagement.form.contractCapacity')}
                rules={[{ required: true, message: t('organizationManagement.form.contractCapacityRequired') }]}
              >
                <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder={t('organizationManagement.form.contractCapacityPlaceholder')} />
              </Form.Item>
              <Form.Item
                name="contractedUsers"
                label={t('organizationManagement.form.contractedUsers')}
                rules={[{ required: true, message: t('organizationManagement.form.contractedUsersRequired') }]}
              >
                <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder={t('organizationManagement.form.contractedUsersPlaceholder')} />
              </Form.Item>
              <Form.Item
                name="contractedProjects"
                label={t('organizationManagement.form.contractedProjects')}
                rules={[{ required: true, message: t('organizationManagement.form.contractedProjectsRequired') }]}
              >
                <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder={t('organizationManagement.form.contractedProjectsPlaceholder')} />
              </Form.Item>
              <Form.Item
                name="isEntry"
                label={t('organizationManagement.form.isEntry')}
                rules={[{ required: true, message: t('organizationManagement.form.isEntryRequired') }]}
              >
                <Select
                  options={[
                    { value: 0, label: t('organizationManagement.yesNo.no') },
                    { value: 1, label: t('organizationManagement.yesNo.yes') },
                  ]}
                />
              </Form.Item>
              <Form.Item
                name="useDeemedProgress"
                label={t('organizationManagement.form.useDeemedProgress')}
                rules={[{ required: true, message: t('organizationManagement.form.useDeemedProgressRequired') }]}
              >
                <Select
                  options={[
                    { value: true, label: t('organizationManagement.yesNo.yes') },
                    { value: false, label: t('organizationManagement.yesNo.no') },
                  ]}
                />
              </Form.Item>
              <Form.Item name="isActive" label={t('organizationManagement.form.status')} rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: true, label: t('organizationManagement.status.active') },
                    { value: false, label: t('organizationManagement.status.inactive') },
                  ]}
                />
              </Form.Item>
              <Form.Item
                name="defaultRetentionDays"
                label={t('organizationManagement.form.defaultRetentionDays')}
                rules={[
                  { required: true, message: t('organizationManagement.form.defaultRetentionDaysRequired') },
                  { type: 'integer', min: 1, message: t('organizationManagement.form.defaultRetentionDaysInvalid') },
                ]}
                extra={t('organizationManagement.form.defaultRetentionDaysHelp')}
              >
                <InputNumber min={1} precision={0} style={{ width: '100%' }} />
              </Form.Item>
              <Divider>{t('organizationManagement.form.chiefInfo')}</Divider>
              <Form.Item
                name="chiefUserName"
                label={t('organizationManagement.form.chiefUserName')}
                rules={[{ required: true, message: t('organizationManagement.form.chiefUserNameRequired') }]}
              >
                <Input autoComplete="off" />
              </Form.Item>
              <Form.Item
                name="chiefUserEmail"
                label={t('organizationManagement.form.chiefUserEmail')}
                rules={[{ required: true, message: t('organizationManagement.form.chiefUserEmailRequired') }]}
              >
                <Input autoComplete="off" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      <style jsx global>{`
        .inactive-row td { background-color: #d3d3d3 !important; }
        .inactive-row:hover td { background-color: #c0c0c0 !important; }
      `}</style>
    </div>
  );
}
