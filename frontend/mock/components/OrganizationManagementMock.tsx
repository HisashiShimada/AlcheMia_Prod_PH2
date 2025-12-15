'use client';

import React, { useState, useMemo } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
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
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import Papa from 'papaparse';
import organizationsData from '../data/organizations-management.json';

const { Text, Link } = Typography;

/**
 * 組織データの型定義
 */
interface OrganizationData {
  id: string;
  organization_id: string;
  organization_name: string;
  display_name: string;
  email: string;
  company_code: string;
  certificate_url: string;
  updated_at: string;
  status: 'active' | 'inactive';
}

/**
 * 組織管理画面（モック）
 */
export default function OrganizationManagementMock() {
  const [organizations, setOrganizations] = useState<OrganizationData[]>(
    organizationsData as OrganizationData[]
  );
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrganizationData | null>(null);
  const [form] = Form.useForm();

  // 日時フォーマット関数
  const formatDateTime = (dateTimeStr: string): string => {
    if (!dateTimeStr || dateTimeStr === '-') return '-';
    // YYYYMMDDhhmmss 形式を yyyy/MM/dd hh:mm に変換
    const year = dateTimeStr.substring(0, 4);
    const month = dateTimeStr.substring(4, 6);
    const day = dateTimeStr.substring(6, 8);
    const hour = dateTimeStr.substring(8, 10);
    const minute = dateTimeStr.substring(10, 12);
    return `${year}/${month}/${day} ${hour}:${minute}`;
  };

  // フィルタリングされた組織
  const filteredOrganizations = useMemo(() => {
    return organizations.filter(org => {
      const searchLower = searchText.toLowerCase();
      return (
        org.organization_id.toLowerCase().includes(searchLower) ||
        org.organization_name.toLowerCase().includes(searchLower) ||
        org.display_name.toLowerCase().includes(searchLower) ||
        org.email.toLowerCase().includes(searchLower) ||
        org.company_code.toLowerCase().includes(searchLower) ||
        formatDateTime(org.updated_at).toLowerCase().includes(searchLower)
      );
    });
  }, [organizations, searchText]);

  // テーブルの行選択
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  // テーブルカラム定義
  const columns: ColumnsType<OrganizationData> = [
    {
      title: (
        <Space size="middle" align="center">
          <span>組織名</span>
          <Badge
            count={filteredOrganizations.filter(org => org.status === 'active').length}
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
      key: 'organization',
      width: 180,
      sorter: (a, b) => a.organization_name.localeCompare(b.organization_name),
      render: (_, record) => (
        <Text style={{ 
          fontWeight: 500, 
          color: record.status === 'inactive' ? 'rgba(0, 0, 0, 0.45)' : '#0093CF'
        }}>
          {record.organization_name}
        </Text>
      ),
    },
    {
      title: '組織ID',
      dataIndex: 'organization_id',
      key: 'organization_id',
      width: 120,
      sorter: (a, b) => a.organization_id.localeCompare(b.organization_id),
      render: (text: string, record) => (
        <Text style={{ 
          fontSize: 13,
          color: record.status === 'inactive' ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.85)'
        }}>
          {text}
        </Text>
      ),
    },
    {
      title: '組織表示名',
      dataIndex: 'display_name',
      key: 'display_name',
      width: 150,
      sorter: (a, b) => a.display_name.localeCompare(b.display_name),
      render: (text: string, record) => (
        <Text style={{ 
          fontSize: 13,
          color: record.status === 'inactive' ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.85)'
        }}>
          {text}
        </Text>
      ),
    },
    {
      title: '組織e-mail',
      dataIndex: 'email',
      key: 'email',
      width: 250,
      sorter: (a, b) => a.email.localeCompare(b.email),
      render: (text: string, record) => (
        <Text style={{ 
          fontSize: 13,
          color: record.status === 'inactive' ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.85)'
        }}>
          {text}
        </Text>
      ),
    },
    {
      title: '会社CD',
      dataIndex: 'company_code',
      key: 'company_code',
      width: 100,
      align: 'center',
      sorter: (a, b) => a.company_code.localeCompare(b.company_code),
    },
    {
      title: '証明書DL',
      key: 'certificate',
      width: 120,
      align: 'center',
      sorter: (a, b) => a.certificate_url.localeCompare(b.certificate_url),
      render: (_, record) => (
        <Link
          onClick={() => handleDownloadCertificate(record)}
          style={{ color: '#0093CF', textDecoration: 'underline' }}
        >
          ダウンロード
        </Link>
      ),
    },
    {
      title: '更新日時',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 160,
      sorter: (a, b) => a.updated_at.localeCompare(b.updated_at),
      render: (text: string) => formatDateTime(text),
    },
    {
      title: '',
      key: 'action',
      width: 200,
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
            danger={record.status === 'active'}
          >
            {record.status === 'inactive' ? '活性' : '非活性'}
          </Button>
        </Space>
      ),
    },
  ];

  // 証明書ダウンロード
  const handleDownloadCertificate = (org: OrganizationData) => {
    // 証明書の内容を生成（モック）
    const certificateContent = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKL3VqQqJz7SMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkpQMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMjQwMTAxMDAwMDAwWhcNMjUwMTAxMDAwMDAwWjBF
MQswCQYDVQQGEwJKUDETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEAw8VqEQKjhpXdxQqZaJLhIVGqDvKTNVqZEzxVxNW8xqTDQqZaJLhIVGq
Organization: ${org.organization_name}
Organization ID: ${org.organization_id}
Email: ${org.email}
Company Code: ${org.company_code}
-----END CERTIFICATE-----`;

    // Blobを作成してダウンロード
    const blob = new Blob([certificateContent], { type: 'application/x-x509-ca-cert' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // ファイル名を設定（組織IDを使用）
    link.href = url;
    link.download = `${org.organization_id}_certificate.crt`;
    
    // ダウンロード実行
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    message.success(`${org.organization_name}の証明書をダウンロードしました`);
  };

  // 組織追加
  const handleAdd = () => {
    setEditingOrg(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'active',
    });
    setIsModalVisible(true);
  };

  // 組織編集
  const handleEdit = (org: OrganizationData) => {
    setEditingOrg(org);
    form.setFieldsValue(org);
    setIsModalVisible(true);
  };

  // 活性化
  const handleActivate = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('活性にする組織を選択してください');
      return;
    }
    Modal.confirm({
      title: '選択した組織を活性にしますか？',
      content: `${selectedRowKeys.length}件の組織が活性になります。`,
      okText: '活性',
      cancelText: 'キャンセル',
      onOk: () => {
        setOrganizations(organizations.map(o => 
          selectedRowKeys.includes(o.id) ? { ...o, status: 'active' } : o
        ));
        setSelectedRowKeys([]);
        message.success(`${selectedRowKeys.length}件の組織を活性にしました`);
      },
    });
  };

  // 非活性化
  const handleDeactivate = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('非活性にする組織を選択してください');
      return;
    }
    Modal.confirm({
      title: '選択した組織を非活性にしますか？',
      content: `${selectedRowKeys.length}件の組織が非活性になります。`,
      okText: '非活性',
      cancelText: 'キャンセル',
      okButtonProps: { danger: true },
      onOk: () => {
        setOrganizations(organizations.map(o => 
          selectedRowKeys.includes(o.id) ? { ...o, status: 'inactive' } : o
        ));
        setSelectedRowKeys([]);
        message.success(`${selectedRowKeys.length}件の組織を非活性にしました`);
      },
    });
  };

  // 活性/非活性切り替え
  const handleToggleActive = (id: string) => {
    const org = organizations.find(o => o.id === id);
    if (!org) return;

    const actionText = org.status === 'inactive' ? '活性' : '非活性';
    const orgName = org.organization_name;

    Modal.confirm({
      title: `${orgName}を${actionText}にしますか？`,
      content: `この組織を${actionText}状態に変更します。`,
      okText: actionText,
      cancelText: 'キャンセル',
      okButtonProps: org.status === 'inactive' ? undefined : { danger: true },
      onOk: () => {
        setOrganizations(organizations.map(o => 
          o.id === id ? { ...o, status: o.status === 'active' ? 'inactive' : 'active' } : o
        ));
        message.success(`${orgName}を${actionText}にしました`);
      },
    });
  };

  // リロード
  const handleReload = () => {
    setOrganizations(organizationsData as OrganizationData[]);
    setSearchText('');
    setSelectedRowKeys([]);
    message.success('データをリロードしました');
  };

  // CSVアップロード処理
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

  // CSVファイルをパースして一覧に反映
  const handleCSVUpload = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      encoding: 'UTF-8',
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<Record<string, string>>) => {
        try {
          const newOrgs: OrganizationData[] = [];
          const errors: string[] = [];
          const existingIds = new Set(organizations.map(o => o.organization_id.toLowerCase()));

          results.data.forEach((row: Record<string, string>, index: number) => {
            const rowNumber = index + 2;

            if (!row['組織ID'] || !row['組織名'] || !row['組織e-mail']) {
              errors.push(`${rowNumber}行目: 組織ID、組織名、組織e-mailは必須です`);
              return;
            }

            const orgId = row['組織ID'].trim().toLowerCase();
            if (existingIds.has(orgId)) {
              errors.push(`${rowNumber}行目: 組織ID「${row['組織ID']}」は既に登録されています`);
              return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(row['組織e-mail'])) {
              errors.push(`${rowNumber}行目: 組織e-mailの形式が不正です`);
              return;
            }

            const statusValue = row['状態'] || '活性';
            const status: 'active' | 'inactive' = 
              (statusValue === '活性' || statusValue === 'active') ? 'active' : 'inactive';

            const newOrg: OrganizationData = {
              id: row['組織ID'].trim(),
              organization_id: row['組織ID'].trim(),
              organization_name: row['組織名'].trim(),
              display_name: row['組織表示名']?.trim() || row['組織名'].trim(),
              email: row['組織e-mail'].trim(),
              company_code: row['会社CD']?.trim() || '',
              certificate_url: `/api/certificates/${row['組織ID'].trim()}`,
              updated_at: new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14),
              status: status,
            };

            newOrgs.push(newOrg);
            existingIds.add(orgId);
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

            if (newOrgs.length > 0) {
              Modal.confirm({
                title: '一部のデータを追加しますか？',
                content: `${newOrgs.length}件の有効な組織データが見つかりました。これらを追加しますか？`,
                okText: '追加',
                cancelText: 'キャンセル',
                onOk: () => {
                  setOrganizations([...organizations, ...newOrgs]);
                  message.success(`${newOrgs.length}件の組織を追加しました`);
                },
              });
            }
            return;
          }

          if (newOrgs.length > 0) {
            setOrganizations([...organizations, ...newOrgs]);
            message.success(`${newOrgs.length}件の組織を追加しました`);
          } else {
            message.warning('追加する組織データがありませんでした');
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

  // CSVダウンロード
  const handleDownload = () => {
    const headers = [
      '組織ID',
      '組織名',
      '組織表示名',
      '組織e-mail',
      '会社CD',
      '更新日時',
      '状態',
    ];

    const rows = filteredOrganizations.map((org) => [
      org.organization_id,
      org.organization_name,
      org.display_name,
      org.email,
      org.company_code,
      formatDateTime(org.updated_at),
      org.status === 'active' ? '活性' : '非活性',
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
    link.download = `organizations_${timestamp}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    message.success('CSVファイルをダウンロードしました');
  };

  // モーダルOK
  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingOrg) {
        setOrganizations(organizations.map(o => 
          o.id === editingOrg.id 
            ? { 
                ...o, 
                ...values,
                updated_at: new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14),
              } 
            : o
        ));
        message.success('組織情報を更新しました');
      } else {
        const newOrg: OrganizationData = {
          ...values,
          id: values.organization_id,
          certificate_url: `/api/certificates/${values.organization_id}`,
          updated_at: new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14),
        };
        setOrganizations([...organizations, newOrg]);
        message.success('組織を追加しました');
      }
      
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('バリデーションエラー:', error);
    }
  };

  // モーダルキャンセル
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
          padding: 24,
          backgroundColor: '#fff',
          border: 'none',
        }}
      >
        <Row gutter={16} style={{ marginBottom: 8 }}>
          <Col style={{ width: 400 }}>
            <Input
              placeholder="組織ID、組織名、組織表示名、組織e-mail、会社CD、更新日時で検索"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
        </Row>

        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredOrganizations}
          rowKey="id"
          size="small"
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `全 ${total} 件`,
          }}
          rowClassName={(record) => (record.status === 'inactive' ? 'active-row' : 'inactive-row')}
        />
      </div>

      <Modal
        title={editingOrg ? '組織編集' : '組織追加'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        okText="保存"
        cancelText="キャンセル"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="organization_id"
            label="組織ID"
            rules={[{ required: true, message: '組織IDを入力してください' }]}
          >
            <Input placeholder="A182" disabled={!!editingOrg} />
          </Form.Item>

          <Form.Item
            name="organization_name"
            label="組織名"
            rules={[{ required: true, message: '組織名を入力してください' }]}
          >
            <Input placeholder="Alpha研究所" />
          </Form.Item>

          <Form.Item
            name="display_name"
            label="組織表示名"
            rules={[{ required: true, message: '組織表示名を入力してください' }]}
          >
            <Input placeholder="αβγ" />
          </Form.Item>

          <Form.Item
            name="email"
            label="組織e-mail"
            rules={[
              { required: true, message: '組織e-mailを入力してください' },
              { type: 'email', message: '正しいメールアドレスを入力してください' }
            ]}
          >
            <Input placeholder="alpha@aist.go.jp" />
          </Form.Item>

          <Form.Item
            name="company_code"
            label="会社CD"
            rules={[{ required: true, message: '会社CDを入力してください' }]}
          >
            <Input placeholder="K001" />
          </Form.Item>

          <Form.Item
            name="status"
            label="状態"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: 'active', label: '活性' },
                { value: 'inactive', label: '非活性' },
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
