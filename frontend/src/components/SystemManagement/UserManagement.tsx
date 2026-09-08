'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  Tag,
  Modal,
  Form,
  Select,
  Typography,
  Row,
  Col,
  Badge,
  App,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  UploadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UserRecord, CreateUserRequest, UpdateUserRequest } from '@/types/user';
import {
  fetchUsers,
  createUser,
  updateUser,
  updateUserStatus,
  batchUpdateUserStatus,
  uploadCsv,
  downloadCsv,
  fetchOrganizationCdByOrganizationId,
} from '@/services/userApiService';
import { fetchMasters as fetchRoles } from '@/services/roleApiService';
import { getMenuPermission } from '@/utils/menuPermissions';
import { useLanguage } from '@/contexts/LanguageContext';
import { extractErrorMessage, extractErrorCode } from '@/utils/errorUtils';
import { generateNamespaceUri } from '@/utils/namespaceUriGenerator';

const { Text } = Typography;

// ── ユーザー追加/編集ダイアログ用: 名前空間フィールド
interface UserNamespaceFieldsProps {
  form: ReturnType<typeof Form.useForm>[0];
  isEditing: boolean;
  organizationCd: string;
  /** 編集モード時に表示する既存URI（handleEdit から直接渡す） */
  existingUri?: string | null;
}
function UserNamespaceFields({ form, isEditing, organizationCd, existingUri }: UserNamespaceFieldsProps) {
  const { t } = useLanguage();

  // 追加モード用: メールアドレス入力に連動してURIをリアルタイム生成
  const mailAddress: string = Form.useWatch('mailAddress', form) ?? '';

  if (isEditing) {
    // 編集モード: namespace テーブルから取得した既存 URI をラベルで表示
    return (
      <Form.Item label={t('userManagement.form.namespaceUriLabel')}>
        <Text type={existingUri ? undefined : 'secondary'}>
          {existingUri || t('userManagement.form.namespaceUriNotSet')}
        </Text>
      </Form.Item>
    );
  }

  // 追加モード: メールアドレス入力に連動してURIをリアルタイム生成
  const loginName = mailAddress.includes('@') ? mailAddress.split('@')[0] : '';
  // loginName が確定していない場合はプレースホルダーを表示する（URI未生成）
  const autoUri = organizationCd && loginName
    ? generateNamespaceUri(organizationCd, undefined, undefined, loginName)
    : '';

  return (
    <Form.Item label={t('userManagement.form.namespaceUriAutoGenLabel')}>
      <Text type={autoUri ? undefined : 'secondary'}>
        {autoUri || t('userManagement.form.namespaceUriAutoGenPlaceholder')}
      </Text>
    </Form.Item>
  );
}

export default function UserManagement() {
  const { message, modal } = App.useApp();
  const { t } = useLanguage();

  const isReadOnly = getMenuPermission('system_admin') === 0;

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [roles, setRoles] = useState<{ value: string; label: string }[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [organizationCd, setOrganizationCd] = useState<string>('');
  const [form] = Form.useForm();

  useEffect(() => {
    loadUsers();
    loadRoles();
    loadOrganizationCd();
  }, []);

  const loadOrganizationCd = async () => {
    try {
      if (typeof window === 'undefined') return;
      const raw = localStorage.getItem('userInfo');
      if (!raw) return;
      const info = JSON.parse(raw) as { organizationId?: string };
      if (!info.organizationId) return;
      const cd = await fetchOrganizationCdByOrganizationId(info.organizationId);
      setOrganizationCd(cd);
    } catch {
      // 取得失敗時は空のまま（URI表示なし）
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await fetchUsers();
      setUsers(data);
    } catch (error) {
      console.error('ユーザー一覧の取得に失敗:', error);
      message.error(extractErrorMessage(error, t('userManagement.messages.fetchError')));
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const data = await fetchRoles();
      const options = data
        .filter((r) => r.roleId && r.roleName)
        .map((r) => ({
          value: String(r.roleId),
          label: String(r.roleName),
        }));
      setRoles(options);
    } catch (error) {
      console.error('ロール一覧の取得に失敗:', error);
      message.error(extractErrorMessage(error, t('userManagement.messages.roleFetchError')));
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const searchLower = searchText.toLowerCase();
      const matchesSearch = !searchText.trim() || (
        (user.userName && String(user.userName).toLowerCase().includes(searchLower)) ||
        (user.userId && String(user.userId).toLowerCase().includes(searchLower)) ||
        (user.mailAddress && String(user.mailAddress).toLowerCase().includes(searchLower))
      );
      const matchesRole = !selectedRole || user.roleCd === selectedRole;
      return matchesSearch && matchesRole;
    });
  }, [users, searchText, selectedRole]);

  // フィルタ変化時に1ページ目にリセット
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredUsers]);

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  const columns: ColumnsType<UserRecord> = [
    {
      title: (
        <div style={{ textAlign: 'center' }}>
          <Space size="middle" align="center">
            <span>{t('userManagement.columns.userName')}</span>
            <Badge
              count={filteredUsers.filter(user => user.isActive === true).length}
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
      dataIndex: 'userName',
      key: 'userName',
      width: 150,
      sorter: (a, b) => (String(a.userName) || '').localeCompare(String(b.userName) || ''),
      render: (text: string, record) => (
        <Text style={{
          fontWeight: 500,
          color: record.isActive !== false ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.45)',
        }}>
          {text}
        </Text>
      ),
    },
    {
      title: <div style={{ textAlign: 'center' }}>{t('userManagement.columns.mailAddress')}</div>,
      dataIndex: 'mailAddress',
      key: 'mailAddress',
      width: 250,
      sorter: (a, b) => (String(a.mailAddress) || '').localeCompare(String(b.mailAddress) || ''),
      render: (text: string, record) => (
        <Text style={{
          fontSize: 13,
          color: record.isActive !== false ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.45)',
        }}>
          {text}
        </Text>
      ),
    },
    {
      title: <div style={{ textAlign: 'center' }}>{t('userManagement.columns.roleName')}</div>,
      dataIndex: 'roleName',
      key: 'roleName',
      width: 130,
      align: 'center',
      sorter: (a, b) => (String(a.roleName) || '').localeCompare(String(b.roleName) || ''),
      render: (role: string, record) => (
        <Tag
          color="default"
          style={{
            borderRadius: 12,
            padding: '2px 12px',
            border: '1px solid #d9d9d9',
            backgroundColor: '#fff',
            color: 'rgba(0, 0, 0, 0.85)',
            opacity: record.isActive !== false ? 1 : 0.5,
          }}
        >
          {role}
        </Tag>
      ),
    },
    {
      title: <div style={{ textAlign: 'center' }}>{t('userManagement.columns.lastLoginAt')}</div>,
      dataIndex: 'lastLoginAt',
      key: 'lastLogin',
      width: 150,
      align: 'right',
      render: (value: string | null, record) => {
        if (!value) {
          return (
            <Text style={{
              color: record.isActive !== false ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.45)',
            }}>
              -
            </Text>
          );
        }
        const date = new Date(value);
        const formatted = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        return (
          <Text style={{
            color: record.isActive !== false ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.45)',
          }}>
            {formatted}
          </Text>
        );
      },
    },
    {
      title: '',
      key: 'action',
      width: 150,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            disabled={isReadOnly || loading}
          >
            {t('userManagement.buttons.edit')}
          </Button>
          <Button
            onClick={() => handleToggleActive(String(record.userId))}
            danger={record.isActive}
            style={{ width: '100px' }}
            disabled={isReadOnly || loading}
          >
            {record.isActive ? t('userManagement.status.inactive') : t('userManagement.status.active')}
          </Button>
        </Space>
      ),
    },
  ];

  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true });
    setIsModalVisible(true);
  };

  const handleEdit = (user: UserRecord) => {
    setEditingUser(user);
    form.setFieldsValue({
      userName: user.userName,
      mailAddress: user.mailAddress,
      roleCd: user.roleCd,
      isActive: user.isActive,
    });
    setIsModalVisible(true);
  };

  const handleActivate = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('userManagement.messages.activateSelectRequired'));
      return;
    }
    modal.confirm({
      title: t('userManagement.messages.activateConfirmTitle'),
      content: t('userManagement.messages.activateConfirmContent', { count: String(selectedRowKeys.length) }),
      okText: t('userManagement.status.active'),
      cancelText: t('userManagement.buttons.cancel'),
      onOk: async () => {
        try {
          setLoading(true);
          await batchUpdateUserStatus(selectedRowKeys as string[], true);
          await loadUsers();
          setSelectedRowKeys([]);
          message.success(t('userManagement.messages.activateSuccess', { count: String(selectedRowKeys.length) }));
        } catch (error) {
          console.error('アクティブ化に失敗:', error);
          message.error(extractErrorMessage(error, t('userManagement.messages.activateError')));
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleDeactivate = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('userManagement.messages.deactivateSelectRequired'));
      return;
    }
    modal.confirm({
      title: t('userManagement.messages.deactivateConfirmTitle'),
      content: t('userManagement.messages.deactivateConfirmContent', { count: String(selectedRowKeys.length) }),
      okText: t('userManagement.status.inactive'),
      cancelText: t('userManagement.buttons.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          setLoading(true);
          await batchUpdateUserStatus(selectedRowKeys as string[], false);
          await loadUsers();
          setSelectedRowKeys([]);
          message.success(t('userManagement.messages.deactivateSuccess', { count: String(selectedRowKeys.length) }));
        } catch (error) {
          console.error('非アクティブ化に失敗:', error);
          message.error(extractErrorMessage(error, t('userManagement.messages.deactivateError')));
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleToggleActive = (userId: string) => {
    const user = users.find(u => String(u.userId) === userId);
    if (!user) return;
    const actionText = user.isActive ? t('userManagement.status.inactive') : t('userManagement.status.active');
    const userName = String(user.userName);
    modal.confirm({
      title: t('userManagement.messages.toggleConfirmTitle', { name: userName, action: actionText }),
      content: t('userManagement.messages.toggleConfirmContent', { action: actionText }),
      okText: actionText,
      cancelText: t('userManagement.buttons.cancel'),
      okButtonProps: user.isActive ? { danger: true } : undefined,
      onOk: async () => {
        try {
          setLoading(true);
          await updateUserStatus(userId, !user.isActive);
          await loadUsers();
          message.success(t('userManagement.messages.toggleSuccess', { name: userName, action: actionText }));
        } catch (error) {
          console.error('ステータス更新に失敗:', error);
          message.error(extractErrorMessage(error, t('userManagement.messages.toggleError')));
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleReload = () => {
    loadUsers();
    setSearchText('');
    setSelectedRole('');
    setSelectedRowKeys([]);
    message.success(t('userManagement.messages.reloadSuccess'));
  };

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        try {
          setLoading(true);
          await uploadCsv(file);
          await loadUsers();
          message.success(t('userManagement.messages.csvUploadSuccess'));
        } catch (error) {
          console.error('CSVアップロードに失敗:', error);
          message.error(extractErrorMessage(error, t('userManagement.messages.csvUploadError')));
        } finally {
          setLoading(false);
        }
      }
    };
    input.click();
  };

  const handleDownload = async () => {
    try {
      setLoading(true);
      await downloadCsv({
        search: searchText,
        role_cd: selectedRole,
      });
      message.success(t('userManagement.messages.csvDownloadSuccess'));
    } catch (error) {
      console.error('CSV download error:', error);
      message.error(extractErrorMessage(error, t('userManagement.messages.csvDownloadError')));
    } finally {
      setLoading(false);
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingUser) {
        const updateData: UpdateUserRequest = {
          userName: values.userName,
          organizationGroupCds: values.organizationGroupCds,
          roleCd: values.roleCd,
          isActive: values.isActive,
        };
        setLoading(true);
        await updateUser(String(editingUser.userId), updateData);
        await loadUsers();
        message.success(t('userManagement.messages.saveSuccess'));
      } else {
        // organizationCd state（mount時にAPIで取得済み）とメールアドレスからURIを生成
        const mailAddr: string = values.mailAddress ?? '';
        const loginName = mailAddr.includes('@') ? mailAddr.split('@')[0] : '';
        const computedNsUri = organizationCd
          ? generateNamespaceUri(organizationCd, undefined, undefined, loginName || undefined)
          : '';
        const createData: CreateUserRequest = {
          userId: values.mailAddress,
          userName: values.userName,
          mailAddress: values.mailAddress,
          organizationGroupCds: values.organizationGroupCds,
          roleCd: values.roleCd,
          isActive: values.isActive,
          namespaceUri: computedNsUri || undefined,
        };
        setLoading(true);
        await createUser(createData);
        await loadUsers();
        message.success(t('userManagement.messages.addSuccess'));
      }
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('保存に失敗:', error);
      // form.validateFields() によるバリデーションエラーはフォームに表示済みのため何もしない
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }

      // メールアドレス重複エラー（USER_ALREADY_EXISTS）はフォームインラインで表示
      const code = extractErrorCode(error);
      if (code === 'USER_ALREADY_EXISTS') {
        const dupMsg = t('userManagement.messages.duplicateEmailError');
        form.setFields([
          {
            name: 'mailAddress',
            errors: [dupMsg],
          },
        ]);
        message.error(dupMsg);
        return;
      }

      message.error(extractErrorMessage(error, t('userManagement.messages.saveError')));
    } finally {
      setLoading(false);
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  return (
    <div style={{ padding: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16, gap: 8 }}>
        <Button icon={<UploadOutlined />} onClick={handleUpload} disabled={isReadOnly || loading}>
          {t('userManagement.buttons.csvUpload')}
        </Button>
        <Button icon={<DownloadOutlined />} onClick={handleDownload} disabled={loading}>
          {t('userManagement.buttons.csvDownload')}
        </Button>
        <Button icon={<PlusOutlined />} onClick={handleAdd} disabled={isReadOnly || loading}>
          {t('userManagement.buttons.add')}
        </Button>
        <Button
          icon={<DeleteOutlined />}
          onClick={handleActivate}
          disabled={isReadOnly || selectedRowKeys.length === 0 || loading}
          style={{
            minWidth: 85,
            backgroundColor: !isReadOnly && selectedRowKeys.length > 0 ? '#4CAF50' : undefined,
            borderColor: !isReadOnly && selectedRowKeys.length > 0 ? '#4CAF50' : undefined,
            color: !isReadOnly && selectedRowKeys.length > 0 ? '#fff' : undefined,
          }}
        >
          {t('userManagement.buttons.activate')}
        </Button>
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={handleDeactivate}
          disabled={isReadOnly || selectedRowKeys.length === 0 || loading}
          style={{
            minWidth: 110,
            backgroundColor: !isReadOnly && selectedRowKeys.length > 0 && !loading ? '#FFA500' : undefined,
            borderColor: !isReadOnly && selectedRowKeys.length > 0 && !loading ? '#FFA500' : undefined,
            color: !isReadOnly && selectedRowKeys.length > 0 && !loading ? '#fff' : undefined,
          }}
        >
          {t('userManagement.buttons.deactivate')}
        </Button>
        <Button icon={<ReloadOutlined />} onClick={handleReload} disabled={loading}>
          {t('userManagement.buttons.reload')}
        </Button>
      </div>

      <div style={{ padding: 0, backgroundColor: '#fff', maxWidth: 3600, margin: '0 auto' }}>
        <Row gutter={16} style={{ marginBottom: 8 }}>
          <Col style={{ width: 400 }}>
            <Input
              placeholder={t('userManagement.searchPlaceholder')}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              disabled={loading}
            />
          </Col>
          <Col style={{ width: 150 }}>
            <Select
              placeholder={t('userManagement.filters.role')}
              value={selectedRole || undefined}
              onChange={(value) => setSelectedRole(value || '')}
              allowClear
              style={{ width: '100%' }}
              options={roles}
              disabled={loading}
            />
          </Col>
        </Row>

        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredUsers}
          rowKey="userId"
          size="small"
          scroll={{ x: 1400 }}
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100'],
            showTotal: (total) => t('userManagement.pagination.showTotal', { total: String(total) }),
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
            onShowSizeChange: (_, size) => {
              setCurrentPage(1);
              setPageSize(size);
            },
          }}
          rowClassName={(record) => (record.isActive ? 'active-row' : 'inactive-row')}
        />
      </div>

      <Modal
        title={editingUser ? t('userManagement.modal.editTitle') : t('userManagement.modal.addTitle')}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        okText={t('userManagement.buttons.save')}
        cancelText={t('userManagement.buttons.cancel')}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="userName"
            label={t('userManagement.form.userName')}
            rules={[{ required: true, message: t('userManagement.form.userNameRequired') }]}
          >
            <Input placeholder={t('userManagement.form.userNamePlaceholder')} />
          </Form.Item>
          <Form.Item
            name="mailAddress"
            label={t('userManagement.form.mailAddress')}
            rules={[
              { required: true, message: t('userManagement.form.mailAddressRequired') },
              { type: 'email', message: t('userManagement.form.mailAddressInvalid') },
            ]}
          >
            <Input placeholder="example@company.com" disabled={!!editingUser} />
          </Form.Item>
          <Form.Item
            name="roleCd"
            label={t('userManagement.form.role')}
            rules={[{ required: true, message: t('userManagement.form.roleRequired') }]}
          >
            <Select placeholder={t('userManagement.form.rolePlaceholder')} options={roles} />
          </Form.Item>
          <Form.Item
            name="isActive"
            label={t('userManagement.form.isActive')}
            rules={[{ required: true, message: t('userManagement.form.isActiveRequired') }]}
          >
            <Select
              options={[
                { value: true, label: t('userManagement.status.active') },
                { value: false, label: t('userManagement.status.inactive') },
              ]}
            />
          </Form.Item>
          <UserNamespaceFields form={form} isEditing={!!editingUser} organizationCd={organizationCd} existingUri={editingUser?.namespaceUri} />
        </Form>
      </Modal>

      <style jsx global>{`
        .active-row td { background-color: #fff !important; }
        .active-row:hover td { background-color: #f5f5f5 !important; }
        .inactive-row td { background-color: #d3d3d3 !important; }
        .inactive-row:hover td { background-color: #c0c0c0 !important; }
      `}</style>
    </div>
  );
}
