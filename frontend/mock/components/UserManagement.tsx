'use client';

import React, { useState, useMemo } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  Tag,
  Modal,
  Form,
  Select,
  message,
  Typography,
  Row,
  Col,
  Badge,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  UploadOutlined,
  DownloadOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import Papa from 'papaparse';
import usersData from '../data/users-management.json';

const { Text } = Typography;

/**
 * ユーザーデータの型定義
 */
interface UserData {
  id: string;
  lastName: string;
  firstName: string;
  userId: string;
  emailAdress: string;
  department: string;
  twoFactorAuth: string;
  role: string;
  lastLogin: string;
  isActive: boolean;
  avatarText: string;
}

/**
 * ユーザー管理画面（モック）
 */
export default function UserManagement() {
  const [users, setUsers] = useState<UserData[]>(usersData as UserData[]);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedTwoFactorAuth, setSelectedTwoFactorAuth] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [form] = Form.useForm();

  // 所属部署の選択肢を動的に取得
  const departments = useMemo(() => {
    const uniqueDepts = Array.from(new Set(users.map(u => u.department).filter(d => d)));
    return uniqueDepts.sort();
  }, [users]);

  // フィルタリングされたユーザー
  // ユーザー名、ユーザーID、メールアドレスをまとめて曖昧検索 + 所属部署、二段階認証、ロールでフィルター
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // テキスト検索フィルター
      const searchLower = searchText.toLowerCase();
      const matchesSearch = !searchText.trim() || (
        user.lastName.toLowerCase().includes(searchLower) ||
        user.firstName.toLowerCase().includes(searchLower) ||
        user.userId.toLowerCase().includes(searchLower) ||
        user.emailAdress.toLowerCase().includes(searchLower)
      );

      // 所属部署フィルター
      const matchesDepartment = !selectedDepartment || user.department === selectedDepartment;

      // 二段階認証フィルター
      const matchesTwoFactorAuth = !selectedTwoFactorAuth || user.twoFactorAuth === selectedTwoFactorAuth;

      // ロールフィルター
      const matchesRole = !selectedRole || user.role === selectedRole;

      return matchesSearch && matchesDepartment && matchesTwoFactorAuth && matchesRole;
    });
  }, [users, searchText, selectedDepartment, selectedTwoFactorAuth, selectedRole]);

  const roles = [
    { value: 'システム管理者', label: 'システム管理者' },
    { value: 'データ管理者', label: 'データ管理者' },
    { value: '実験管理者', label: '実験管理者' },
    { value: '実験作業者', label: '実験作業者' },
  ];

  const twoFactorAuthOptions = [
    { value: '済', label: '済' },
    { value: '未', label: '未' },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  const columns: ColumnsType<UserData> = [
    {
      title: (
        <Space size="middle" align="center">
          <span>ユーザー名</span>
          <Badge
            count={filteredUsers.filter(user => !user.isActive).length}
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
      ),
      key: 'user',
      width: 200,
      sorter: (a, b) => a.lastName.localeCompare(b.lastName),
      render: (_, record) => (
        <Text style={{ 
          fontWeight: 500, 
          color: record.isActive ? 'rgba(0, 0, 0, 0.45)' : '#0093CF'
        }}>
          {record.lastName} {record.firstName}
        </Text>
      ),
    },
    {
      title: 'ユーザーID',
      dataIndex: 'userId',
      key: 'userId',
      width: 250,
      sorter: (a, b) => a.userId.localeCompare(b.userId),
      render: (text: string, record) => (
        <Text style={{ 
          fontSize: 13,
          color: record.isActive ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.85)'
        }}>
          {text}
        </Text>
      ),
    },
    {
      title: 'メールアドレス',
      dataIndex: 'emailAdress',
      key: 'emailAdress',
      width: 250,
      sorter: (a, b) => a.emailAdress.localeCompare(b.emailAdress),
      render: (text: string, record) => (
        <Text style={{ 
          fontSize: 13,
          color: record.isActive ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.85)'
        }}>
          {text}
        </Text>
      ),
    },
    {
      title: '所属部署',
      dataIndex: 'department',
      key: 'department',
      width: 150,
      align: 'center',
      sorter: (a, b) => a.department.localeCompare(b.department),
    },
    {
      title: '二段階認証設定',
      dataIndex: 'twoFactorAuth',
      key: 'twoFactorAuth',
      width: 130,
      align: 'center',
      sorter: (a, b) => a.twoFactorAuth.localeCompare(b.twoFactorAuth),
    },
    {
      title: 'ロール',
      dataIndex: 'role',
      key: 'role',
      width: 130,
      align: 'center',
      sorter: (a, b) => a.role.localeCompare(b.role),
      render: (role: string) => (
        <Tag
          color={role === 'システム管理者' ? '#FFC0CB' : role === 'システム権限者' ? '#87CEEB' : 'default'}
          style={{
            borderRadius: 12,
            padding: '2px 12px',
            border: 'none',
          }}
        >
          {role}
        </Tag>
      ),
    },
    {
      title: '最終ログイン',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
      width: 130,
      sorter: (a, b) => new Date(a.lastLogin).getTime() - new Date(b.lastLogin).getTime(),
    },
    {
      title: '',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            編集
          </Button>
          <Button
            onClick={() => handleToggleActive(record.id)}
            danger={!record.isActive}
          >
            {record.isActive ? '活性' : '非活性'}
          </Button>
        </Space>
      ),
    },
  ];

  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({
      twoFactorAuth: '未',
      role: 'システム権限者',
      isActive: true,
    });
    setIsModalVisible(true);
  };

  const handleEdit = (user: UserData) => {
    setEditingUser(user);
    form.setFieldsValue(user);
    setIsModalVisible(true);
  };

  const handleActivate = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('活性にするユーザーを選択してください');
      return;
    }
    Modal.confirm({
      title: '選択したユーザーを活性にしますか？',
      content: `${selectedRowKeys.length}件のユーザーが活性になります。`,
      okText: '活性',
      cancelText: 'キャンセル',
      onOk: () => {
        setUsers(users.map(u => 
          selectedRowKeys.includes(u.id) ? { ...u, isActive: false } : u
        ));
        setSelectedRowKeys([]);
        message.success(`${selectedRowKeys.length}件のユーザーを活性にしました`);
      },
    });
  };

  const handleDeactivate = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('非活性にするユーザーを選択してください');
      return;
    }
    Modal.confirm({
      title: '選択したユーザーを非活性にしますか？',
      content: `${selectedRowKeys.length}件のユーザーが非活性になります。`,
      okText: '非活性',
      cancelText: 'キャンセル',
      okButtonProps: { danger: true },
      onOk: () => {
        setUsers(users.map(u => 
          selectedRowKeys.includes(u.id) ? { ...u, isActive: true } : u
        ));
        setSelectedRowKeys([]);
        message.success(`${selectedRowKeys.length}件のユーザーを非活性にしました`);
      },
    });
  };

  const handleToggleActive = (id: string) => {
    const user = users.find(u => u.id === id);
    if (!user) return;

    const actionText = user.isActive ? '活性' : '非活性';
    const userName = `${user.lastName} ${user.firstName}`;

    Modal.confirm({
      title: `${userName}を${actionText}にしますか？`,
      content: `このユーザーを${actionText}状態に変更します。`,
      okText: actionText,
      cancelText: 'キャンセル',
      okButtonProps: user.isActive ? undefined : { danger: true },
      onOk: () => {
        setUsers(users.map(u => 
          u.id === id ? { ...u, isActive: !u.isActive } : u
        ));
        message.success(`${userName}を${actionText}にしました`);
      },
    });
  };

  const handleReload = () => {
    setUsers(usersData as UserData[]);
    setSearchText('');
    setSelectedRowKeys([]);
    message.success('データをリロードしました');
  };

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

  const handleCSVUpload = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      encoding: 'UTF-8',
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<Record<string, string>>) => {
        try {
          const newUsers: UserData[] = [];
          const errors: string[] = [];
          const existingUserIds = new Set(users.map(u => u.userId.toLowerCase()));

          results.data.forEach((row: Record<string, string>, index: number) => {
            const rowNumber = index + 2;

            if (!row['姓'] || !row['名'] || !row['ユーザーID'] || !row['メールアドレス']) {
              errors.push(`${rowNumber}行目: 姓、名、ユーザーID、メールアドレスは必須です`);
              return;
            }

            const userId = row['ユーザーID'].trim().toLowerCase();
            if (existingUserIds.has(userId)) {
              errors.push(`${rowNumber}行目: ユーザーID「${row['ユーザーID']}」は既に登録されています`);
              return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(row['メールアドレス'])) {
              errors.push(`${rowNumber}行目: メールアドレスの形式が不正です`);
              return;
            }

            const validRoles = ['システム管理者', 'システム権限者', 'データ管理者', '実験管理者', '実験作業者'];
            const role = row['ロール'] || 'システム権限者';
            if (!validRoles.includes(role)) {
              errors.push(`${rowNumber}行目: ロール「${role}」は無効です`);
              return;
            }

            const twoFactorAuth = row['二段階認証設定'] || '未';
            if (!['済', '未'].includes(twoFactorAuth)) {
              errors.push(`${rowNumber}行目: 二段階認証設定は「済」または「未」を指定してください`);
              return;
            }

            const isActiveValue = row['状態'] || '活性';
            const isActive = isActiveValue === '活性' || isActiveValue === 'true' || isActiveValue === '1';

            const newUser: UserData = {
              id: `user${String(users.length + newUsers.length + 1).padStart(3, '0')}`,
              lastName: row['姓'].trim(),
              firstName: row['名'].trim(),
              userId: row['ユーザーID'].trim(),
              emailAdress: row['メールアドレス'].trim(),
              department: row['所属部署']?.trim() || '',
              twoFactorAuth: twoFactorAuth,
              role: role,
              lastLogin: row['最終ログイン'] || '-',
              isActive: isActive,
              avatarText: row['姓'].trim().charAt(0),
            };

            newUsers.push(newUser);
            existingUserIds.add(userId);
          });

          if (errors.length > 0) {
            Modal.error({
              title: 'CSVファイルにエラーがあります',
              content: (
                <div>
                  <p>以下のエラーを修正してください：</p>
                  <ul style={{ maxHeight: '300px', overflow: 'auto' }}>
                    {errors.slice(0, 10).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                    {errors.length > 10 && <li>...他 {errors.length - 10} 件のエラー</li>}
                  </ul>
                </div>
              ),
              width: 600,
            });

            if (newUsers.length > 0) {
              Modal.confirm({
                title: '一部のデータを追加しますか？',
                content: `${newUsers.length}件の有効なユーザーデータが見つかりました。これらを追加しますか？`,
                okText: '追加',
                cancelText: 'キャンセル',
                onOk: () => {
                  setUsers([...users, ...newUsers]);
                  message.success(`${newUsers.length}件のユーザーを追加しました`);
                },
              });
            }
            return;
          }

          if (newUsers.length > 0) {
            setUsers([...users, ...newUsers]);
            message.success(`${newUsers.length}件のユーザーを追加しました`);
          } else {
            message.warning('追加するユーザーデータがありませんでした');
          }
        } catch (error) {
          console.error('CSV処理エラー:', error);
          message.error('CSVファイルの処理中にエラーが発生しました');
        }
      },
      error: (error: Error) => {
        console.error('CSVパースエラー:', error);
        message.error('CSVファイルの読み込みに失敗しました');
      },
    });
  };

  const handleDownload = () => {
    const headers = [
      '姓',
      '名',
      'ユーザーID',
      'メールアドレス',
      '所属部署',
      '二段階認証設定',
      'ロール',
      '最終ログイン',
      '状態',
    ];

    const rows = filteredUsers.map((user) => [
      user.lastName,
      user.firstName,
      user.userId,
      user.emailAdress,
      user.department,
      user.twoFactorAuth,
      user.role,
      user.lastLogin,
      user.isActive ? '活性' : '非活性',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const bom = '\uFEFF';
    const csvWithBom = bom + csvContent;
    const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, -5);
    link.href = url;
    link.download = `users_${timestamp}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    message.success('CSVファイルをダウンロードしました');
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingUser) {
        setUsers(users.map(u => 
          u.id === editingUser.id 
            ? { 
                ...u, 
                ...values,
                avatarText: values.lastName.charAt(0),
              } 
            : u
        ));
        message.success('ユーザー情報を更新しました');
      } else {
        const newUser: UserData = {
          ...values,
          id: `user${String(users.length + 1).padStart(3, '0')}`,
          avatarText: values.lastName.charAt(0),
          lastLogin: '-',
        };
        setUsers([...users, newUser]);
        message.success('ユーザーを追加しました');
      }
      
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('バリデーションエラー:', error);
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
        <Button icon={<UploadOutlined />} onClick={handleUpload}>
          CSV<br />アップロード
        </Button>
        <Button icon={<DownloadOutlined />} onClick={handleDownload}>
          CSV<br />ダウンロード
        </Button>
        <Button icon={<PlusOutlined />} onClick={handleAdd}>
          追加
        </Button>
        <Button
          icon={<DeleteOutlined />}
          onClick={handleActivate}
          disabled={selectedRowKeys.length === 0}
          style={{
            minWidth: 85,
            backgroundColor: selectedRowKeys.length > 0 ? '#4CAF50' : undefined,
            borderColor: selectedRowKeys.length > 0 ? '#4CAF50' : undefined,
            color: selectedRowKeys.length > 0 ? '#fff' : undefined,
          }}
        >
          活性
        </Button>
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={handleDeactivate}
          disabled={selectedRowKeys.length === 0}
          style={{
            minWidth: 85,
            backgroundColor: selectedRowKeys.length > 0 ? '#FFA500' : undefined,
            borderColor: selectedRowKeys.length > 0 ? '#FFA500' : undefined,
            color: selectedRowKeys.length > 0 ? '#fff' : undefined,
          }}
        >
          非活性
        </Button>
        <Button icon={<ReloadOutlined />} onClick={handleReload}>
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
              placeholder="ユーザー名、ユーザーID、メールアドレスで検索"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col style={{ width: 150 }}>
            <Select
              placeholder="所属部署"
              value={selectedDepartment || undefined}
              onChange={(value) => setSelectedDepartment(value || '')}
              allowClear
              style={{ width: '100%' }}
              options={departments.map(dept => ({ label: dept, value: dept }))}
            />
          </Col>
          <Col style={{ width: 150 }}>
            <Select
              placeholder="二段階認証"
              value={selectedTwoFactorAuth || undefined}
              onChange={(value) => setSelectedTwoFactorAuth(value || '')}
              allowClear
              style={{ width: '100%' }}
              options={[
                { label: '済', value: '済' },
                { label: '未', value: '未' }
              ]}
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
            />
          </Col>
        </Row>

        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          size="small"
          scroll={{ x: 1400 }}
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
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="lastName"
                label="姓"
                rules={[{ required: true, message: '姓を入力してください' }]}
              >
                <Input placeholder="山田" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="firstName"
                label="名"
                rules={[{ required: true, message: '名を入力してください' }]}
              >
                <Input placeholder="太郎" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="userId"
            label="ユーザーID"
            rules={[
              { required: true, message: 'ユーザーIDを入力してください' },
              { type: 'email', message: '正しいメールアドレス形式を入力してください' }
            ]}
          >
            <Input placeholder="example@company.com" />
          </Form.Item>

          <Form.Item
            name="emailAdress"
            label="メールアドレス"
            rules={[
              { required: true, message: 'メールアドレスを入力してください' },
              { type: 'email', message: '正しいメールアドレスを入力してください' }
            ]}
          >
            <Input placeholder="example@company.com" />
          </Form.Item>

          <Form.Item
            name="department"
            label="所属部署"
            rules={[{ required: true, message: '所属部署を入力してください' }]}
          >
            <Input placeholder="A" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="twoFactorAuth"
                label="二段階認証"
                rules={[{ required: true }]}
              >
                <Select options={twoFactorAuthOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="role"
                label="ロール"
                rules={[{ required: true, message: 'ロールを選択してください' }]}
              >
                <Select options={roles} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="isActive"
            label="状態"
            valuePropName="checked"
          >
            <Select
              options={[
                { value: false, label: '活性' },
                { value: true, label: '非活性' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <style jsx global>{`
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
