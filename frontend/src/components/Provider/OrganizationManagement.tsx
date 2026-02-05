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
import Papa from 'papaparse';
import organizationsData from '../../../mock/data/organizations-management.json';

const { Text } = Typography;

/**
 * 組織データの型定義
 */
interface OrganizationData {
  id: string;
  organization_id: string;
  organization_name: string;
  display_name: string;
  email: string;
  representative_admin: string;
  company_code: string;
  company_name: string;
  certificate_url: string;
  updated_at: string;
  status: 'active' | 'inactive';
}

/**
 * 組織管理画面コンポーネント
 */
export default function OrganizationManagement() {
  const { modal } = App.useApp();
  const [organizations, setOrganizations] = useState<OrganizationData[]>(
    organizationsData as OrganizationData[]
  );
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrganizationData | null>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('');
  const [selectedCompanyCode, setSelectedCompanyCode] = useState<string>('');
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

  // 組織IDの選択肢を動的に取得
  const organizationIds = useMemo(() => {
    const uniqueIds = Array.from(new Set(organizations.map(o => o.organization_id).filter(id => id)));
    return uniqueIds.sort();
  }, [organizations]);

  // 会社CDの選択肢を動的に取得
  const companyCodes = useMemo(() => {
    const uniqueCodes = Array.from(new Set(organizations.map(o => o.company_code).filter(code => code)));
    return uniqueCodes.sort();
  }, [organizations]);

  // フィルタリングされた組織
  const filteredOrganizations = useMemo(() => {
    return organizations.filter(org => {
      // テキスト検索フィルター
      const searchLower = searchText.toLowerCase();
      const matchesSearch = !searchText.trim() || (
        org.organization_id.toLowerCase().includes(searchLower) ||
        org.organization_name.toLowerCase().includes(searchLower) ||
        org.display_name.toLowerCase().includes(searchLower) ||
        org.email.toLowerCase().includes(searchLower) ||
        org.representative_admin.toLowerCase().includes(searchLower) ||
        org.company_code.toLowerCase().includes(searchLower) ||
        org.company_name.toLowerCase().includes(searchLower) ||
        formatDateTime(org.updated_at).toLowerCase().includes(searchLower)
      );

      // 組織IDフィルター
      const matchesOrganizationId = !selectedOrganizationId || org.organization_id === selectedOrganizationId;

      // 会社CDフィルター
      const matchesCompanyCode = !selectedCompanyCode || org.company_code === selectedCompanyCode;

      return matchesSearch && matchesOrganizationId && matchesCompanyCode;
    });
  }, [organizations, searchText, selectedOrganizationId, selectedCompanyCode]);

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
        <div style={{ textAlign: 'center' }}>
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
        </div>
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
      title: <div style={{ textAlign: 'center' }}>組織表示名</div>,
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
      title: <div style={{ textAlign: 'center' }}>組織e-mail</div>,
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
      title: <div style={{ textAlign: 'center' }}>代表システム管理者</div>,
      dataIndex: 'representative_admin',
      key: 'representative_admin',
      width: 150,
      sorter: (a, b) => a.representative_admin.localeCompare(b.representative_admin),
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
      title: <div style={{ textAlign: 'center' }}>会社名</div>,
      dataIndex: 'company_name',
      key: 'company_name',
      width: 250,
      align: 'left',
      sorter: (a, b) => a.company_name.localeCompare(b.company_name),
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
      title: <div style={{ textAlign: 'center' }}>更新日時</div>,
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 160,
      align: 'right',
      sorter: (a, b) => a.updated_at.localeCompare(b.updated_at),
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
            disabled={record.status === 'inactive'}
          >
            証明書DL
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            編集
          </Button>
          <Button
            size="small"
            onClick={() => handleToggleActive(record.id)}
            danger={record.status === 'active'}
            style={{ width: '100px' }}
          >
            {record.status === 'inactive' ? 'アクティブ' : '非アクティブ'}
          </Button>
        </Space>
      ),
    },
  ];

  // 証明書ダウンロード
  const handleDownloadCertificate = async (org: OrganizationData) => {
    try {
      // publicフォルダの証明書ファイルにアクセス（Next.jsは/publicを/でアクセス可能）
      const certPath = '/certs/rootCA.crt';
      
      // fetchでファイルを取得
      const response = await fetch(certPath);
      if (!response.ok) {
        throw new Error('証明書ファイルの取得に失敗しました');
      }
      
      const blob = await response.blob();
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
    } catch (error) {
      console.error('証明書ダウンロードエラー:', error);
      message.error('証明書のダウンロードに失敗しました');
    }
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

  // アクティブ化
  const handleActivate = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('アクティブにする組織を選択してください');
      return;
    }
    modal.confirm({
      title: '選択した組織をアクティブにしますか？',
      content: `${selectedRowKeys.length}件の組織がアクティブになります。`,
      okText: 'アクティブ化',
      cancelText: 'キャンセル',
      onOk: () => {
        setOrganizations(organizations.map(o => 
          selectedRowKeys.includes(o.id) ? { ...o, status: 'active' } : o
        ));
        setSelectedRowKeys([]);
        message.success(`${selectedRowKeys.length}件の組織をアクティブにしました`);
      },
    });
  };

  // 非アクティブ化
  const handleDeactivate = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('非アクティブにする組織を選択してください');
      return;
    }
    modal.confirm({
      title: '選択した組織を非アクティブにしますか？',
      content: `${selectedRowKeys.length}件の組織が非アクティブになります。`,
      okText: '非アクティブ化',
      cancelText: 'キャンセル',
      okButtonProps: { danger: true },
      onOk: () => {
        setOrganizations(organizations.map(o => 
          selectedRowKeys.includes(o.id) ? { ...o, status: 'inactive' } : o
        ));
        setSelectedRowKeys([]);
        message.success(`${selectedRowKeys.length}件の組織を非アクティブにしました`);
      },
    });
  };

  // アクティブ/非アクティブ切り替え
  const handleToggleActive = (id: string) => {
    const org = organizations.find(o => o.id === id);
    if (!org) return;

    const actionText = org.status === 'inactive' ? 'アクティブ' : '非アクティブ';
    const orgName = org.organization_name;

    modal.confirm({
      title: `${orgName}を${actionText}にしますか？`,
      content: `この組織を${org.status === 'inactive' ? 'アクティブ' : '非アクティブ'}状態に変更します。`,
      okText: actionText,
      cancelText: 'キャンセル',
      okButtonProps: org.status === 'inactive' ? undefined : { danger: true },
      onOk: () => {
        setOrganizations(organizations.map(o => 
          o.id === id ? { ...o, status: o.status === 'active' ? 'inactive' : 'active' } : o
        ));
        message.success(`${orgName}を${org.status === 'inactive' ? 'アクティブ' : '非アクティブ'}にしました`);
      },
    });
  };

  // リロード
  const handleReload = () => {
    setOrganizations(organizationsData as OrganizationData[]);
    setSearchText('');
    setSelectedRowKeys([]);
    setSelectedOrganizationId('');
    setSelectedCompanyCode('');
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

            const statusValue = row['状態'] || 'アクティブ';
            const status: 'active' | 'inactive' = 
              (statusValue === 'アクティブ' || statusValue === 'active') ? 'active' : 'inactive';

            const newOrg: OrganizationData = {
              id: row['組織ID'].trim(),
              organization_id: row['組織ID'].trim(),
              organization_name: row['組織名'].trim(),
              display_name: row['組織表示名']?.trim() || row['組織名'].trim(),
              email: row['組織e-mail'].trim(),
              representative_admin: row['代表システム管理者']?.trim() || '',
              company_code: row['会社CD']?.trim() || '',
              company_name: row['会社名']?.trim() || '',
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
      '代表システム管理者',
      '会社名',
      '更新日時',
      '状態',
    ];

    const rows = filteredOrganizations.map((org) => [
      org.organization_id,
      org.organization_name,
      org.display_name,
      org.email,
      org.representative_admin,
      org.company_name,
      formatDateTime(org.updated_at),
      org.status === 'active' ? 'アクティブ' : '非アクティブ',
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
    <div style={{ padding: '0 15px' }}>
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
          アクティブ
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
          非アクティブ
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
              placeholder="組織ID、組織名、組織表示名、組織e-mail、代表システム管理者、会社ID、更新日時で検索"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col style={{ width: 150 }}>
            <Select
              placeholder="組織ID"
              value={selectedOrganizationId || undefined}
              onChange={(value) => setSelectedOrganizationId(value || '')}
              allowClear
              style={{ width: '100%' }}
              options={organizationIds.map(id => ({ label: id, value: id }))}
            />
          </Col>
          <Col style={{ width: 150 }}>
            <Select
              placeholder="会社ID"
              value={selectedCompanyCode || undefined}
              onChange={(value) => setSelectedCompanyCode(value || '')}
              allowClear
              style={{ width: '100%' }}
              options={companyCodes.map(code => ({ label: code, value: code }))}
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
            name="representative_admin"
            label="代表システム管理者"
            rules={[{ required: true, message: '代表システム管理者を入力してください' }]}
          >
            <Input placeholder="山田 太郎" />
          </Form.Item>

          <Form.Item
            name="company_code"
            label="会社ID"
            rules={[{ required: true, message: '会社IDを入力してください' }]}
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
                { value: 'active', label: 'アクティブ' },
                { value: 'inactive', label: '非アクティブ' },
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
