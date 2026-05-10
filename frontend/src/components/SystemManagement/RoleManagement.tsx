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
  App,
  Typography,
  Row,
  Col,
  theme,
  Checkbox,
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
import Papa from 'papaparse';
import { formatDateTime } from '@/utils/dateFormatter';
import { getRoleConfig } from '@/types/roleTypes';
import { getMenuPermission } from '@/utils/menuPermissions';
import type { RoleConfig, FieldConfig } from '@/types/roleTypes';
import {
  fetchMasters,
  createMaster,
  updateMaster,
  updateMasterStatus,
  batchUpdateMasterStatus,
  uploadCsv,
  downloadCsv,
  createRole,
  updateRole,
  updateRolePermissions,
  type MasterRecord as ApiMasterRecord,
} from '@/services/roleApiService';
import FunctionPermissionDialog from './FunctionPermissionDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { extractErrorMessage } from '@/utils/errorUtils';

/** 機能未選択を表すセンチネル値 */
const NO_FUNCTION_SELECTED = '－';

const { Text } = Typography;

interface ItemCategory {
  headerName: string;
  searchFixed: boolean;
  isDisplay: boolean;
  addable: boolean;
  update: boolean;
}

interface MasterTypeData {
  masterId: string;
  role: string;
  relationData: string;
  displayName: string;
  itemCategories: Record<string, ItemCategory | undefined>;
  isActive: boolean;
}

type MasterRecord = Record<string, unknown>;

interface RoleApiResponse {
  roleId: string;
  roleName: string;
  functionName: string;
  functionWritePermissions: string;
  isActive: boolean;
  updatedAt: string;
}

export default function RoleManagementMock() {
  const { token } = theme.useToken();
  const { message, modal } = App.useApp();
  const { t } = useLanguage();

  const isReadOnly = getMenuPermission('system_admin') === 0;

  const [masters, setMasters] = useState<MasterRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRoleNameFilter, setSelectedRoleNameFilter] = useState<string>('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingMaster, setEditingMaster] = useState<MasterRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [form] = Form.useForm();

  const [isFunctionModalVisible, setIsFunctionModalVisible] = useState(false);
  const [editingFunctionMaster, setEditingFunctionMaster] = useState<MasterRecord | null>(null);
  const [functionDialogMode, setFunctionDialogMode] = useState<'direct' | 'temporary'>('temporary');

  const [tempFunctionData, setTempFunctionData] = useState<{
    functionName: string;
    apiFunctionNames: string;
    functionWritePermissions: string;
  } | null>(null);

  const fetchRoleMasters = async () => {
    try {
      setLoading(true);
      const data = await fetchMasters();
      const convertedData = data.map((item: ApiMasterRecord) => ({
        masterId: '4',
        role: item.roleId || item.role,
        roleName: item.roleName,
        functionName: item.functionName,
        initialScreenFunctionName: item.initialScreenFunctionName || null,
        functionWritePermissions: item.functionWritePermissions,
        functions: item.functions || [],
        functionIds: item.functionIds || [],
        writableFunctionIds: item.writableFunctionIds || [],
        isActive: item.isActive,
        updatedAt: item.updatedAt,
      }));
      setMasters(convertedData);
      setSearchText('');
      setSelectedRowKeys([]);
      console.log('Loaded from API:', convertedData.length, 'records');
    } catch (error) {
      console.error('API fetch error:', error);
      message.error(extractErrorMessage(error, t('roleManagement.messages.fetchError')));
      setMasters([]);
    } finally {
      setLoading(false);
    }
  };

  const selectedMasterInfo = useMemo(() => {
    const config = getRoleConfig();
    const itemCategories: Record<string, ItemCategory | undefined> = {};
    config.fields.forEach(field => {
      itemCategories[field.dbField] = {
        headerName: field.displayName,
        searchFixed: field.searchFixed,
        isDisplay: field.isDisplay,
        addable: field.addable,
        update: field.update,
      };
    });
    return {
      masterId: config.masterId,
      role: '',
      relationData: '',
      displayName: config.displayName,
      itemCategories,
      isActive: true,
    };
  }, []);

  useEffect(() => {
    if (!selectedMasterInfo) return;
    fetchRoleMasters();
  }, [selectedMasterInfo]);

  const fuzzySearchFields = useMemo(() => {
    return ['functionName'];
  }, []);

  // DBのロール名（日本語）→ roles.* 翻訳キーのマッピング
  const roleNameToKey: Record<string, string> = {
    'プロバイダー': 'roles.provider',
    'システム管理者': 'roles.system_admin',
    'データ管理者': 'roles.data_admin',
    '実験管理者': 'roles.experiment_admin',
    '実験作業者': 'roles.experiment_worker',
    'MI技術者': 'roles.mi_engineer',
  };

  // DB機能名（日本語）→ functionPermissionDialog.functions.* 翻訳キーのマッピング
  const functionNameToKey: Record<string, string> = {
    'プロバイダーメニュー':    'functionPermissionDialog.functions.010000',
    'システム管理者メニュー': 'functionPermissionDialog.functions.020000',
    'データ管理者メニュー':   'functionPermissionDialog.functions.030000',
    '実験管理者メニュー':     'functionPermissionDialog.functions.040000',
    '実験作業者メニュー':     'functionPermissionDialog.functions.050000',
  };

  const getRoleNameOptions = useMemo(() => {
    // ソート順はDBのロール名（日本語）で定義（言語非依存のインデックス参照用）
    const roleOrder = Object.keys(roleNameToKey);
    const uniqueRoleNames = Array.from(
      new Set(masters.map(m => m.roleName).filter(v => v !== null && v !== undefined && v !== ''))
    );
    return uniqueRoleNames
      .sort((a, b) => {
        const indexA = roleOrder.indexOf(String(a));
        const indexB = roleOrder.indexOf(String(b));
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return String(a).localeCompare(String(b), 'ja');
      })
      .map(v => {
        const key = roleNameToKey[String(v)];
        return {
          value: String(v),                           // DB照合用（日本語のまま）
          label: key ? t(key) : String(v),            // roles.* キーで翻訳
        };
      });
  }, [masters, t]);

  // フィルタ変化時に1ページ目にリセット
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, selectedRoleNameFilter]);

  const filteredMasters = useMemo(() => {
    if (!selectedMasterInfo) return [];
    const idField = Object.keys(selectedMasterInfo.itemCategories)[0];
    return masters.filter(master => {
      const idValue = master[idField];
      if (idValue === undefined || idValue === null || idValue === '') return false;
      const searchLower = searchText.toLowerCase();
      const matchesSearch = !searchText.trim() || fuzzySearchFields.some(fieldKey => {
        const value = master[fieldKey];
        return value && String(value).toLowerCase().includes(searchLower);
      });
      const matchesRoleNameFilter = !selectedRoleNameFilter || String(master.roleName) === selectedRoleNameFilter;
      return matchesSearch && matchesRoleNameFilter;
    });
  }, [masters, searchText, selectedRoleNameFilter, fuzzySearchFields, selectedMasterInfo]);

  const columns: ColumnsType<MasterRecord> = useMemo(() => {
    if (!selectedMasterInfo) return [];

    const dynamicColumns = Object.entries(selectedMasterInfo.itemCategories)
      .filter(([_, category]) => category && category.isDisplay)
      .map(([key, category], index) => {
        if (/function.*id/i.test(key)) return null;
        const align = 'left' as const;
        const isFunctionName = key === 'functionName';
        const isInitialScreenFunctionName = key === 'initialScreenFunctionName';
        const isRoleName = /role.*name/i.test(key);
        const columnWidth = isFunctionName ? 600 : isInitialScreenFunctionName ? 225 : (isRoleName ? 170 : 150);

        return {
          title: <div style={{ textAlign: 'center' }}>{t(category!.headerName)}</div>,
          dataIndex: key,
          key: key,
          width: columnWidth,
          align: align,
          sorter: (a: MasterRecord, b: MasterRecord) => {
            return String(a[key] || '').localeCompare(String(b[key] || ''));
          },
          render: (text: unknown, record: MasterRecord) => {
            if (key.includes('updated') || key.includes('Updated')) {
              return formatDateTime(String(text || ''));
            }
            if (index === 1) {
              return (
                <Text style={{
                  fontWeight: token.fontWeightStrong,
                  color: record.isActive === false ? token.colorTextDisabled : token.colorPrimary
                }}>
                  {String(text || '')}
                </Text>
              );
            }
            if (isInitialScreenFunctionName) {
              const key = functionNameToKey[String(text)];
              return key ? t(key) : String(text || '');
            }
            if (isFunctionName) {
              const functions = (record.functions as Array<{ name: string; icon: string; color: string }>) || [];
              const isActive = record.isActive !== false;
              return (
                <span
                  style={{
                    cursor: (isActive && !isReadOnly) ? 'pointer' : 'not-allowed',
                    textDecoration: (functions.length > 0 && isActive && !isReadOnly) ? 'underline' : 'none',
                    color: isActive ? undefined : token.colorTextDisabled,
                  }}
                  onClick={(isActive && !isReadOnly) ? () => handleOpenFunctionModalDirect(record) : undefined}
                >
                  {functions.length === 0 ? (
                    <span style={{ color: isActive ? token.colorTextSecondary : token.colorTextDisabled }}>{NO_FUNCTION_SELECTED}</span>
                  ) : (
                    functions.map((func, idx) => (
                      <React.Fragment key={idx}>
                        {idx > 0 && <span style={{ color: isActive ? token.colorText : token.colorTextDisabled }}> / </span>}
                        <span style={{ color: isActive ? func.color : token.colorTextDisabled, fontWeight: token.fontWeightStrong }}>{func.icon}</span>
                        <span style={{ color: isActive ? token.colorText : token.colorTextDisabled, fontWeight: token.fontWeightStrong }}> {(() => { const k = functionNameToKey[func.name]; return k ? t(k) : func.name; })()}</span>
                      </React.Fragment>
                    ))
                  )}
                </span>
              );
            }
            return String(text || '');
          },
        };
      })
      .filter((col): col is NonNullable<typeof col> => col !== null) as ColumnsType<MasterRecord>;

    dynamicColumns.push({
      title: '',
      key: 'action',
      width: 140,
      align: 'right',
      fixed: 'right',
      onCell: (record) => ({
        style: { backgroundColor: record.isActive === false ? '#D3D3D3' : undefined },
      }),
      render: (_, record) => {
        const isActive = record.isActive !== false;
        return (
          <Flex gap="small" justify="end">
            <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} disabled={isReadOnly}>
              {t('roleManagement.buttons.edit')}
            </Button>
            <Button
              size="small"
              onClick={() => handleToggleActive(record)}
              danger={!isReadOnly && isActive}
              style={{ minWidth: '80px', color: (!isReadOnly && isActive) ? token.colorError : token.colorText }}
              disabled={isReadOnly}
            >
              {isActive ? t('roleManagement.status.inactive') : t('roleManagement.status.active')}
            </Button>
          </Flex>
        );
      },
    });

    return dynamicColumns;
  }, [selectedMasterInfo, token, formatDateTime, t]);

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => { setSelectedRowKeys(newSelectedRowKeys); },
  };

  const handleAdd = () => {
    setEditingMaster(null);
    form.resetFields();
    setTempFunctionData(null);
    form.setFieldsValue({ isActive: true, functionId: '', functionName: NO_FUNCTION_SELECTED, functionWritePermissions: '' });
    setIsModalVisible(true);
  };

  const handleEdit = (master: MasterRecord) => {
    setEditingMaster(master);
    form.setFieldsValue(master);
    setTempFunctionData(null);
    setIsModalVisible(true);
  };

  const functionOptions = useMemo(() => {
    if (tempFunctionData && tempFunctionData.apiFunctionNames && tempFunctionData.apiFunctionNames !== NO_FUNCTION_SELECTED) {
      return tempFunctionData.apiFunctionNames
        .split('/')
        .map(name => name.trim())
        .filter(name => name !== '')
        .map(name => ({ label: name, value: name }));
    }
    if (!editingMaster || !editingMaster.functions) return [];
    const functions = editingMaster.functions as Array<{ name: string }>;
    return functions.map(func => {
      const key = functionNameToKey[func.name];
      return { label: key ? t(key) : func.name, value: func.name };
    });
  }, [editingMaster, tempFunctionData]);

  const handleActivate = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('roleManagement.messages.activateSelectRequired'));
      return;
    }
    modal.confirm({
      title: t('roleManagement.messages.activateConfirmTitle'),
      content: t('roleManagement.messages.activateConfirmContent').replace('{count}', String(selectedRowKeys.length)),
      okText: t('roleManagement.status.active'),
      cancelText: t('roleManagement.buttons.cancel'),
      onOk: async () => {
        try {
          await batchUpdateMasterStatus(selectedRowKeys.map(String), true);
          await fetchRoleMasters();
          setSelectedRowKeys([]);
          message.success(t('roleManagement.messages.activateSuccess').replace('{count}', String(selectedRowKeys.length)));
        } catch (error) {
          message.error(extractErrorMessage(error, t('roleManagement.messages.activateError')));
        }
      },
    });
  };

  const handleDeactivate = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('roleManagement.messages.deactivateSelectRequired'));
      return;
    }
    modal.confirm({
      title: t('roleManagement.messages.deactivateConfirmTitle'),
      content: t('roleManagement.messages.deactivateConfirmContent').replace('{count}', String(selectedRowKeys.length)),
      okText: t('roleManagement.status.inactive'),
      cancelText: t('roleManagement.buttons.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await batchUpdateMasterStatus(selectedRowKeys.map(String), false);
          await fetchRoleMasters();
          setSelectedRowKeys([]);
          message.success(t('roleManagement.messages.deactivateSuccess').replace('{count}', String(selectedRowKeys.length)));
        } catch (error) {
          message.error(extractErrorMessage(error, t('roleManagement.messages.deactivateError')));
        }
      },
    });
  };

  const handleToggleActive = async (record: MasterRecord) => {
    const idField = Object.keys(selectedMasterInfo?.itemCategories || {})[0];
    const nameField = Object.keys(selectedMasterInfo?.itemCategories || {})[1];
    const masterName = record[nameField] || 'このロール';
    const currentStatus = record.isActive !== false;
    const actionText = currentStatus ? t('roleManagement.status.inactive') : t('roleManagement.status.active');
    const newStatus = !currentStatus;

    modal.confirm({
      title: t('roleManagement.messages.toggleConfirmTitle').replace('{name}', String(masterName)).replace('{action}', actionText),
      content: t('roleManagement.messages.toggleConfirmContent').replace('{action}', actionText),
      okText: actionText,
      cancelText: t('roleManagement.buttons.cancel'),
      okButtonProps: currentStatus ? { danger: true } : undefined,
      onOk: async () => {
        try {
          await updateMasterStatus(String(record[idField]), newStatus);
          await fetchRoleMasters();
          message.success(t('roleManagement.messages.toggleSuccess').replace('{name}', String(masterName)).replace('{action}', actionText));
        } catch (error) {
          message.error(extractErrorMessage(error, t('roleManagement.messages.toggleError')));
        }
      },
    });
  };

  const handleReload = () => {
    if (!selectedMasterInfo) return;
    fetchRoleMasters();
  };

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleCSVUpload(file);
    };
    input.click();
  };

  const handleCSVUpload = async (file: File) => {
    if (!selectedMasterInfo) return;
    try {
      setLoading(true);
      await uploadCsv(file);
      await fetchRoleMasters();
      message.success(t('roleManagement.messages.csvUploadSuccess'));
    } catch (error) {
      message.error(extractErrorMessage(error, t('roleManagement.messages.csvUploadError')));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedMasterInfo) return;
    try {
      await downloadCsv({ searchText, roleNameFilter: selectedRoleNameFilter });
      message.success(t('roleManagement.messages.csvDownloadSuccess'));
    } catch (error) {
      message.error(extractErrorMessage(error, t('roleManagement.messages.csvDownloadError')));
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();

      if (editingMaster) {
        const idField = Object.keys(selectedMasterInfo?.itemCategories || {})[0];
        const roleId = String(editingMaster[idField]);
        let finalInitialScreenFunctionName = values.initialScreenFunctionName || null;

        if (tempFunctionData) {
          let shouldClear = false;
          if (!tempFunctionData.apiFunctionNames || tempFunctionData.apiFunctionNames === NO_FUNCTION_SELECTED || tempFunctionData.apiFunctionNames.trim() === '') {
            shouldClear = true;
          }
          if (!shouldClear && values.initialScreenFunctionName) {
            const list = tempFunctionData.apiFunctionNames.split('/').map(n => n.trim()).filter(n => n !== '' && n !== NO_FUNCTION_SELECTED);
            if (!list.includes(values.initialScreenFunctionName)) shouldClear = true;
          }
          if (shouldClear) finalInitialScreenFunctionName = null;
        }

        await updateRole(roleId, { roleName: values.roleName, initialScreenFunctionName: finalInitialScreenFunctionName, isActive: values.isActive });
        if (tempFunctionData && tempFunctionData.apiFunctionNames !== NO_FUNCTION_SELECTED) {
          await updateRolePermissions(roleId, tempFunctionData.apiFunctionNames, tempFunctionData.functionWritePermissions);
        }
        await fetchRoleMasters();
        message.success(t('roleManagement.messages.saveSuccess'));
      } else {
        let finalInitialScreenFunctionName = values.initialScreenFunctionName || null;
        if (tempFunctionData) {
          let shouldClear = false;
          if (!tempFunctionData.apiFunctionNames || tempFunctionData.apiFunctionNames === NO_FUNCTION_SELECTED || tempFunctionData.apiFunctionNames.trim() === '') {
            shouldClear = true;
          }
          if (!shouldClear && values.initialScreenFunctionName) {
            const list = tempFunctionData.apiFunctionNames.split('/').map(n => n.trim()).filter(n => n !== '' && n !== NO_FUNCTION_SELECTED);
            if (!list.includes(values.initialScreenFunctionName)) shouldClear = true;
          }
          if (shouldClear) finalInitialScreenFunctionName = null;
        }

        await createRole({ role: values.role, roleName: values.roleName, initialScreenFunctionName: finalInitialScreenFunctionName, isActive: values.isActive !== undefined ? values.isActive : true });
        if (tempFunctionData && tempFunctionData.apiFunctionNames !== NO_FUNCTION_SELECTED) {
          await updateRolePermissions(values.role, tempFunctionData.apiFunctionNames, tempFunctionData.functionWritePermissions);
        }
        await fetchRoleMasters();
        message.success(t('roleManagement.messages.addSuccess'));
      }

      setTempFunctionData(null);
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      // form.validateFields() によるバリデーションエラーはフォームに表示済みのため何もしない
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      const axiosError = error as { response?: { status?: number } };
      if (axiosError?.response?.status === 409) {
        const dupMsg = t('roleManagement.messages.duplicateIdError');
        form.setFields([{ name: 'role', errors: [dupMsg] }]);
        message.error(dupMsg);
        return;
      }
      message.error(extractErrorMessage(error, t('roleManagement.messages.saveError')));
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setTempFunctionData(null);
  };

  const handleOpenFunctionModalDirect = async (record: MasterRecord) => {
    try {
      const idField = Object.keys(selectedMasterInfo?.itemCategories || {})[0];
      const roleId = String(record[idField] || '');
      if (!roleId) {
        setFunctionDialogMode('temporary');
        setEditingFunctionMaster(record);
        setIsFunctionModalVisible(true);
        return;
      }
      try {
        const { fetchMasterById } = await import('@/services/roleApiService');
        const latestRoleData = await fetchMasterById(roleId);
        const convertedData = {
          masterId: '4',
          role: latestRoleData.roleId || latestRoleData.role,
          roleName: latestRoleData.roleName,
          functionName: latestRoleData.functionName,
          initialScreenFunctionName: latestRoleData.initialScreenFunctionName || null,
          functionWritePermissions: latestRoleData.functionWritePermissions,
          functionIds: latestRoleData.functionIds || [],
          writableFunctionIds: latestRoleData.writableFunctionIds || [],
          isActive: latestRoleData.isActive,
          updatedAt: latestRoleData.updatedAt,
        };
        setFunctionDialogMode('direct');
        setEditingFunctionMaster(convertedData);
        setIsFunctionModalVisible(true);
      } catch {
        setFunctionDialogMode('temporary');
        setEditingFunctionMaster(record);
        setIsFunctionModalVisible(true);
      }
    } catch (error) {
      message.error(extractErrorMessage(error, t('roleManagement.messages.genericError')));
    }
  };

  const handleOpenFunctionModalTemporary = (record: MasterRecord) => {
    setFunctionDialogMode('temporary');
    setEditingFunctionMaster(record);
    setIsFunctionModalVisible(true);
  };

  const handleFunctionDialogOk = async (
    functionName: string,
    functionWritePermissions: string,
    apiFunctionNames: string,
    mode: 'direct' | 'temporary'
  ) => {
    if (!editingFunctionMaster || !selectedMasterInfo) {
      message.error(t('roleManagement.messages.genericError'));
      setIsFunctionModalVisible(false);
      setEditingFunctionMaster(null);
      return;
    }
    try {
      if (mode === 'direct') {
        const idField = Object.keys(selectedMasterInfo?.itemCategories || {})[0];
        const roleId = String(editingFunctionMaster[idField]);
        await updateRolePermissions(roleId, apiFunctionNames, functionWritePermissions);
        if (!functionName || functionName === NO_FUNCTION_SELECTED) {
          await updateRole(roleId, { initialScreenFunctionName: null });
        }
        await fetchRoleMasters();
        message.success(t('roleManagement.messages.functionUpdateSuccess'));
      } else {
        setTempFunctionData({ functionName, apiFunctionNames, functionWritePermissions });
        form.setFieldsValue({ functionName, functionWritePermissions });
        message.success(t('roleManagement.messages.functionTempSaved'));
      }
    } catch (error) {
      message.error(extractErrorMessage(error, t('roleManagement.messages.genericError')));
    }
    setIsFunctionModalVisible(false);
    setEditingFunctionMaster(null);
  };

  const handleFunctionDialogCancel = () => {
    setIsFunctionModalVisible(false);
    setEditingFunctionMaster(null);
  };

  return (
    <div style={{ padding: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 16, gap: 16 }}>
        <Flex gap="small">
          <Button icon={<UploadOutlined />} onClick={handleUpload} disabled={isReadOnly}>
            {t('roleManagement.buttons.csvUpload')}
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleDownload}>
            {t('roleManagement.buttons.csvDownload')}
          </Button>
          <Button icon={<PlusOutlined />} onClick={handleAdd} disabled={isReadOnly}>
            {t('roleManagement.buttons.add')}
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
            {t('roleManagement.buttons.activate')}
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
            {t('roleManagement.buttons.deactivate')}
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReload}>
            {t('roleManagement.buttons.reload')}
          </Button>
        </Flex>
      </div>

      <div style={{ padding: 0, backgroundColor: token.colorBgContainer, maxWidth: 3600, margin: '0 auto' }}>
        <Row gutter={16} style={{ marginBottom: 8 }}>
          <Col style={{ width: 400 }}>
            <Input
              placeholder={t('roleManagement.searchPlaceholder')}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col style={{ width: 150 }}>
            <Select
              placeholder={t('roleManagement.filters.roleName')}
              value={selectedRoleNameFilter || undefined}
              onChange={(value) => setSelectedRoleNameFilter(value || '')}
              allowClear
              style={{ width: '100%' }}
              options={getRoleNameOptions}
            />
          </Col>
        </Row>

        <Table
          loading={loading}
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredMasters}
          rowKey={(record) => {
            if (!selectedMasterInfo) return String(record.role ?? record.roleName ?? JSON.stringify(record));
            const idField = Object.keys(selectedMasterInfo.itemCategories)[0];
            return String(record[idField] ?? `${record.role}_${record.functionName}`);
          }}
          onRow={(record) => ({
            style: { backgroundColor: record.isActive === false ? '#D3D3D3' : undefined },
          })}
          size="small"
          scroll={{ x: 1400 }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100'],
            showTotal: (total) => t('roleManagement.pagination.showTotal').replace('{total}', String(total)),
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
            onShowSizeChange: (_, size) => {
              setCurrentPage(1);
              setPageSize(size);
            },
          }}
        />
      </div>

      <Modal
        title={editingMaster ? t('roleManagement.modal.editTitle') : t('roleManagement.modal.addTitle')}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        okText={t('roleManagement.buttons.save')}
        cancelText={t('roleManagement.buttons.cancel')}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="role"
            label={t('roleManagement.form.roleCd')}
            rules={[{ required: true, message: t('roleManagement.form.roleCdRequired') }]}
          >
            <Input placeholder={t('roleManagement.form.roleCdPlaceholder')} disabled={!!editingMaster} />
          </Form.Item>
          <Form.Item
            name="roleName"
            label={t('roleManagement.form.roleName')}
            rules={[{ required: true, message: t('roleManagement.form.roleNameRequired') }]}
          >
            <Input placeholder={t('roleManagement.form.roleNamePlaceholder')} />
          </Form.Item>
          <Form.Item name="functionName" label={t('roleManagement.form.functionName')}>
            <Input
              readOnly={true}
              placeholder={NO_FUNCTION_SELECTED}
              onClick={() => {
                if (editingMaster) {
                  handleOpenFunctionModalTemporary(editingMaster);
                } else {
                  const tempMaster = {
                    role: form.getFieldValue('role') || '',
                    roleName: form.getFieldValue('roleName') || '',
                    functionName: NO_FUNCTION_SELECTED,
                    functionWritePermissions: '',
                    functionIds: [],
                    writableFunctionIds: [],
                    isActive: true,
                  };
                  handleOpenFunctionModalTemporary(tempMaster);
                }
              }}
              style={{ cursor: 'pointer', backgroundColor: token.colorBgContainer }}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.functionName !== cur.functionName}>
            {({ getFieldValue }) => {
              const functionNameValue = getFieldValue('functionName');
              const isFunctionDisabled = !functionNameValue || functionNameValue === NO_FUNCTION_SELECTED;
              return (
                <Form.Item name="initialScreenFunctionName" label={t('roleManagement.form.initialScreen')}>
                  <Select
                    placeholder={t('roleManagement.form.initialScreenPlaceholder')}
                    disabled={isFunctionDisabled}
                    options={functionOptions}
                    allowClear
                  />
                </Form.Item>
              );
            }}
          </Form.Item>
          <Form.Item name="isActive" label={t('roleManagement.form.status')}>
            <Select
              options={[
                { value: true, label: t('roleManagement.status.active') },
                { value: false, label: t('roleManagement.status.inactive') },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <FunctionPermissionDialog
        open={isFunctionModalVisible}
        onOk={handleFunctionDialogOk}
        onCancel={handleFunctionDialogCancel}
        mode={functionDialogMode}
        initialFunctionName={editingFunctionMaster?.functionName ? String(editingFunctionMaster.functionName) : ''}
        initialWritePermissions={editingFunctionMaster?.functionWritePermissions ? String(editingFunctionMaster.functionWritePermissions) : ''}
        initialFunctionIds={editingFunctionMaster?.functionIds ? (editingFunctionMaster.functionIds as string[]) : []}
        initialWritableFunctionIds={editingFunctionMaster?.writableFunctionIds ? (editingFunctionMaster.writableFunctionIds as string[]) : []}
      />
    </div>
  );
}
