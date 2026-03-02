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
import {
  fetchUsers,
  createUser,
  updateUser,
  updateUserStatus,
  batchUpdateUserStatus,
  uploadCsv,
  downloadCsv,
  UserRecord,
  CreateUserRequest,
  UpdateUserRequest,
  UserFilters,
} from '@/services/userApiService';
import { fetchMasters as fetchDepartments } from '@/services/departmentApiService';
import { fetchMasters as fetchRoles } from '@/services/roleApiService';
import { getMenuPermission } from '@/utils/menuPermissions';

const { Text } = Typography;

/**
 * ユーザー管理画面のコンポーネント
 */
export default function UserManagement() {
  const { message, modal } = App.useApp();

  // 権限制御: system_admin メニュー（機能CD: 020000）の permission が 0 の場合は読取専用
  const isReadOnly = getMenuPermission('system_admin') === 0;

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [departments, setDepartments] = useState<{ value: string; label: string }[]>([]);
  const [roles, setRoles] = useState<{ value: string; label: string }[]>([]);
  const [form] = Form.useForm();

  // 初期データ読み込み
  useEffect(() => {
    loadUsers();
    loadDepartments();
    loadRoles();
  }, []);

  /**
   * ユーザー一覧を読み込み
   */
  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await fetchUsers();
      setUsers(data);
    } catch (error) {
      console.error('ユーザー一覧の取得に失敗:', error);
      message.error('ユーザー一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 部署マスターを読み込み
   */
  const loadDepartments = async () => {
    try {
      const data = await fetchDepartments();
      console.log('=== Fetching Department ===');
      console.log('Department API Response:', data);
      
      const options = data.map((d) => ({
        value: String(d.departmentId),    // バックエンドのフィールド名（department_cd → departmentId）
        label: String(d.displayName)      // バックエンドのフィールド名（department_name → displayName）
      }));
      
      console.log('Department Options:', options);
      setDepartments(options);
    } catch (error) {
      console.error('部署一覧の取得に失敗:', error);
      message.error('部署一覧の取得に失敗しました');
    }
  };

  /**
   * ロールマスターを読み込み
   */
  const loadRoles = async () => {
    try {
      const data = await fetchRoles();
      console.log('Role API Response:', data);  // デバッグ用
      
      const options = data
        .filter((r) => r.roleId && r.roleName)  // バックエンドのフィールド名（role_cd → roleId）
        .map((r) => ({
          value: String(r.roleId),              // バックエンドのフィールド名（role_cd → roleId）
          label: String(r.roleName)             // バックエンドのフィールド名（role_name → roleName）
        }));
      
      console.log('Role Options:', options);  // デバッグ用
      setRoles(options);
    } catch (error) {
      console.error('ロール一覧の取得に失敗:', error);
      message.error('ロール一覧の取得に失敗しました');
    }
  };

  // フィルタリングされたユーザー
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // テキスト検索フィルター
      const searchLower = searchText.toLowerCase();
      const matchesSearch = !searchText.trim() || (
        (user.userName && String(user.userName).toLowerCase().includes(searchLower)) ||
        (user.userId && String(user.userId).toLowerCase().includes(searchLower)) ||
        (user.mailAddress && String(user.mailAddress).toLowerCase().includes(searchLower))
      );

      // 所属部署フィルター（department_cdで比較）
      const matchesDepartment = !selectedDepartment || user.departmentCd === selectedDepartment;

      // ロールフィルター（role_cdで比較）
      const matchesRole = !selectedRole || user.roleCd === selectedRole;

      return matchesSearch && matchesDepartment && matchesRole;
    });
  }, [users, searchText, selectedDepartment, selectedRole]);

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
            <span>ユーザー名</span>
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
          color: record.isActive !== false ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.45)'
        }}>
          {text}
        </Text>
      ),
    },
    {
      title: <div style={{ textAlign: 'center' }}>メールアドレス</div>,
      dataIndex: 'mailAddress',
      key: 'mailAddress',
      width: 250,
      sorter: (a, b) => (String(a.mailAddress) || '').localeCompare(String(b.mailAddress) || ''),
      render: (text: string, record) => (
        <Text style={{ 
          fontSize: 13,
          color: record.isActive !== false ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.45)'
        }}>
          {text}
        </Text>
      ),
    },
    {
      title: <div style={{ textAlign: 'center' }}>所属部署</div>,
      dataIndex: 'departmentName',
      key: 'departmentName',
      width: 150,
      align: 'left',
      sorter: (a, b) => (String(a.departmentName) || '').localeCompare(String(b.departmentName) || ''),
      render: (text: string, record) => (
        <Text style={{ 
          color: record.isActive !== false ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.45)'
        }}>
          {text || '-'}
        </Text>
      ),
    },
    {
      title: <div style={{ textAlign: 'center' }}>ロール</div>,
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
      title: <div style={{ textAlign: 'center' }}>最終ログイン</div>,
      dataIndex: 'lastLoginAt',
      key: 'lastLogin',
      width: 150,
      align: 'right',
      render: (value: string | null, record) => {
        if (!value) {
          return (
            <Text style={{ 
              color: record.isActive !== false ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.45)'
            }}>
              -
            </Text>
          );
        }
        // ISO日時をフォーマット（例: 2026-02-24T14:33:46.238Z → 2026/02/24 14:33）
        const date = new Date(value);
        const formatted = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        return (
          <Text style={{ 
            color: record.isActive !== false ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.45)'
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
            編集
          </Button>
          <Button
            onClick={() => handleToggleActive(String(record.userId))}
            danger={record.isActive}
            style={{ width: '100px' }}
            disabled={isReadOnly || loading}
          >
            {record.isActive ? '非アクティブ' : 'アクティブ'}
          </Button>
        </Space>
      ),
    },
  ];

  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({
      isActive: true,           // true=アクティブ（デフォルト）
    });
    setIsModalVisible(true);
  };

  const handleEdit = (user: UserRecord) => {
    setEditingUser(user);
    form.setFieldsValue({
      userName: user.userName,
      mailAddress: user.mailAddress,          // メールアドレス表示用
      departmentCd: user.departmentCd,
      roleCd: user.roleCd,
      isActive: user.isActive,
    });
    setIsModalVisible(true);
  };

  const handleActivate = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('アクティブにするユーザーを選択してください');
      return;
    }
    modal.confirm({
      title: '選択したユーザーをアクティブにしますか？',
      content: `${selectedRowKeys.length}件のユーザーがアクティブになります。`,
      okText: 'アクティブ化',
      cancelText: 'キャンセル',
      onOk: async () => {
        try {
          setLoading(true);
          await batchUpdateUserStatus(selectedRowKeys as string[], true);
          await loadUsers();
          setSelectedRowKeys([]);
          message.success(`${selectedRowKeys.length}件のユーザーをアクティブにしました`);
        } catch (error) {
          console.error('アクティブ化に失敗:', error);
          message.error('アクティブ化に失敗しました');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleDeactivate = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('非アクティブにするユーザーを選択してください');
      return;
    }
    modal.confirm({
      title: '選択したユーザーを非アクティブにしますか？',
      content: `${selectedRowKeys.length}件のユーザーが非アクティブになります。`,
      okText: '非アクティブ化',
      cancelText: 'キャンセル',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          setLoading(true);
          await batchUpdateUserStatus(selectedRowKeys as string[], false);
          await loadUsers();
          setSelectedRowKeys([]);
          message.success(`${selectedRowKeys.length}件のユーザーを非アクティブにしました`);
        } catch (error) {
          console.error('非アクティブ化に失敗:', error);
          message.error('非アクティブ化に失敗しました');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleToggleActive = (userId: string) => {
    const user = users.find(u => String(u.userId) === userId);
    if (!user) return;

    const actionText = user.isActive ? '非アクティブ' : 'アクティブ';
    const userName = String(user.userName);

    modal.confirm({
      title: `${userName}を${actionText}にしますか？`,
      content: `このユーザーを${actionText}状態に変更します。`,
      okText: actionText,
      cancelText: 'キャンセル',
      okButtonProps: user.isActive ? { danger: true } : undefined,
      onOk: async () => {
        try {
          setLoading(true);
          await updateUserStatus(userId, !user.isActive);
          await loadUsers();
          message.success(`${userName}を${actionText}にしました`);
        } catch (error) {
          console.error('ステータス更新に失敗:', error);
          message.error('ステータス更新に失敗しました');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleReload = () => {
    loadUsers();
    setSearchText('');
    setSelectedDepartment('');
    setSelectedRole('');
    setSelectedRowKeys([]);
    message.success('データをリロードしました');
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
          message.success('CSVファイルをアップロードしました');
        } catch (error) {
          console.error('CSVアップロードに失敗:', error);
          const errorMessage = error instanceof Error ? error.message : 'CSVアップロードに失敗しました';
          message.error(errorMessage);
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
        department_cd: selectedDepartment,
        role_cd: selectedRole,
      });
      message.success('CSVファイルをダウンロードしました');
    } catch (error) {
      console.error('CSV download error:', error);
      message.error(error instanceof Error ? error.message : 'CSVダウンロードに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingUser) {
        // 更新
        const updateData: UpdateUserRequest = {
          userName: values.userName,
          departmentCd: values.departmentCd,
          roleCd: values.roleCd,
          isActive: values.isActive,  // アクティブ判定を追加
        };
        
        setLoading(true);
        await updateUser(String(editingUser.userId), updateData);
        await loadUsers();
        message.success('ユーザー情報を更新しました');
      } else {
          // 新規作成
        const createData: CreateUserRequest = {
          userId: values.mailAddress,
          userName: values.userName,
          mailAddress: values.mailAddress,
          departmentCd: values.departmentCd,
          roleCd: values.roleCd,
          isActive: values.isActive,
        };
        
        setLoading(true);
        await createUser(createData);
        await loadUsers();
        message.success('ユーザーを追加しました');
      }
      
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('保存に失敗:', error);
      const errorMessage = error instanceof Error ? error.message : '保存に失敗しました';
      message.error(errorMessage);
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
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        marginBottom: 16,
        gap: 8,
      }}>
        <Button icon={<UploadOutlined />} onClick={handleUpload} disabled={isReadOnly || loading}>
          CSV<br />アップロード
        </Button>
        <Button icon={<DownloadOutlined />} onClick={handleDownload} disabled={loading}>
          CSV<br />ダウンロード
        </Button>
        <Button icon={<PlusOutlined />} onClick={handleAdd} disabled={isReadOnly || loading}>
          追加
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
          アクティブ
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
          非アクティブ
        </Button>
        <Button icon={<ReloadOutlined />} onClick={handleReload} disabled={loading}>
          リロード
        </Button>
      </div>

      <div
        style={{
          padding: 0,
          backgroundColor: '#fff',
          maxWidth: 3600,
          margin: '0 auto',
        }}
      >
        <Row gutter={16} style={{ marginBottom: 8 }}>
          <Col style={{ width: 400 }}>
            <Input
              placeholder="ユーザー名、メールアドレスで検索"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              disabled={loading}
            />
          </Col>
          <Col style={{ width: 150 }}>
            <Select
              placeholder="所属部署"
              value={selectedDepartment || undefined}
              onChange={(value) => setSelectedDepartment(value || '')}
              allowClear
              style={{ width: '100%' }}
              options={departments}
              disabled={loading}
            />
          </Col>
          <Col style={{ width: 150 }}>
            <Select
              placeholder="ロール"
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
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `全 ${total} 件`,
          }}
          rowClassName={(record) => (record.isActive ? 'active-row' : 'inactive-row')}
        />
      </div>

      <Modal
        title={editingUser ? 'ユーザー編集' : 'ユーザー追加'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        okText="保存"
        cancelText="キャンセル"
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="userName"
            label="ユーザー名"
            rules={[{ required: true, message: 'ユーザー名を入力してください' }]}
          >
            <Input placeholder="山田 太郎" />
          </Form.Item>

          <Form.Item
            name="mailAddress"
            label="メールアドレス"
            rules={[
              { required: true, message: 'メールアドレスを入力してください' },
              { type: 'email', message: '正しいメールアドレスを入力してください' }
            ]}
          >
            <Input 
              placeholder="example@company.com" 
              disabled={!!editingUser}
            />
          </Form.Item>


          <Form.Item
            name="departmentCd"
            label="所属部署"
            rules={[{ required: true, message: '所属部署を選択してください' }]}
          >
            <Select
              placeholder="所属部署を選択"
              options={departments}
            />
          </Form.Item>

          <Form.Item
            name="roleCd"
            label="ロール"
            rules={[{ required: true, message: 'ロールを選択してください' }]}
          >
            <Select
              placeholder="ロールを選択"
              options={roles}
            />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="アクティブ判定"
            rules={[{ required: true, message: 'アクティブ判定を選択してください' }]}
          >
            <Select
              options={[
                { value: true, label: 'アクティブ' },
                { value: false, label: '非アクティブ' },
              ]}
            />
          </Form.Item>

        </Form>
      </Modal>

      <style jsx global>{`
        .active-row td {
          background-color: #fff !important;
        }
        .active-row:hover td {
          background-color: #f5f5f5 !important;
        }
        .inactive-row td {
          background-color: #d3d3d3 !important;
        }
        .inactive-row:hover td {
          background-color: #c0c0c0 !important;
        }
      `}</style>
    </div>
  );
}
